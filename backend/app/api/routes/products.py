from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.responses import success_response
from app.core.security import get_user_id
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("")
def list_products(
    category: Optional[str] = None,
    concern: Optional[str] = None,
    skin_type: Optional[str] = None,
    max_price: Optional[float] = None,
    q: Optional[str] = None,
    _: str = Depends(get_user_id),
):
    return success_response(product_service.list_products(category, concern, skin_type, max_price, q))


@router.get("/{product_id}")
def get_product(product_id: str, _: str = Depends(get_user_id)):
    return success_response(product_service.get_product(product_id))
