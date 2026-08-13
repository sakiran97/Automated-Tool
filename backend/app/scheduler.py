"""APScheduler-based background job scheduler for periodic scans."""
import asyncio
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Target

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler(timezone="UTC")


async def _run_scheduled_scan(target_id: int):
    """Scheduled job: fetch target from DB and run scan."""
    from app.scanner.orchestrator import run_scan
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Target).where(Target.id == target_id, Target.is_active == True))
        target = result.scalar_one_or_none()
        if target and target.scan_mode == "auto":
            logger.info(f"[SCHEDULER] Running scheduled scan for target #{target_id}: {target.url}")
            await run_scan(target, db)


def add_target_job(target_id: int, interval_minutes: int):
    """Register a periodic scan job for a target."""
    job_id = f"scan_target_{target_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    scheduler.add_job(
        _run_scheduled_scan,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id=job_id,
        args=[target_id],
        replace_existing=True,
        next_run_time=datetime.utcnow(),  # run immediately on first add
    )
    logger.info(f"[SCHEDULER] Job registered for target #{target_id} every {interval_minutes} minutes")


def remove_target_job(target_id: int):
    """Remove a target's scan job."""
    job_id = f"scan_target_{target_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"[SCHEDULER] Job removed for target #{target_id}")


async def load_all_target_jobs():
    """Load all auto-scan targets from DB and register jobs on startup."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Target).where(Target.is_active == True, Target.scan_mode == "auto")
        )
        targets = result.scalars().all()
        for target in targets:
            if target.scan_interval_minutes:
                add_target_job(target.id, target.scan_interval_minutes)
        logger.info(f"[SCHEDULER] Loaded {len(targets)} auto-scan targets")


def start_scheduler():
    scheduler.start()
    logger.info("[SCHEDULER] APScheduler started")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("[SCHEDULER] APScheduler stopped")
