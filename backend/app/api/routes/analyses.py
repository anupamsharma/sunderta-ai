from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.core.responses import error_response, success_response
from app.core.security import get_user_id
from app.services import analysis_service

router = APIRouter(prefix="/analyses", tags=["analyses"])


@router.post("/image")
async def create_image_analysis(
    file: UploadFile = File(...),
    consent: bool = Form(True),
    user_id: str = Depends(get_user_id),
):
    data = await analysis_service.create_media_analysis(user_id, "image", file, consent)
    return success_response(data, status_code=201)


@router.post("/video")
async def create_video_analysis(
    file: UploadFile = File(...),
    consent: bool = Form(True),
    user_id: str = Depends(get_user_id),
):
    data = await analysis_service.create_media_analysis(user_id, "video", file, consent)
    return success_response(data, status_code=201)


@router.get("/{analysis_id}")
def get_analysis(analysis_id: str, user_id: str = Depends(get_user_id)):
    return success_response(analysis_service.get_analysis(user_id, analysis_id))


@router.get("/{analysis_id}/status")
def get_status(analysis_id: str, user_id: str = Depends(get_user_id)):
    return success_response(analysis_service.get_status(user_id, analysis_id))


@router.get("/{analysis_id}/report")
def get_report(analysis_id: str, user_id: str = Depends(get_user_id)):
    return success_response(analysis_service.get_report(user_id, analysis_id))


@router.post("/{analysis_id}/retry")
def retry(analysis_id: str, user_id: str = Depends(get_user_id)):
    return success_response(analysis_service.retry_analysis(user_id, analysis_id))


@router.post("/{analysis_id}/cancel")
def cancel(analysis_id: str, user_id: str = Depends(get_user_id)):
    return success_response(analysis_service.cancel_analysis(user_id, analysis_id))


@router.delete("/{analysis_id}")
def delete(analysis_id: str, user_id: str = Depends(get_user_id)):
    analysis_service.delete_analysis(user_id, analysis_id)
    return success_response({"deleted": True})
