from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification
from app.websocket_manager import ws_manager


async def create_notification(
    db: AsyncSession,
    title: str,
    message: str,
    notif_type: str = "alert",
    severity: str = None,
    related_id: int = None,
    related_type: str = None,
    broadcast: bool = True,
) -> Notification:
    """Create a notification in DB and optionally broadcast via WebSocket."""
    notif = Notification(
        title=title,
        message=message,
        type=notif_type,
        severity=severity,
        is_read=False,
        related_id=related_id,
        related_type=related_type,
        created_at=datetime.utcnow(),
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    if broadcast:
        await ws_manager.broadcast("notification", {
            "id": notif.id,
            "title": notif.title,
            "message": notif.message,
            "type": notif.type,
            "severity": notif.severity,
            "created_at": notif.created_at.isoformat(),
        })

    return notif


async def notify_new_finding(db: AsyncSession, finding, target_name: str):
    severity_emoji = {
        "critical": "🔴",
        "high": "🟠",
        "medium": "🟡",
        "low": "🔵",
        "info": "⚪",
    }
    emoji = severity_emoji.get(finding.severity, "⚪")
    await create_notification(
        db=db,
        title=f"{emoji} New {finding.severity.upper()} Finding",
        message=f"{finding.title} — {target_name}",
        notif_type="finding",
        severity=finding.severity,
        related_id=finding.id,
        related_type="finding",
    )


async def notify_scan_started(db: AsyncSession, scan_id: int, target_name: str):
    await create_notification(
        db=db,
        title="🔍 Scan Started",
        message=f"Security scan initiated for {target_name}",
        notif_type="scan",
        related_id=scan_id,
        related_type="scan",
    )


async def notify_scan_completed(db: AsyncSession, scan_id: int, target_name: str, new_findings: int, total: int):
    await create_notification(
        db=db,
        title="✅ Scan Completed",
        message=f"{target_name}: {new_findings} new findings, {total} total vulnerabilities detected",
        notif_type="scan",
        related_id=scan_id,
        related_type="scan",
    )


async def notify_report_generated(db: AsyncSession, report_id: int, target_name: str, findings_count: int):
    await create_notification(
        db=db,
        title="📄 Report Generated",
        message=f"Bug bounty report for {target_name} is ready ({findings_count} vulnerabilities documented)",
        notif_type="report",
        related_id=report_id,
        related_type="report",
    )


async def notify_scan_failed(db: AsyncSession, scan_id: int, target_name: str, error: str):
    await create_notification(
        db=db,
        title="❌ Scan Failed",
        message=f"Scan for {target_name} encountered an error: {error[:100]}",
        notif_type="alert",
        severity="high",
        related_id=scan_id,
        related_type="scan",
    )
