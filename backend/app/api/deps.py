from collections.abc import AsyncIterator

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal
from app.core.telegram import verify_telegram_init_data
from app.schemas.auth import TelegramAuthData
from app.schemas.user import UserPublic
from app.services.user import UserService


async def get_db_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def get_telegram_auth_data(
    x_telegram_init_data: str | None = Header(
        default=None, alias="X-Telegram-Init-Data", convert_underscores=False
    )
) -> TelegramAuthData:
    if not x_telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_telegram_payload",
        )
    return verify_telegram_init_data(x_telegram_init_data)


async def get_current_user(
    request: Request,
    telegram: TelegramAuthData = Depends(get_telegram_auth_data),
    db: AsyncSession = Depends(get_db_session),
) -> UserPublic:
    service = UserService(db)
    user = await service.get_or_create(
        telegram_id=telegram.id,
        username=telegram.username,
        first_name=telegram.first_name,
        last_name=telegram.last_name,
        locale=telegram.locale or "en",
        avatar_url=telegram.photo_url,
    )
    request.state.user_id = user.id
    return user


async def require_admin_user(
    user: UserPublic = Depends(get_current_user),
) -> UserPublic:
    if not user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="admin_only",
        )
    return user
