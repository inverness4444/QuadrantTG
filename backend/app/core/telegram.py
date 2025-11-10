from __future__ import annotations

import hmac
import json
import time
from hashlib import sha256
from typing import Mapping
from urllib.parse import parse_qsl

from fastapi import HTTPException, status

from app.core.config import settings
from app.schemas.auth import TelegramAuthData

ALLOWED_TIME_SKEW_SECONDS = 60 * 60  # 1 hour


def _build_data_check_string(data: Mapping[str, str]) -> str:
    pairs = []
    for key in sorted(data.keys()):
        if key == "hash":
            continue
        value = data[key]
        pairs.append(f"{key}={value}")
    return "\n".join(pairs)


def _compute_hash(data_check_string: str, bot_token: str) -> str:
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), sha256).digest()
    signature = hmac.new(secret_key, data_check_string.encode("utf-8"), sha256).hexdigest()
    return signature


def _validate_timestamp(auth_date: int) -> None:
    now = int(time.time())
    if now - auth_date > ALLOWED_TIME_SKEW_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="auth_expired",
        )


def parse_telegram_init_data(raw_init_data: str) -> dict[str, str]:
    if not raw_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_telegram_payload",
        )
    parsed = dict(parse_qsl(raw_init_data, keep_blank_values=True))
    if "hash" not in parsed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_payload",
        )
    return parsed


def _build_auth_payload(params: Mapping[str, str]) -> TelegramAuthData:
    user_raw = params.get("user")
    if not user_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_user_payload",
        )
    try:
        user_payload = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_user_payload",
        ) from exc

    if "id" not in user_payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing_user_id",
        )
    try:
        auth_date = int(params.get("auth_date", "0"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_auth_date",
        ) from exc

    payload = TelegramAuthData(
        id=int(user_payload["id"]),
        first_name=user_payload.get("first_name"),
        last_name=user_payload.get("last_name"),
        username=user_payload.get("username"),
        photo_url=user_payload.get("photo_url"),
        auth_date=auth_date,
        hash=params.get("hash", ""),
        locale=user_payload.get("language_code"),
    )
    return payload


def verify_and_destructure_init_data(raw_init_data: str) -> tuple[TelegramAuthData, dict[str, str]]:
    params = parse_telegram_init_data(raw_init_data)
    data_check_string = _build_data_check_string(params)
    expected_hash = _compute_hash(data_check_string, settings.telegram_bot_token)
    provided_hash = params.get("hash", "")

    if not hmac.compare_digest(expected_hash, provided_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_signature",
        )

    auth_data = _build_auth_payload(params)
    _validate_timestamp(auth_data.auth_date)
    return auth_data, params


def verify_telegram_init_data(raw_init_data: str) -> TelegramAuthData:
    auth_data, _ = verify_and_destructure_init_data(raw_init_data)
    return auth_data
