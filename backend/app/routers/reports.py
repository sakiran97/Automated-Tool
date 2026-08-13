from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models import Report, AdminUser
from app.auth import get_current_user
from app.schemas import ReportResponse, ReportDetailResponse
from app.report_generator import generate_report as _generate_report

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=List[ReportResponse])
async def list_reports(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).options(selectinload(Report.target)).order_by(Report.generated_at.desc())
    )
    return result.scalars().all()


@router.get("/{report_id}", response_model=ReportDetailResponse)
async def get_report(
    report_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report).options(selectinload(Report.target)).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/{report_id}/download/markdown", response_class=PlainTextResponse)
async def download_markdown(
    report_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return PlainTextResponse(
        content=report.content_markdown or "",
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="report_{report_id}.md"'},
    )


@router.get("/{report_id}/download/json")
async def download_json(
    report_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    from fastapi.responses import Response
    return Response(
        content=report.content_json or "{}",
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="report_{report_id}.json"'},
    )


@router.post("/generate/{target_id}", response_model=ReportResponse, status_code=201)
async def generate_report(
    target_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        report = await _generate_report(target_id, db)
        result = await db.execute(
            select(Report).options(selectinload(Report.target)).where(Report.id == report.id)
        )
        return result.scalar_one()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
