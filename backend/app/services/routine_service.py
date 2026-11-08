from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from app.db.mongo import get_db


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_routine(user_id: str) -> dict[str, Any]:
    doc = get_db().routines.find_one({"user_id": user_id})
    if not doc:
        return {"morning": [], "night": [], "weekly": []}
    return {
        "morning": doc.get("morning") or [],
        "night": doc.get("night") or [],
        "weekly": doc.get("weekly") or [],
        "source_analysis_id": doc.get("source_analysis_id"),
    }


def put_routine(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    db = get_db()
    data = {
        "user_id": user_id,
        "morning": payload.get("morning") or [],
        "night": payload.get("night") or [],
        "weekly": payload.get("weekly") or [],
        "updated_at": _now(),
    }
    db.routines.update_one({"user_id": user_id}, {"$set": data, "$setOnInsert": {"created_at": _now()}}, upsert=True)
    return get_routine(user_id)


def save_completions(user_id: str, date: str, period: str, completed_steps: list[int]) -> dict[str, Any]:
    db = get_db()
    db.routine_completions.update_one(
        {"user_id": user_id, "date": date, "period": period},
        {"$set": {
            "user_id": user_id,
            "date": date,
            "period": period,
            "completed_steps": completed_steps,
            "updated_at": _now(),
        }, "$setOnInsert": {"created_at": _now()}},
        upsert=True,
    )
    return {"date": date, "period": period, "completed_steps": completed_steps}


def list_completions(user_id: str, limit: int = 30) -> list[dict[str, Any]]:
    cursor = get_db().routine_completions.find({"user_id": user_id}).sort("date", -1).limit(limit)
    items = []
    for doc in cursor:
        items.append({
            "date": doc.get("date"),
            "period": doc.get("period"),
            "completed_steps": doc.get("completed_steps") or [],
        })
    return items


def add_product_step(user_id: str, product: dict[str, Any], period: str = "morning") -> dict[str, Any]:
    routine = get_routine(user_id)
    steps = list(routine.get(period) or [])
    step_no = len(steps) + 1
    steps.append({
        "step": step_no,
        "type": product.get("category") or "Product",
        "ingredient": product.get("name") or "",
        "why": product.get("reason") or "Added from product recommendations.",
        "frequency": "As needed",
        "completed": False,
        "product_id": product.get("id"),
    })
    routine[period] = steps
    return put_routine(user_id, routine)
