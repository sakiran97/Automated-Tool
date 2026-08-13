"""Response diff tracker — detect changes between scans."""
import hashlib
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import DiffSnapshot
from app.config import settings


def _hash_content(content: str | bytes) -> str:
    if isinstance(content, str):
        content = content.encode("utf-8", errors="replace")
    return hashlib.sha256(content).hexdigest()


async def track_diff(url: str, target_id: int, db: AsyncSession, custom_headers: dict = None) -> List[Dict[str, Any]]:
    """
    Fetch the URL, compare with stored snapshot.
    Returns findings if changes detected.
    """
    results = []
    req_headers = {"User-Agent": "Mozilla/5.0 (compatible; SecurityScanner/1.0)"}
    if custom_headers:
        req_headers.update(custom_headers)

    try:
        async with httpx.AsyncClient(
            timeout=settings.SCAN_TIMEOUT_SECONDS,
            follow_redirects=True,
            verify=False,
            headers=req_headers,
        ) as client:
            response = await client.get(url)
            body_hash = _hash_content(response.content)
            headers_str = str(dict(response.headers))
            headers_hash = _hash_content(headers_str)
            status_code = response.status_code
            response_size = len(response.content)

    except Exception:
        return results

    # Look up previous snapshot
    result = await db.execute(
        select(DiffSnapshot)
        .where(DiffSnapshot.target_id == target_id, DiffSnapshot.url_path == url)
        .order_by(DiffSnapshot.captured_at.desc())
        .limit(1)
    )
    existing: Optional[DiffSnapshot] = result.scalar_one_or_none()

    if existing:
        # Compare hashes
        if existing.response_hash != body_hash:
            results.append({
                "rule_key": "response_changed",
                "affected_url": url,
                "evidence": (
                    f"Response body changed since last scan.\n"
                    f"Previous hash: {existing.response_hash[:12]}...\n"
                    f"Current hash: {body_hash[:12]}...\n"
                    f"Previous size: {existing.response_size or 'unknown'} bytes\n"
                    f"Current size: {response_size} bytes\n"
                    f"Last captured: {existing.captured_at.isoformat()}"
                ),
                "extra_context": {},
            })

        if existing.headers_hash and existing.headers_hash != headers_hash:
            results.append({
                "rule_key": "response_changed",
                "affected_url": url,
                "evidence": (
                    f"Response headers changed since last scan.\n"
                    f"Previous headers hash: {existing.headers_hash[:12]}...\n"
                    f"Current headers hash: {headers_hash[:12]}...\n"
                    f"Last captured: {existing.captured_at.isoformat()}"
                ),
                "extra_context": {},
            })

        # Update snapshot
        existing.response_hash = body_hash
        existing.headers_hash = headers_hash
        existing.status_code = status_code
        existing.response_size = response_size
        existing.captured_at = datetime.utcnow()
    else:
        # First time seeing this URL — store snapshot, no finding
        snapshot = DiffSnapshot(
            target_id=target_id,
            url_path=url,
            response_hash=body_hash,
            headers_hash=headers_hash,
            status_code=status_code,
            response_size=response_size,
            captured_at=datetime.utcnow(),
        )
        db.add(snapshot)

    await db.commit()
    return results
