from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models import Finding, Target, AdminUser
from app.auth import get_current_user
from app.schemas import FindingResponse, FindingUpdate

router = APIRouter(prefix="/api/findings", tags=["findings"])


@router.get("", response_model=List[FindingResponse])
async def list_findings(
    target_id: Optional[int] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Finding).options(selectinload(Finding.target))
    if target_id:
        query = query.where(Finding.target_id == target_id)
    if severity:
        query = query.where(Finding.severity == severity)
    if category:
        query = query.where(Finding.category == category)
    if status:
        query = query.where(Finding.status == status)
    query = query.order_by(Finding.first_seen.desc()).limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(
    finding_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Finding).options(selectinload(Finding.target)).where(Finding.id == finding_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


@router.patch("/{finding_id}", response_model=FindingResponse)
async def update_finding(
    finding_id: int,
    data: FindingUpdate,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Finding).options(selectinload(Finding.target)).where(Finding.id == finding_id)
    )
    finding = result.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(finding, field, value)

    await db.commit()
    await db.refresh(finding)
    return finding
