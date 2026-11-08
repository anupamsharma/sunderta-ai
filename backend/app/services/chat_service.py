from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from fastapi import HTTPException

from app.db.mongo import get_db
from app.services.azure_openai_service import chat_completion


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_conversation(user_id: str, analysis_id: Optional[str] = None, title: Optional[str] = None) -> dict[str, Any]:
    report = None
    if analysis_id:
        doc = get_db().analyses.find_one({"_id": ObjectId(analysis_id), "user_id": user_id, "status": "completed"})
        if not doc:
            raise HTTPException(status_code=404, detail="Completed analysis not found")
        report = doc.get("ui_report")
    else:
        doc = get_db().analyses.find_one({"user_id": user_id, "status": "completed"}, sort=[("created_at", -1)])
        if doc:
            analysis_id = str(doc["_id"])
            report = doc.get("ui_report")

    conv = {
        "user_id": user_id,
        "analysis_id": analysis_id,
        "title": title or "Beauty AI chat",
        "created_at": _now(),
        "updated_at": _now(),
    }
    result = get_db().conversations.insert_one(conv)
    cid = str(result.inserted_id)
    greeting = (
        "Hi! I've loaded your latest skin report. I can explain scores, simplify your routine, "
        "or suggest product categories. What would you like to explore?"
    )
    get_db().messages.insert_one({
        "conversation_id": cid,
        "user_id": user_id,
        "role": "assistant",
        "content": greeting,
        "created_at": _now(),
    })
    return {"id": cid, "analysis_id": analysis_id, "title": conv["title"], "report_loaded": report is not None}


def list_conversations(user_id: str) -> list[dict[str, Any]]:
    items = []
    for doc in get_db().conversations.find({"user_id": user_id}).sort("updated_at", -1):
        items.append({
            "id": str(doc["_id"]),
            "title": doc.get("title"),
            "analysis_id": doc.get("analysis_id"),
            "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
        })
    return items


def get_conversation(user_id: str, conversation_id: str) -> dict[str, Any]:
    doc = get_db().conversations.find_one({"_id": ObjectId(conversation_id)})
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = []
    for m in get_db().messages.find({"conversation_id": conversation_id}).sort("created_at", 1):
        messages.append({
            "id": str(m["_id"]),
            "role": "ai" if m.get("role") == "assistant" else m.get("role"),
            "text": m.get("content"),
            "time": m.get("created_at").strftime("%I:%M %p") if m.get("created_at") else "",
        })
    return {
        "id": conversation_id,
        "title": doc.get("title"),
        "analysis_id": doc.get("analysis_id"),
        "messages": messages,
    }


def send_message(user_id: str, conversation_id: str, content: str) -> dict[str, Any]:
    db = get_db()
    conv = db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv or conv.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.messages.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "user",
        "content": content,
        "created_at": _now(),
    })

    report_context = None
    if conv.get("analysis_id"):
        analysis = db.analyses.find_one({"_id": ObjectId(conv["analysis_id"]), "user_id": user_id})
        if analysis:
            report_context = analysis.get("ui_report") or analysis.get("report")

    history = []
    for m in db.messages.find({"conversation_id": conversation_id}).sort("created_at", 1).limit(40):
        role = "assistant" if m.get("role") in {"assistant", "ai"} else "user"
        history.append({"role": role, "content": m.get("content") or ""})

    try:
        reply = chat_completion(history, report_context)
    except Exception:
        reply = (
            "I'm having trouble reaching the assistant service right now. "
            "Please try again shortly. For persistent or severe skin concerns, consult a dermatologist."
        )

    inserted = db.messages.insert_one({
        "conversation_id": conversation_id,
        "user_id": user_id,
        "role": "assistant",
        "content": reply,
        "created_at": _now(),
    })
    db.conversations.update_one({"_id": conv["_id"]}, {"$set": {"updated_at": _now()}})
    return {
        "id": str(inserted.inserted_id),
        "role": "ai",
        "text": reply,
        "time": _now().strftime("%I:%M %p"),
    }


def delete_conversation(user_id: str, conversation_id: str) -> None:
    db = get_db()
    conv = db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv or conv.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.messages.delete_many({"conversation_id": conversation_id})
    db.conversations.delete_one({"_id": conv["_id"]})
