from __future__ import annotations

from typing import Any, Optional

from fastapi import HTTPException

from app.db.mongo import get_db


def list_products(
    category: Optional[str] = None,
    concern: Optional[str] = None,
    skin_type: Optional[str] = None,
    max_price: Optional[float] = None,
    q: Optional[str] = None,
) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if category:
        query["category"] = category
    if concern:
        query["concern"] = concern
    if skin_type:
        query["skinTypes"] = skin_type
    if max_price is not None:
        query["priceValue"] = {"$lte": max_price}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}},
        ]
    items = []
    for doc in get_db().products.find(query).sort("rating", -1):
        items.append(_to_out(doc))
    return items


def get_product(product_id: str) -> dict[str, Any]:
    doc = get_db().products.find_one({"product_id": product_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return _to_out(doc)


def _to_out(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": doc.get("product_id"),
        "brand": doc.get("brand"),
        "name": doc.get("name"),
        "category": doc.get("category"),
        "price": doc.get("price"),
        "rating": doc.get("rating"),
        "image": doc.get("image"),
        "tags": doc.get("tags") or [],
        "reason": doc.get("reason") or "",
        "ingredients": doc.get("ingredients") or [],
        "fragranceFree": bool(doc.get("fragranceFree")),
        "vegan": bool(doc.get("vegan")),
        "concern": doc.get("concern") or "",
        "skinTypes": doc.get("skinTypes") or [],
        "priceValue": float(doc.get("priceValue") or 0),
    }
