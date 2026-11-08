from __future__ import annotations

from pathlib import Path
from typing import Any, Optional

import bcrypt
from fastapi import Cookie, HTTPException, Request, Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.core.config import get_settings

ADMIN_COOKIE = "sunderta_admin"
SESSION_COOKIE = "sunderta_session"


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(get_settings().session_secret, salt="sunderta-auth")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def _max_age() -> int:
    return get_settings().session_ttl_days * 24 * 60 * 60


def cookie_should_be_secure(request: Request) -> bool:
    settings = get_settings()
    override = (settings.cookie_secure or "").strip().lower()
    if override in {"1", "true", "yes"}:
        return True
    if override in {"0", "false", "no"}:
        return False
    proto = (request.headers.get("x-forwarded-proto") or request.url.scheme or "http").split(",")[0].strip()
    return proto == "https"


def set_signed_cookie(response: Response, request: Request, name: str, payload: dict[str, Any]) -> None:
    token = _serializer().dumps(payload)
    response.set_cookie(
        key=name,
        value=token,
        max_age=_max_age(),
        httponly=True,
        samesite="lax",
        secure=cookie_should_be_secure(request),
        path="/",
    )


def clear_cookie(response: Response, name: str) -> None:
    response.delete_cookie(key=name, path="/")


def read_signed_cookie(raw: Optional[str]) -> Optional[dict[str, Any]]:
    if not raw:
        return None
    try:
        data = _serializer().loads(raw, max_age=_max_age())
        return data if isinstance(data, dict) else None
    except (BadSignature, SignatureExpired, TypeError, ValueError):
        return None


async def get_user_id(
    request: Request,
    sunderta_session: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
) -> str:
    data = read_signed_cookie(sunderta_session)
    if not data or data.get("role") != "invitee":
        raise HTTPException(status_code=401, detail="Authentication required")
    user_id = str(data.get("user_id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id


async def require_admin(
    sunderta_admin: Optional[str] = Cookie(default=None, alias=ADMIN_COOKIE),
) -> bool:
    data = read_signed_cookie(sunderta_admin)
    if not data or data.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Admin authentication required")
    return True


def ensure_user_owns(doc: dict[str, Any] | None, user_id: str) -> dict[str, Any]:
    if not doc:
        raise HTTPException(status_code=404, detail="Resource not found")
    if doc.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    return doc


def safe_join(root: Path, *parts: str) -> Path:
    candidate = (root.joinpath(*parts)).resolve()
    root_resolved = root.resolve()
    if not str(candidate).startswith(str(root_resolved)):
        raise ValueError("Path traversal detected")
    return candidate
