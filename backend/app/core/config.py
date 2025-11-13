from functools import lru_cache
from typing import Any

from pydantic import Field, HttpUrl, PostgresDsn, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    project_name: str = "Quadrant API"
    version: str = "0.1.0"
    environment: str = Field(default="development", env="ENVIRONMENT")
    api_prefix: str = "/api/v1"

    database_url: PostgresDsn = Field(
        default="postgresql+asyncpg://user:pass@localhost:5432/quadrant"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    jwt_secret: str = Field(default="change-me", env="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    global_rate_limit_window_seconds: int = Field(default=10, env="GLOBAL_RATE_LIMIT_WINDOW_SECONDS")
    global_rate_limit_max_requests: int = Field(default=600, env="GLOBAL_RATE_LIMIT_MAX_REQUESTS")
    auth_rate_limit_per_minute: int = Field(default=20, env="AUTH_RATE_LIMIT_PER_MINUTE")
    admin_rate_limit_per_minute: int = Field(default=60, env="ADMIN_RATE_LIMIT_PER_MINUTE")
    usage_rate_limit_per_minute: int = Field(default=120, env="USAGE_RATE_LIMIT_PER_MINUTE")
    request_body_max_bytes: int = Field(default=262144, env="REQUEST_BODY_MAX_BYTES")

    telegram_bot_token: str = Field(default="dummy", env="TELEGRAM_BOT_TOKEN")
    telegram_bot_domain: HttpUrl | None = Field(default=None, env="TELEGRAM_BOT_DOMAIN")

    strava_client_id: str | None = Field(default=None, env="STRAVA_CLIENT_ID")
    strava_client_secret: str | None = Field(default=None, env="STRAVA_CLIENT_SECRET")
    strava_redirect_uri: HttpUrl | None = Field(default=None, env="STRAVA_REDIRECT_URI")

    ton_manifest_url: HttpUrl | None = Field(default=None, env="TON_MANIFEST_URL")
    allowed_origins: tuple[str, ...] = Field(
        default=("http://localhost:3000",), env="ALLOWED_ORIGINS"
    )
    trusted_proxies: tuple[str, ...] = Field(default=(), env="TRUSTED_PROXIES")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    admin_telegram_ids: tuple[int, ...] = Field(
        default=(1350430976, 796891046), env="ADMIN_TELEGRAM_IDS"
    )

    @field_validator("jwt_secret")
    @classmethod
    def ensure_secret(cls, value: str) -> str:
        if value == "change-me":
            raise ValueError("JWT_SECRET must be set to a secure, non-default value")
        if len(value) < 16:
            raise ValueError("JWT_SECRET must be at least 16 characters long")
        return value

    @field_validator("admin_telegram_ids", mode="before")
    @classmethod
    def parse_admin_ids(cls, value: Any) -> tuple[int, ...]:
        if value in (None, "", ()):
            return ()
        if isinstance(value, (list, tuple)):
            ids: list[int] = []
            for item in value:
                if item in (None, ""):
                    continue
                ids.append(int(item))
            return tuple(ids)
        if isinstance(value, str):
            cleaned = [part.strip() for part in value.split(",")]
            ids = [int(part) for part in cleaned if part]
            return tuple(ids)
        return tuple(value)

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> tuple[str, ...]:
        if value in (None, "", ()):
            return ()
        if isinstance(value, str):
            parts = [part.strip() for part in value.split(",")]
            return tuple([part for part in parts if part])
        if isinstance(value, (list, tuple)):
            origins: list[str] = []
            for item in value:
                if item in (None, ""):
                    continue
                origins.append(str(item).strip())
            return tuple([origin for origin in origins if origin])
        return (str(value).strip(),)

    @field_validator("trusted_proxies", mode="before")
    @classmethod
    def parse_trusted_proxies(cls, value: Any) -> tuple[str, ...]:
        if value in (None, "", ()):
            return ()
        if isinstance(value, str):
            return tuple(part.strip() for part in value.split(",") if part.strip())
        if isinstance(value, (list, tuple)):
            return tuple(str(item).strip() for item in value if str(item).strip())
        return (str(value).strip(),)

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings: Settings = get_settings()
