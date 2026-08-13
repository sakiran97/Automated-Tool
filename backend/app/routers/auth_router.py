from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.database import get_db
from app.models import AdminUser
from app.auth import verify_password, create_access_token, get_current_user, get_password_hash
from app.schemas import LoginRequest, TokenResponse, ChangePasswordRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AdminUser).where(AdminUser.username == request.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    # Update last login
    user.last_login = datetime.utcnow()
    await db.commit()

    token = create_access_token({"sub": user.username})
    return TokenResponse(
        access_token=token,
        username=user.username,
        is_default_password=user.is_default_password,
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(request.new_password)
    current_user.is_default_password = False
    await db.commit()
    return {"message": "Password updated successfully"}


@router.get("/me")
async def get_me(current_user: AdminUser = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "is_default_password": current_user.is_default_password,
        "last_login": current_user.last_login,
    }
