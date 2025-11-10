from pydantic import BaseModel, field_validator


class UserBase(BaseModel):
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    locale: str = "en"


class UserPublic(UserBase):
    id: int
    is_admin: bool = False
    app_seconds_spent: int = 0


class UserUsageUpdate(BaseModel):
    seconds: int

    @field_validator("seconds")
    @classmethod
    def validate_seconds(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("seconds must be positive")
        if value > 6 * 60 * 60:
            raise ValueError("seconds exceeds maximum session duration")
        return value
