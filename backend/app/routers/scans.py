from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models import Scan, AdminUser
from app.auth import get_current_user
from app.schemas import ScanResponse

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.get("", response_model=List[ScanResponse])
async def list_scans(
    target_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Scan).options(selectinload(Scan.target))
    if target_id:
        query = query.where(Scan.target_id == target_id)
    if status:
        query = query.where(Scan.status == status)
    query = query.order_by(Scan.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(
    scan_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Scan).options(selectinload(Scan.target)).where(Scan.id == scan_id)
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
