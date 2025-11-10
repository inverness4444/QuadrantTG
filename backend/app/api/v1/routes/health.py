from fastapi import APIRouter

router = APIRouter()


@router.get("/ready", summary="Readiness probe")
async def readiness() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/live", summary="Liveness probe")
async def liveness() -> dict[str, str]:
    return {"status": "alive"}
