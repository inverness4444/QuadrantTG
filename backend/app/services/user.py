from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserPublic


class UserService:
    def __init__(self, session: AsyncSession) -> None:
        self.users = UserRepository(session)

    async def _ensure_user(
        self,
        telegram_id: int,
        username: str | None,
        first_name: str | None,
        last_name: str | None,
        locale: str = "en",
        avatar_url: str | None = None,
    ) -> User:
        user = await self.users.get_by_telegram_id(telegram_id)
        should_be_admin = telegram_id in settings.admin_telegram_ids
        created = False
        updated = False
        if user is None:
            user = await self.users.create(
                telegram_id=telegram_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
                locale=locale,
                avatar_url=avatar_url,
                is_admin=should_be_admin,
            )
            created = True
        else:
            if user.username != username:
                user.username = username
                updated = True
            if user.first_name != first_name:
                user.first_name = first_name
                updated = True
            if user.last_name != last_name:
                user.last_name = last_name
                updated = True
            if user.locale != locale:
                user.locale = locale
                updated = True
            if user.avatar_url != avatar_url:
                user.avatar_url = avatar_url
                updated = True
            if user.is_admin != should_be_admin:
                user.is_admin = should_be_admin
                updated = True

        if created or updated:
            await self.users.session.commit()
            await self.users.session.refresh(user)

        return user

    def _to_public(self, user: User) -> UserPublic:
        return UserPublic(
            id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            locale=user.locale,
            is_admin=user.is_admin,
            app_seconds_spent=user.app_seconds_spent or 0,
        )

    async def get_or_create(
        self,
        telegram_id: int,
        username: str | None,
        first_name: str | None,
        last_name: str | None,
        locale: str = "en",
        avatar_url: str | None = None,
    ) -> UserPublic:
        user = await self._ensure_user(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            locale=locale,
            avatar_url=avatar_url,
        )
        return self._to_public(user)

    async def add_usage_time(
        self,
        telegram_id: int,
        seconds: int,
        username: str | None,
        first_name: str | None,
        last_name: str | None,
        locale: str = "en",
        avatar_url: str | None = None,
    ) -> UserPublic:
        user = await self._ensure_user(
            telegram_id=telegram_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            locale=locale,
            avatar_url=avatar_url,
        )
        user.app_seconds_spent = (user.app_seconds_spent or 0) + seconds
        await self.users.session.commit()
        await self.users.session.refresh(user)
        return self._to_public(user)
