from redis.asyncio import Redis

from app.core.config import settings

redis_client = Redis.from_url(
    settings.redis_url,
    encoding="utf-8",
    decode_responses=True,
    health_check_interval=30,
)


async def close_redis_connection() -> None:
    await redis_client.close()
