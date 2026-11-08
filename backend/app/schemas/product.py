from typing import Optional
from pydantic import BaseModel


class ProductOut(BaseModel):
    id: str
    brand: str
    name: str
    category: str
    price: str
    rating: float
    image: str
    tags: list[str]
    reason: str
    ingredients: list[str]
    fragranceFree: bool
    vegan: bool
    concern: str
    skinTypes: list[str] = []
    priceValue: float = 0
