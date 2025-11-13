from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.core.rate_limiter import default_identifier, rate_limiter


class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, *, limit: int, window_seconds: int) -> None:
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next):
        identity = default_identifier(request)
        allowed = await rate_limiter.allow(
            key=f"global:{identity}",
            limit=self.limit,
            window_seconds=self.window_seconds,
        )
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "service_overloaded"},
            )
        return await call_next(request)
