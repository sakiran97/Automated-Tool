"""
Scanner Orchestrator — coordinates all scan modules against a target
and persists findings with deduplication.
"""
import asyncio
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models import Target, Scan, Finding
from app.triage.rule_engine import score_finding, generate_fingerprint, generate_reproduction_steps, SEVERITY_RULES
from app.notifications import notify_new_finding, notify_scan_completed, notify_scan_failed
from app.websocket_manager import ws_manager

import logging

logger = logging.getLogger(__name__)


async def run_scan(target: Target, db: AsyncSession) -> Scan:
    """Run a full security scan against a target. Returns the completed Scan record."""
    # Create scan record
    scan = Scan(
        target_id=target.id,
        status="running",
        scan_type="full",
        started_at=datetime.utcnow(),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Broadcast scan started
    await ws_manager.broadcast("scan_started", {
        "scan_id": scan.id,
        "target_id": target.id,
        "target_name": target.name,
        "target_url": target.url,
    })

    all_raw_findings: List[Dict[str, Any]] = []

    try:
        # Import modules here to avoid circular imports
        from app.scanner.ssl_analyzer import analyze_ssl
        from app.scanner.header_checker import check_headers
        from app.scanner.tech_fingerprint import fingerprint_tech
        from app.scanner.port_scanner import scan_ports
        from app.scanner.dir_enumerator import enumerate_dirs
        from app.scanner.dns_checker import check_dns
        from app.scanner.diff_tracker import track_diff

        logger.info(f"[SCAN] Starting scan #{scan.id} for {target.url}")

        # Parse target custom headers (e.g. X-HackerOne-Research)
        custom_headers = {}
        if target.custom_headers:
            try:
                import json
                custom_headers = json.loads(target.custom_headers)
            except Exception:
                for line in target.custom_headers.splitlines():
                    if ":" in line:
                        k, v = line.split(":", 1)
                        custom_headers[k.strip()] = v.strip()

        # Run scan modules concurrently (except diff_tracker which needs DB)
        ssl_task = asyncio.to_thread(analyze_ssl, target.url)
        header_task = check_headers(target.url, custom_headers)
        tech_task = fingerprint_tech(target.url, custom_headers)
        port_task = scan_ports(target.url)
        dir_task = enumerate_dirs(target.url, custom_headers)
        dns_task = check_dns(target.url)
        diff_task = track_diff(target.url, target.id, db, custom_headers)

        results = await asyncio.gather(
            ssl_task, header_task, tech_task, port_task, dir_task, dns_task, diff_task,
            return_exceptions=True,
        )

        for module_result in results:
            if isinstance(module_result, Exception):
                logger.warning(f"[SCAN] Module error: {module_result}")
                continue
            if isinstance(module_result, list):
                all_raw_findings.extend(module_result)

        # Process and persist findings
        new_findings_count = 0
        total_findings_count = 0

        for raw in all_raw_findings:
            rule_key = raw.get("rule_key", "unknown")
            affected_url = raw.get("affected_url", target.url)
            extra_context = raw.get("extra_context", {})
            evidence = raw.get("evidence", "")

            # Score finding
            scored = score_finding(rule_key, extra_context)

            # Generate dedup fingerprint
            fingerprint = generate_fingerprint(target.id, rule_key, affected_url)

            # Check for existing finding (dedup)
            existing_result = await db.execute(
                select(Finding).where(Finding.fingerprint == fingerprint)
            )
            existing_finding = existing_result.scalar_one_or_none()

            if existing_finding:
                # Update last_seen
                existing_finding.last_seen = datetime.utcnow()
                await db.commit()
                total_findings_count += 1
            else:
                # New finding
                finding = Finding(
                    scan_id=scan.id,
                    target_id=target.id,
                    title=scored.get("title", rule_key.replace("_", " ").title()),
                    description=scored.get("description", ""),
                    severity=scored.get("severity", "info"),
                    category=scored.get("category", "misc"),
                    evidence=evidence,
                    reproduction_steps=generate_reproduction_steps(rule_key, affected_url),
                    remediation=scored.get("remediation", ""),
                    cvss_score=scored.get("cvss"),
                    affected_url=affected_url,
                    status="new",
                    confidence=scored.get("confidence", "high"),
                    fingerprint=fingerprint,
                    first_seen=datetime.utcnow(),
                    last_seen=datetime.utcnow(),
                )
                db.add(finding)
                await db.commit()
                await db.refresh(finding)

                new_findings_count += 1
                total_findings_count += 1

                # Notify for critical and high findings
                if finding.severity in ("critical", "high"):
                    await notify_new_finding(db, finding, target.name)

                # Broadcast new finding to dashboard
                await ws_manager.broadcast("new_finding", {
                    "finding_id": finding.id,
                    "title": finding.title,
                    "severity": finding.severity,
                    "category": finding.category,
                    "target_name": target.name,
                    "target_id": target.id,
                })

        # Update scan record
        scan.status = "completed"
        scan.completed_at = datetime.utcnow()
        scan.findings_count = total_findings_count
        scan.new_findings_count = new_findings_count

        # Update target last_scanned_at
        target.last_scanned_at = datetime.utcnow()

        await db.commit()

        # Notify scan complete
        await notify_scan_completed(db, scan.id, target.name, new_findings_count, total_findings_count)

        # Broadcast scan completed
        await ws_manager.broadcast("scan_completed", {
            "scan_id": scan.id,
            "target_id": target.id,
            "target_name": target.name,
            "findings_count": total_findings_count,
            "new_findings_count": new_findings_count,
            "status": "completed",
        })

        logger.info(f"[SCAN] Scan #{scan.id} completed: {new_findings_count} new, {total_findings_count} total findings")

    except Exception as e:
        logger.error(f"[SCAN] Scan #{scan.id} failed: {e}", exc_info=True)
        scan.status = "failed"
        scan.error_message = str(e)
        scan.completed_at = datetime.utcnow()
        await db.commit()
        await notify_scan_failed(db, scan.id, target.name, str(e))

    return scan
