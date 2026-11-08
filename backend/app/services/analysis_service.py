from __future__ import annotations

import logging
import mimetypes
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import cv2
import numpy as np
from bson import ObjectId
from fastapi import HTTPException, UploadFile

from app.core.config import get_settings
from app.db.mongo import get_db
from app.queue.jobs import enqueue_analysis
from app.services.report_adapter import to_ui_report
from app.services.storage_service import get_storage

LOGGER = logging.getLogger(__name__)

IMAGE_MIME = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
VIDEO_MIME = {"video/mp4", "video/quicktime", "video/webm", "video/x-m4v", "video/mpeg"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Invalid analysis id") from exc


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for key in ("created_at", "updated_at", "completed_at"):
        if isinstance(out.get(key), datetime):
            out[key] = out[key].isoformat()
    return out


async def _read_upload(file: UploadFile, max_bytes: int) -> tuple[bytes, str, str]:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload")
    if len(data) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds limit of {max_bytes} bytes")
    filename = file.filename or "upload.bin"
    content_type = (file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream").lower()
    return data, filename, content_type


def _validate_image(data: bytes, filename: str, content_type: str) -> None:
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if content_type not in IMAGE_MIME and ext not in IMAGE_EXT:
        raise HTTPException(status_code=400, detail="Unsupported image type")
    arr = np.frombuffer(data, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Corrupt or unreadable image")


def _validate_video(data: bytes, filename: str, content_type: str, temp_path: str) -> float:
    ext = ("." + filename.rsplit(".", 1)[-1].lower()) if "." in filename else ""
    if content_type not in VIDEO_MIME and ext not in VIDEO_EXT:
        raise HTTPException(status_code=400, detail="Unsupported video type")
    capture = cv2.VideoCapture(temp_path)
    if not capture.isOpened():
        raise HTTPException(status_code=400, detail="Corrupt or unreadable video")
    try:
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0) or 30.0
        frames = float(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = frames / fps if fps > 0 else 0
        settings = get_settings()
        if duration > settings.max_video_duration_seconds + 1:
            raise HTTPException(
                status_code=400,
                detail=f"Video exceeds maximum duration of {settings.max_video_duration_seconds}s",
            )
        ok, frame = capture.read()
        if not ok or frame is None:
            raise HTTPException(status_code=400, detail="Video has no readable frames")
        return duration
    finally:
        capture.release()


async def create_media_analysis(user_id: str, mode: str, file: UploadFile, consent: bool = True) -> dict[str, Any]:
    settings = get_settings()
    max_bytes = settings.max_image_bytes if mode == "image" else settings.max_video_bytes
    data, filename, content_type = await _read_upload(file, max_bytes)

    analysis_id = str(ObjectId())
    storage = get_storage()
    relative = storage.save(user_id, analysis_id, filename, data, content_type)
    abs_path = storage.absolute_path(relative)

    duration = None
    if mode == "image":
        _validate_image(data, filename, content_type)
    else:
        duration = _validate_video(data, filename, content_type, str(abs_path))

    now = _now()
    doc = {
        "_id": ObjectId(analysis_id),
        "user_id": user_id,
        "mode": mode,
        "status": "uploaded",
        "progress": {"stage": "validating_upload", "progress": 5, "message": "Upload validated"},
        "media_path": relative,
        "original_filename": filename,
        "content_type": content_type,
        "duration_seconds": duration,
        "consent": bool(consent),
        "report": None,
        "ui_report": None,
        "local_quality_summary": None,
        "selected_frame_paths": [],
        "error_code": None,
        "error_message": None,
        "job_id": None,
        "retry_count": 0,
        "created_at": now,
        "updated_at": now,
        "completed_at": None,
    }
    db = get_db()
    db.analyses.insert_one(doc)

    try:
        job_id = enqueue_analysis(analysis_id)
        db.analyses.update_one(
            {"_id": ObjectId(analysis_id)},
            {"$set": {
                "status": "queued",
                "job_id": job_id,
                "progress": {"stage": "queued", "progress": 10, "message": "Queued for analysis"},
                "updated_at": _now(),
            }},
        )
        doc["status"] = "queued"
        doc["job_id"] = job_id
        doc["progress"] = {"stage": "queued", "progress": 10, "message": "Queued for analysis"}
    except Exception:
        LOGGER.exception("Failed to enqueue analysis %s", analysis_id)
        db.analyses.update_one(
            {"_id": ObjectId(analysis_id)},
            {"$set": {
                "status": "failed",
                "error_code": "QUEUE_FAILURE",
                "error_message": "Could not queue analysis job",
                "updated_at": _now(),
            }},
        )
        raise HTTPException(status_code=503, detail="Queue unavailable")

    return {
        "id": analysis_id,
        "status": doc["status"],
        "mode": mode,
        "progress": doc["progress"],
    }


def get_analysis(user_id: str, analysis_id: str) -> dict[str, Any]:
    doc = get_db().analyses.find_one({"_id": _oid(analysis_id)})
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    data = _serialize(doc)
    # strip heavy internals for detail endpoint consumers if needed
    return data


def get_status(user_id: str, analysis_id: str) -> dict[str, Any]:
    doc = get_analysis(user_id, analysis_id)
    return {
        "id": doc["id"],
        "status": doc["status"],
        "mode": doc["mode"],
        "progress": doc.get("progress") or {"stage": "created", "progress": 0, "message": ""},
        "error_code": doc.get("error_code"),
        "error_message": doc.get("error_message"),
    }


def get_report(user_id: str, analysis_id: str) -> dict[str, Any]:
    doc = get_analysis(user_id, analysis_id)
    if doc.get("status") != "completed" or not doc.get("ui_report"):
        raise HTTPException(status_code=409, detail="Report not ready")
    return doc["ui_report"]


def list_history(
    user_id: str,
    mode: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    query: dict[str, Any] = {"user_id": user_id}
    if mode in {"image", "video"}:
        query["mode"] = mode
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    db = get_db()
    total = db.analyses.count_documents(query)
    cursor = (
        db.analyses.find(query)
        .sort("created_at", -1)
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = []
    for doc in cursor:
        ui = doc.get("ui_report") or {}
        items.append({
            "id": str(doc["_id"]),
            "date": (doc.get("created_at") or _now()).date().isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at"))[:10],
            "score": ui.get("score") or 0,
            "skinType": ui.get("skinType") or "",
            "concerns": [c.get("label") for c in (ui.get("concerns") or [])][:4],
            "improvement": "",
            "image": "",
            "status": doc.get("status"),
            "mode": doc.get("mode"),
        })
    return {"items": items, "page": page, "page_size": page_size, "total": total}


def delete_analysis(user_id: str, analysis_id: str) -> None:
    db = get_db()
    doc = db.analyses.find_one({"_id": _oid(analysis_id)})
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    get_storage().delete_analysis_dir(user_id, analysis_id)
    db.analyses.delete_one({"_id": doc["_id"]})
    db.comparisons.delete_many({
        "user_id": user_id,
        "$or": [
            {"previous_analysis_id": analysis_id},
            {"current_analysis_id": analysis_id},
        ],
    })


def retry_analysis(user_id: str, analysis_id: str) -> dict[str, Any]:
    db = get_db()
    doc = db.analyses.find_one({"_id": _oid(analysis_id)})
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if doc.get("status") not in {"failed", "cancelled"}:
        raise HTTPException(status_code=409, detail="Only failed or cancelled analyses can be retried")
    if not doc.get("media_path") or not get_storage().exists(doc["media_path"]):
        raise HTTPException(status_code=409, detail="Original media is missing")
    job_id = enqueue_analysis(analysis_id)
    db.analyses.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "queued",
            "job_id": job_id,
            "error_code": None,
            "error_message": None,
            "progress": {"stage": "queued", "progress": 10, "message": "Re-queued for analysis"},
            "updated_at": _now(),
        }, "$inc": {"retry_count": 1}},
    )
    return get_status(user_id, analysis_id)


def cancel_analysis(user_id: str, analysis_id: str) -> dict[str, Any]:
    db = get_db()
    doc = db.analyses.find_one({"_id": _oid(analysis_id)})
    if not doc or doc.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Analysis not found")
    if doc.get("status") in {"completed", "failed", "cancelled"}:
        raise HTTPException(status_code=409, detail="Analysis already finished")
    db.analyses.update_one(
        {"_id": doc["_id"]},
        {"$set": {
            "status": "cancelled",
            "progress": {"stage": "cancelled", "progress": 0, "message": "Cancelled by user"},
            "updated_at": _now(),
        }},
    )
    return get_status(user_id, analysis_id)
