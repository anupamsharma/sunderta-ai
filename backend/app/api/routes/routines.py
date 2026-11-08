from fastapi import APIRouter, Depends

from app.core.responses import success_response
from app.core.security import get_user_id
from app.schemas.routine import AddProductToRoutineRequest, CompletionRequest
from app.services import product_service, routine_service

router = APIRouter(prefix="/routine", tags=["routine"])


@router.get("")
def get_routine(user_id: str = Depends(get_user_id)):
    return success_response(routine_service.get_routine(user_id))


@router.put("")
def put_routine(payload: dict, user_id: str = Depends(get_user_id)):
    return success_response(routine_service.put_routine(user_id, payload))


@router.post("/completions")
def save_completions(body: CompletionRequest, user_id: str = Depends(get_user_id)):
    return success_response(routine_service.save_completions(user_id, body.date, body.period, body.completed_steps))


@router.get("/completions")
def list_completions(user_id: str = Depends(get_user_id)):
    return success_response(routine_service.list_completions(user_id))


@router.post("/add-product")
def add_product(body: AddProductToRoutineRequest, user_id: str = Depends(get_user_id)):
    product = product_service.get_product(body.product_id)
    return success_response(routine_service.add_product_step(user_id, product, body.period))
