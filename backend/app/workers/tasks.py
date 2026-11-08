from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bson import ObjectId

from app.core.config import get_settings
from app.db.mongo import get_db
from app.schemas.report import validate_skin_report
from app.services.azure_openai_service import analyze_images
from app.services.report_adapter import to_ui_report
from app.services.storage_service import get_storage
from app.skin_pipeline.image_pipeline import prepare_image
from app.skin_pipeline.legacy import summarize_local_quality
from app.skin_pipeline.video_pipeline import prepare_video

LOGGER = logging.getLogger(__name__)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _update(analysis_id: str, **fields: Any) -> None:
    fields["updated_at"] = _now()
    get_db().analyses.update_one({"_id": ObjectId(analysis_id)}, {"$set": fields})


def _set_progress(analysis_id: str, stage: str, progress: int, message: str) -> None:
    _update(
        analysis_id,
        progress={"stage": stage, "progress": progress, "message": message},
    )


def process_analysis(analysis_id: str) -> dict[str, Any]:
    db = get_db()
    doc = db.analyses.find_one({"_id": ObjectId(analysis_id)})
    if not doc:
        LOGGER.error("Analysis %s not found", analysis_id)
        return {"ok": False, "reason": "missing"}
    if doc.get("status") == "cancelled":
        return {"ok": False, "reason": "cancelled"}

    _update(analysis_id, status="processing")
    storage = get_storage()
    media_path = storage.absolute_path(doc["media_path"])
    mode = doc.get("mode")

    try:
        if not media_path.exists():
            raise RuntimeError("Uploaded media is missing")

        if mode == "image":
            _set_progress(analysis_id, "checking_image_quality", 25, "Checking image quality")
            _set_progress(analysis_id, "preparing_image", 40, "Preparing image for analysis")
            data_urls, selected_quality = prepare_image(media_path)
            all_quality = list(selected_quality)
            selected_paths: list[str] = []
        else:
            _set_progress(analysis_id, "reading_video", 20, "Reading video")
            out_dir = media_path.parent / "selected_frames"
            out_dir.mkdir(parents=True, exist_ok=True)
            _set_progress(analysis_id, "sampling_frames", 35, "Sampling video frames")
            _set_progress(analysis_id, "checking_frame_quality", 50, "Checking frame quality")
            _set_progress(analysis_id, "selecting_frames", 60, "Selecting the clearest video frames")
            data_urls, selected_quality, all_quality = prepare_video(
                video_path=media_path,
                candidate_count=20,
                max_frames=4,
                save_frames=True,
                output_dir=media_path.parent,
            )
            selected_paths = [
                q.saved_path for q in selected_quality if getattr(q, "saved_path", None)
            ]

        current = get_db().analyses.find_one({"_id": ObjectId(analysis_id)})
        if current and current.get("status") == "cancelled":
            return {"ok": False, "reason": "cancelled"}

        local_summary = summarize_local_quality(selected_quality)
        _update(analysis_id, local_quality_summary=local_summary, selected_frame_paths=selected_paths)

        if not any(q.face_detected for q in selected_quality):
            raise RuntimeError("NO_FACE_DETECTED")

        _set_progress(analysis_id, "analyzing_with_ai", 75, "Analyzing with Azure OpenAI")
        raw_report = analyze_images(data_urls, local_summary)

        _set_progress(analysis_id, "generating_report", 90, "Generating structured report")
        # Strip pipeline metadata before schema validation
        clean = {k: v for k, v in raw_report.items() if not k.startswith("_")}
        validated = validate_skin_report(clean)
        report_dict = validated.model_dump()

        # previous score for delta
        prev = db.analyses.find_one(
            {"user_id": doc["user_id"], "status": "completed", "_id": {"$ne": ObjectId(analysis_id)}},
            sort=[("created_at", -1)],
        )
        prev_score = None
        if prev and prev.get("ui_report"):
            prev_score = prev["ui_report"].get("score")

        ui_report = to_ui_report(analysis_id, doc.get("created_at") or _now(), report_dict, prev_score)

        _update(
            analysis_id,
            status="completed",
            report=report_dict,
            ui_report=ui_report,
            model_metadata=raw_report.get("_model_metadata"),
            completed_at=_now(),
            progress={"stage": "completed", "progress": 100, "message": "Analysis complete"},
            error_code=None,
            error_message=None,
        )

        # Seed routine from report if user has none
        _ensure_routine_from_report(doc["user_id"], ui_report)
        return {"ok": True}

    except Exception as exc:
        LOGGER.exception("Analysis %s failed", analysis_id)
        code, message = _map_error(exc)
        _update(
            analysis_id,
            status="failed",
            error_code=code,
            error_message=message,
            progress={"stage": "failed", "progress": 0, "message": message},
        )
        return {"ok": False, "reason": code}


def _ensure_routine_from_report(user_id: str, ui_report: dict[str, Any]) -> None:
    db = get_db()
    existing = db.routines.find_one({"user_id": user_id})
    payload = {
        "user_id": user_id,
        "morning": ui_report.get("morningRoutine") or [],
        "night": ui_report.get("nightRoutine") or [],
        "weekly": ui_report.get("weeklyRoutine") or [],
        "updated_at": _now(),
        "source_analysis_id": ui_report.get("id"),
    }
    if existing:
        # Only refresh if empty
        if not existing.get("morning") and not existing.get("night"):
            db.routines.update_one({"user_id": user_id}, {"$set": payload})
    else:
        payload["created_at"] = _now()
        db.routines.insert_one(payload)


def _map_error(exc: Exception) -> tuple[str, str]:
    text = str(exc)
    if "NO_FACE_DETECTED" in text:
        return "NO_FACE_DETECTED", "No face was detected in the upload."
    if "Could not decode" in text or "unreadable" in text.lower():
        return "INVALID_MEDIA", "The uploaded media could not be processed."
    if "No suitable video frames" in text or "No usable frames" in text:
        return "NO_USABLE_FRAMES", "No usable video frames were found."
    if "APIConnectionError" in text or "Connection error" in text:
        return "AZURE_TIMEOUT", "The analysis service is temporarily unavailable."
    if "did not contain a valid JSON" in text or "validation" in text.lower():
        return "INVALID_AI_RESPONSE", "The analysis response could not be validated."
    return "ANALYSIS_FAILED", "The analysis could not be completed."
