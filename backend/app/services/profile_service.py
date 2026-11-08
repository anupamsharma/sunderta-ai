from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.db.mongo import get_db
from app.services.storage_service import get_storage


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_profile(user_id: str) -> dict[str, Any]:
    doc = get_db().profiles.find_one({"user_id": user_id})
    if not doc:
        return {
            "user_id": user_id,
            "display_name": "Guest",
            "skin_goals": [],
            "sensitivities": [],
            "ingredients_to_avoid": [],
            "budget_range": "",
            "product_preferences": [],
            "location": "",
            "privacy_preferences": {},
            "media_retention_preference": "30_days",
        }
    doc.pop("_id", None)
    return doc


def update_profile(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    data = {k: v for k, v in payload.items() if v is not None}
    data["user_id"] = user_id
    data["updated_at"] = _now()
    get_db().profiles.update_one(
        {"user_id": user_id},
        {"$set": data, "$setOnInsert": {"created_at": _now()}},
        upsert=True,
    )
    return get_profile(user_id)


def delete_all_user_data(user_id: str) -> dict[str, Any]:
    db = get_db()
    storage = get_storage()
    for doc in db.analyses.find({"user_id": user_id}):
        storage.delete_analysis_dir(user_id, str(doc["_id"]))
    deleted = {
        "analyses": db.analyses.delete_many({"user_id": user_id}).deleted_count,
        "profiles": db.profiles.delete_many({"user_id": user_id}).deleted_count,
        "routines": db.routines.delete_many({"user_id": user_id}).deleted_count,
        "routine_completions": db.routine_completions.delete_many({"user_id": user_id}).deleted_count,
        "conversations": db.conversations.delete_many({"user_id": user_id}).deleted_count,
        "messages": db.messages.delete_many({"user_id": user_id}).deleted_count,
        "comparisons": db.comparisons.delete_many({"user_id": user_id}).deleted_count,
    }
    return deleted
