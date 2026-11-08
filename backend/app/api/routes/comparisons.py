from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.core.responses import success_response
from app.core.security import get_user_id
from app.db.mongo import get_db
from app.schemas.comparison import ComparisonRequest
from app.services.comparison_service import compare_reports

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


@router.post("")
def create_comparison(body: ComparisonRequest, user_id: str = Depends(get_user_id)):
    db = get_db()
    prev = db.analyses.find_one({"_id": ObjectId(body.previous_analysis_id), "user_id": user_id, "status": "completed"})
    curr = db.analyses.find_one({"_id": ObjectId(body.current_analysis_id), "user_id": user_id, "status": "completed"})
    if not prev or not curr:
        raise HTTPException(status_code=404, detail="Both analyses must exist and be completed")
    if not prev.get("report") or not curr.get("report"):
        raise HTTPException(status_code=409, detail="Reports missing")
    result = compare_reports(prev["report"], curr["report"])
    doc = {
        "user_id": user_id,
        "previous_analysis_id": body.previous_analysis_id,
        "current_analysis_id": body.current_analysis_id,
        "result": result,
        "created_at": datetime.now(timezone.utc),
    }
    inserted = db.comparisons.insert_one(doc)
    return success_response({"id": str(inserted.inserted_id), **result}, status_code=201)


@router.get("/{comparison_id}")
def get_comparison(comparison_id: str, user_id: str = Depends(get_user_id)):
    doc = get_db().comparisons.find_one({"_id": ObjectId(comparison_id), "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return success_response({"id": str(doc["_id"]), **(doc.get("result") or {})})
