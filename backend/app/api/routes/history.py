from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.responses import success_response
from app.core.security import get_user_id
from app.services import analysis_service

router = APIRouter(tags=["history"])


@router.get("/history")
def history(
    mode: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user_id: str = Depends(get_user_id),
):
    return success_response(analysis_service.list_history(user_id, mode, page, page_size))
