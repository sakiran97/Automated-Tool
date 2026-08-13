from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import List

from app.database import get_db
from app.models import Target, Scan, Finding, Notification, AdminUser
from app.auth import get_current_user
from app.schemas import DashboardStats, SeverityCount, DashboardTrends, TrendPoint

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_stats(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Target counts
    total_targets = (await db.execute(select(func.count()).select_from(Target))).scalar()
    active_targets = (await db.execute(select(func.count()).select_from(Target).where(Target.is_active == True))).scalar()
    auto_targets = (await db.execute(select(func.count()).select_from(Target).where(Target.scan_mode == "auto"))).scalar()
    manual_targets = (await db.execute(select(func.count()).select_from(Target).where(Target.scan_mode == "manual"))).scalar()

    # Finding counts
    total_findings = (await db.execute(select(func.count()).select_from(Finding))).scalar()
    new_findings = (await db.execute(select(func.count()).select_from(Finding).where(Finding.status == "new"))).scalar()

    # Severity breakdown
    severity_data = {}
    for sev in ["critical", "high", "medium", "low", "info"]:
        count = (await db.execute(
            select(func.count()).select_from(Finding).where(Finding.severity == sev)
        )).scalar()
        severity_data[sev] = count

    # Scan counts
    total_scans = (await db.execute(select(func.count()).select_from(Scan))).scalar()
    active_scans = (await db.execute(
        select(func.count()).select_from(Scan).where(Scan.status == "running")
    )).scalar()
    successful_scans = (await db.execute(
        select(func.count()).select_from(Scan).where(Scan.status == "completed")
    )).scalar()

    # Notifications
    unread_notifications = (await db.execute(
        select(func.count()).select_from(Notification).where(Notification.is_read == False)
    )).scalar()

    # Last scan time
    last_scan_result = await db.execute(
        select(Scan.completed_at).where(Scan.status == "completed").order_by(Scan.completed_at.desc()).limit(1)
    )
    last_scan_at = last_scan_result.scalar_one_or_none()

    return DashboardStats(
        total_targets=total_targets or 0,
        active_targets=active_targets or 0,
        auto_targets=auto_targets or 0,
        manual_targets=manual_targets or 0,
        total_findings=total_findings or 0,
        new_findings=new_findings or 0,
        severity_counts=SeverityCount(**severity_data),
        total_scans=total_scans or 0,
        active_scans=active_scans or 0,
        successful_scans=successful_scans or 0,
        unread_notifications=unread_notifications or 0,
        last_scan_at=last_scan_at,
    )


@router.get("/trends", response_model=DashboardTrends)
async def get_trends(
    days: int = 14,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return finding counts per day for the last N days."""
    trends = []
    now = datetime.utcnow()

    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        date_str = day_start.strftime("%Y-%m-%d")

        point = TrendPoint(date=date_str, critical=0, high=0, medium=0, low=0, info=0, total=0)
        for sev in ["critical", "high", "medium", "low", "info"]:
            count = (await db.execute(
                select(func.count()).select_from(Finding).where(
                    Finding.first_seen >= day_start,
                    Finding.first_seen < day_end,
                    Finding.severity == sev,
                )
            )).scalar() or 0
            setattr(point, sev, count)
            point.total += count

        trends.append(point)

    return DashboardTrends(trends=trends)


@router.get("/recent-findings")
async def get_recent_findings(
    limit: int = 10,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Recent findings for dashboard feed."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Finding)
        .options(selectinload(Finding.target))
        .where(Finding.severity.in_(["critical", "high"]))
        .order_by(Finding.id.desc(), Finding.first_seen.desc())
        .limit(limit)
    )
    findings = result.scalars().all()
    return [
        {
            "id": f.id,
            "title": f.title,
            "severity": f.severity,
            "category": f.category,
            "target_name": f.target.name if f.target else "Unknown",
            "affected_url": f.affected_url,
            "first_seen": f.first_seen.isoformat(),
            "status": f.status,
        }
        for f in findings
    ]
