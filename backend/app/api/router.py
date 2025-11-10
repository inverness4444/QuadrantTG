from fastapi import APIRouter

from app.api.v1.routes import auth, content, health, users

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(content.router, prefix="/content")
api_router.include_router(content.admin_router, prefix="/content")
