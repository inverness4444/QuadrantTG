import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.core.config import settings
from app.core.rate_limiter import rate_limit_dependency
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.telegram import verify_and_destructure_init_data
from app.repositories.user import UserRepository
from app.schemas.auth import RefreshRequest, TelegramMiniAppAuthRequest, TokenPair
from app.schemas.user import UserPublic
from app.services.user import UserService

router = APIRouter()
logger = logging.getLogger(__name__)

auth_rate_limit = rate_limit_dependency(
    scope="auth",
    limit=settings.auth_rate_limit_per_minute,
    window_seconds=60,
)


@router.post(
    "/telegram/miniapp",
    response_model=TokenPair,
    status_code=status.HTTP_200_OK,
    summary="Authenticate Telegram Mini App request",
    dependencies=[Depends(auth_rate_limit)],
)
async def authenticate_telegram_miniapp(
    payload: TelegramMiniAppAuthRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenPair:
    try:
        telegram, _ = verify_and_destructure_init_data(payload.init_data)
    except HTTPException as exc:
        # verify_and_destructure_init_data raises HTTPException with sanitized detail
        logger.warning(
            "miniapp_auth_failed",
            extra={"event": "miniapp_auth_failed", "reason": exc.detail},
        )
        raise

    service = UserService(db)
    user = await service.get_or_create(
        telegram_id=telegram.id,
        username=telegram.username,
        first_name=telegram.first_name,
        last_name=telegram.last_name,
        locale=telegram.locale or "en",
        avatar_url=telegram.photo_url,
    )

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    return TokenPair(access=access, refresh=refresh, user=user)


@router.post(
    "/refresh",
    response_model=TokenPair,
    status_code=status.HTTP_200_OK,
    summary="Refresh access token for Mini App",
    dependencies=[Depends(auth_rate_limit)],
)
async def refresh_tokens(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db_session),
) -> TokenPair:
    try:
        payload_data = decode_token(payload.refresh)
    except ValueError as exc:  # token decoding failure
        logger.warning(
            "miniapp_refresh_failed",
            extra={
                "event": "miniapp_token_refresh",
                "reason": "invalid_refresh_token",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_refresh_token",
        ) from exc

    if payload_data.get("type") != "refresh":
        logger.warning(
            "miniapp_refresh_failed",
            extra={
                "event": "miniapp_token_refresh",
                "reason": "invalid_token_type",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_refresh_token",
        )

    subject = payload_data.get("sub")
    try:
        user_id = int(subject)
    except (TypeError, ValueError) as exc:
        logger.warning(
            "miniapp_refresh_failed",
            extra={
                "event": "miniapp_token_refresh",
                "reason": "invalid_subject",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_refresh_token",
        ) from exc

    repo = UserRepository(db)
    user_model = await repo.get_by_id(user_id)
    if user_model is None:
        logger.warning(
            "miniapp_refresh_failed",
            extra={
                "event": "miniapp_token_refresh",
                "reason": "user_not_found",
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="user_not_found",
        )

    user = UserPublic(
        id=user_model.id,
        username=user_model.username,
        first_name=user_model.first_name,
        last_name=user_model.last_name,
        locale=user_model.locale,
        is_admin=user_model.is_admin,
        app_seconds_spent=user_model.app_seconds_spent or 0,
    )

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    return TokenPair(access=access, refresh=refresh, user=user)
