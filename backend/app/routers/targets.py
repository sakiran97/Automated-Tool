import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.database import get_db
from app.models import Target, AdminUser
from app.auth import get_current_user
from app.schemas import TargetCreate, TargetUpdate, TargetResponse
from app.scheduler import add_target_job, remove_target_job

router = APIRouter(prefix="/api/targets", tags=["targets"])


@router.get("", response_model=List[TargetResponse])
async def list_targets(
    scan_mode: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Target)
    if scan_mode:
        query = query.where(Target.scan_mode == scan_mode)
    if is_active is not None:
        query = query.where(Target.is_active == is_active)
    query = query.order_by(Target.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=TargetResponse, status_code=201)
async def create_target(
    data: TargetCreate,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Check for duplicate URL
    existing = await db.execute(select(Target).where(Target.url == data.url))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A target with this URL already exists")

    target = Target(**data.model_dump())
    db.add(target)
    await db.commit()
    await db.refresh(target)

    # Register scheduler job for auto targets
    if target.scan_mode == "auto" and target.is_active and target.scan_interval_minutes:
        add_target_job(target.id, target.scan_interval_minutes)

    return target


@router.get("/{target_id}", response_model=TargetResponse)
async def get_target(
    target_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Target).where(Target.id == target_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    return target


@router.put("/{target_id}", response_model=TargetResponse)
async def update_target(
    target_id: int,
    data: TargetUpdate,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Target).where(Target.id == target_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(target, field, value)

    await db.commit()
    await db.refresh(target)

    # Re-register scheduler job
    remove_target_job(target_id)
    if target.scan_mode == "auto" and target.is_active and target.scan_interval_minutes:
        add_target_job(target.id, target.scan_interval_minutes)

    return target


@router.delete("/{target_id}", status_code=204)
async def delete_target(
    target_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Target).where(Target.id == target_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    remove_target_job(target_id)
    await db.delete(target)
    await db.commit()


@router.post("/{target_id}/scan")
async def trigger_scan(
    target_id: int,
    background_tasks: BackgroundTasks,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Manually trigger an immediate scan for a target."""
    result = await db.execute(select(Target).where(Target.id == target_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")

    async def _do_scan():
        from app.scanner.orchestrator import run_scan
        from app.database import AsyncSessionLocal
        async with AsyncSessionLocal() as scan_db:
            await run_scan(target, scan_db)

    background_tasks.add_task(_do_scan)
    return {"message": f"Scan triggered for {target.name}", "target_id": target_id}


@router.post("/sync-config")
async def sync_config_targets(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Import and synchronize targets from config/targets.json into the DB."""
    from app.config_loader import seed_targets_from_config
    added_count = await seed_targets_from_config(db)
    return {"message": f"Successfully synced targets from config. {added_count} new targets added.", "added_count": added_count}


@router.post("/export-config")
async def export_targets(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export current targets from DB to config/targets.json."""
    from app.config_loader import export_targets_to_config
    success = await export_targets_to_config(db)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to export targets to config")
    return {"message": "Successfully exported targets to config/targets.json"}
