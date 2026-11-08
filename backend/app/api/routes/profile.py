from fastapi import APIRouter, Depends

from app.core.responses import success_response
from app.core.security import get_user_id
from app.schemas.profile import ProfileUpdate
from app.services import profile_service

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def get_profile(user_id: str = Depends(get_user_id)):
    return success_response(profile_service.get_profile(user_id))


@router.put("")
def put_profile(body: ProfileUpdate, user_id: str = Depends(get_user_id)):
    return success_response(profile_service.update_profile(user_id, body.model_dump()))


@router.delete("/data")
def delete_data(user_id: str = Depends(get_user_id)):
    return success_response(profile_service.delete_all_user_data(user_id))
