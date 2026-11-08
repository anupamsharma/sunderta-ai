from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from fastapi import HTTPException

from app.core.security import hash_password, verify_password
from app.db.mongo import get_db
from app.services.profile_service import delete_all_user_data


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name") or "",
        "token": doc.get("token") or "",
        "url_path": f"/access/{doc.get('token')}",
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "updated_at": doc["updated_at"].isoformat() if doc.get("updated_at") else None,
        "last_login_at": doc["last_login_at"].isoformat() if doc.get("last_login_at") else None,
    }


def create_link(name: str, password: str) -> dict[str, Any]:
    name = (name or "").strip()
    password = password or ""
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    token = secrets.token_urlsafe(24)
    doc = {
        "name": name,
        "token": token,
        "password_hash": hash_password(password),
        "created_at": _now(),
        "updated_at": _now(),
        "last_login_at": None,
    }
    result = get_db().access_links.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


def list_links() -> list[dict[str, Any]]:
    items = []
    for doc in get_db().access_links.find().sort("created_at", -1):
        items.append(_serialize(doc))
    return items


def reset_password(link_id: str, password: str) -> dict[str, Any]:
    password = password or ""
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    try:
        oid = ObjectId(link_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Access link not found") from exc
    result = get_db().access_links.update_one(
        {"_id": oid},
        {"$set": {"password_hash": hash_password(password), "updated_at": _now()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Access link not found")
    doc = get_db().access_links.find_one({"_id": oid})
    return _serialize(doc)


def delete_link(link_id: str) -> dict[str, Any]:
    try:
        oid = ObjectId(link_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Access link not found") from exc
    doc = get_db().access_links.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Access link not found")
    user_id = str(doc["_id"])
    wiped = delete_all_user_data(user_id)
    get_db().access_links.delete_one({"_id": oid})
    return {"id": link_id, "deleted_user_data": wiped}


def get_by_token(token: str) -> Optional[dict[str, Any]]:
    token = (token or "").strip()
    if not token:
        return None
    return get_db().access_links.find_one({"token": token})


def public_info(token: str) -> dict[str, Any]:
    doc = get_by_token(token)
    if not doc:
        raise HTTPException(status_code=404, detail="Access link not found")
    return {"name": doc.get("name") or "", "token": doc.get("token") or ""}


def authenticate(token: str, password: str) -> dict[str, Any]:
    doc = get_by_token(token)
    if not doc or not verify_password(password or "", doc.get("password_hash") or ""):
        raise HTTPException(status_code=401, detail="Invalid password")
    get_db().access_links.update_one(
        {"_id": doc["_id"]},
        {"$set": {"last_login_at": _now(), "updated_at": _now()}},
    )
    return {
        "user_id": str(doc["_id"]),
        "name": doc.get("name") or "",
        "token": doc.get("token") or "",
    }


def get_invitee_profile(user_id: str) -> dict[str, Any]:
    try:
        oid = ObjectId(user_id)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc
    doc = get_db().access_links.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=401, detail="Access link no longer exists")
    return {
        "user_id": str(doc["_id"]),
        "name": doc.get("name") or "",
        "token": doc.get("token") or "",
    }
