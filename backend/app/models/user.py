from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    telegram_id: Mapped[int] = mapped_column(BigInteger, unique=True, index=True)
    username: Mapped[str | None] = mapped_column(String(length=64), nullable=True)
    first_name: Mapped[str | None] = mapped_column(String(length=64), nullable=True)
    last_name: Mapped[str | None] = mapped_column(String(length=64), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(length=256), nullable=True)
    locale: Mapped[str] = mapped_column(String(length=8), default="en")
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    app_seconds_spent: Mapped[int] = mapped_column(
        BigInteger, default=0, server_default="0"
    )
