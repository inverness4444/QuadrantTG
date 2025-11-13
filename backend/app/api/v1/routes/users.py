from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session, get_telegram_auth_data
from app.core.config import settings
from app.core.rate_limiter import rate_limit_dependency, user_identifier
from app.schemas.auth import TelegramAuthData
from app.schemas.user import UserPublic, UserUsageUpdate
from app.services.user import UserService

router = APIRouter()
usage_rate_limit = rate_limit_dependency(
    scope="usage",
    limit=settings.usage_rate_limit_per_minute,
    window_seconds=60,
    identifier=user_identifier,
)


@router.get("/me", response_model=UserPublic, summary="Get current user profile")
async def get_current_user(
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
    return user


@router.post(
    "/me/usage",
    response_model=UserPublic,
    summary="Report app usage time for current user",
)
async def report_usage_time(
    payload: UserUsageUpdate,
    telegram: TelegramAuthData = Depends(get_telegram_auth_data),
    db: AsyncSession = Depends(get_db_session),
    _: None = Depends(usage_rate_limit),
) -> UserPublic:
    service = UserService(db)
    return await service.add_usage_time(
        telegram_id=telegram.id,
        seconds=payload.seconds,
        username=telegram.username,
        first_name=telegram.first_name,
        last_name=telegram.last_name,
        locale=telegram.locale or "en",
        avatar_url=telegram.photo_url,
    )
