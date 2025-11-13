from collections.abc import Callable
from ipaddress import ip_address, ip_network
from typing import Awaitable

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.redis import redis_client


class RedisRateLimiter:
    """Simple fixed-window limiter backed by Redis."""

    def __init__(self, prefix: str = "rl") -> None:
        self.prefix = prefix

    async def allow(self, key: str, limit: int, window_seconds: int) -> bool:
        redis_key = f"{self.prefix}:{key}"
        count = await redis_client.incr(redis_key)
        if count == 1:
            await redis_client.expire(redis_key, window_seconds)
        return count <= limit


rate_limiter = RedisRateLimiter()

trusted_networks = tuple(ip_network(proxy) for proxy in settings.trusted_proxies)


def _is_trusted_proxy(host: str | None) -> bool:
    if not host or not trusted_networks:
        return False
    try:
        client_ip = ip_address(host)
    except ValueError:
        return False
    return any(client_ip in network for network in trusted_networks)


def default_identifier(request: Request) -> str:
    client_host = request.client.host if request.client else None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded and _is_trusted_proxy(client_host):
        return forwarded.split(",")[0].strip()
    if client_host:
        return client_host
    return "unknown"


def user_identifier(request: Request) -> str:
    user_id = getattr(request.state, "user_id", None)
    if user_id is not None:
        return f"user:{user_id}"
    return default_identifier(request)


IdentifierFn = Callable[[Request], str]


def rate_limit_dependency(
    scope: str,
    limit: int,
    window_seconds: int,
    identifier: IdentifierFn | None = None,
) -> Callable[[Request], Awaitable[None]]:
    async def dependency(request: Request) -> None:
        identity = identifier(request) if identifier else default_identifier(request)
        allowed = await rate_limiter.allow(f"{scope}:{identity}", limit, window_seconds)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="rate_limit_exceeded",
            )

    return dependency
