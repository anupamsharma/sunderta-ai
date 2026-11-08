from fastapi import APIRouter
from redis import Redis

from app.core.config import get_settings
from app.core.responses import error_response, success_response
from app.db.mongo import get_client

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return success_response({"status": "ok"})


@router.get("/ready")
def ready():
    try:
        get_client().admin.command("ping")
        Redis.from_url(get_settings().redis_url).ping()
        return success_response({"status": "ready", "mongo": True, "redis": True})
    except Exception as exc:
        return error_response("NOT_READY", f"Dependency check failed: {exc}", status_code=503)
