from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from app.database import get_db
from app.models import Notification, AdminUser
from app.auth import get_current_user
from app.schemas import NotificationResponse

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Notification)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/unread-count")
async def unread_count(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    result = await db.execute(
        select(func.count()).where(Notification.is_read == False)
    )
    count = result.scalar()
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id)
        .values(is_read=True)
    )
    await db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(update(Notification).values(is_read=True))
    await db.commit()
    return {"message": "All notifications marked as read"}
