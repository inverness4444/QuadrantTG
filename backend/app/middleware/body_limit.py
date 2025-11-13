from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, *, max_body_size: int) -> None:
        super().__init__(app)
        self.max_body_size = max_body_size
        self._methods = {"POST", "PUT", "PATCH", "DELETE"}

    async def dispatch(self, request: Request, call_next):
        if request.method not in self._methods:
            return await call_next(request)

        body = await request.body()
        if len(body) > self.max_body_size:
            return JSONResponse(
                status_code=413,
                content={"detail": "payload_too_large"},
            )

        return await call_next(request)
