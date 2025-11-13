import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.redis import close_redis_connection
from app.middleware.body_limit import BodySizeLimitMiddleware
from app.middleware.global_rate_limit import GlobalRateLimitMiddleware


def create_application() -> FastAPI:
    """Build FastAPI application instance."""
    logging.basicConfig(level=settings.log_level.upper())
    app = FastAPI(
        title=settings.project_name,
        version=settings.version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.allowed_origins),
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        )

    app.add_middleware(
        BodySizeLimitMiddleware,
        max_body_size=settings.request_body_max_bytes,
    )
    app.add_middleware(
        GlobalRateLimitMiddleware,
        limit=settings.global_rate_limit_max_requests,
        window_seconds=settings.global_rate_limit_window_seconds,
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/healthz", summary="Service health check")
    async def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.on_event("shutdown")
    async def shutdown_event() -> None:
        await close_redis_connection()

    return app


app = create_application()
