"""Idempotent product seed: python -m app.scripts.seed_products"""

from datetime import datetime, timezone

from app.db.indexes import ensure_indexes
from app.db.mongo import get_db

PRODUCTS = [
  {"product_id": "p1", "brand": "Minimalist", "name": "Niacinamide 10% + Zinc 1%", "category": "Serum", "price": "₹599", "priceValue": 599, "rating": 4.6, "image": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&auto=format", "tags": ["Acne-prone", "Oily T-zone"], "reason": "Targets visible acne and regulates sebum in your T-zone.", "ingredients": ["Niacinamide 10%", "Zinc PCA"], "fragranceFree": True, "vegan": True, "concern": "acne", "skinTypes": ["oily", "combination"]},
  {"product_id": "p2", "brand": "Dot & Key", "name": "Vitamin C + E Face Serum", "category": "Serum", "price": "₹795", "priceValue": 795, "rating": 4.4, "image": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300&h=300&fit=crop&auto=format", "tags": ["Brightening", "Pigmentation"], "reason": "Brightens uneven skin tone detected in your scan.", "ingredients": ["Vitamin C", "Vitamin E", "Hyaluronic Acid"], "fragranceFree": False, "vegan": True, "concern": "pigmentation", "skinTypes": ["combination", "balanced"]},
  {"product_id": "p3", "brand": "Neutrogena", "name": "Hydro Boost Water Gel", "category": "Moisturizer", "price": "₹875", "priceValue": 875, "rating": 4.7, "image": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=300&h=300&fit=crop&auto=format", "tags": ["Dry zones", "Combination skin"], "reason": "Lightweight gel hydrates cheek dry zones without adding oil.", "ingredients": ["Hyaluronic Acid", "Glycerin"], "fragranceFree": True, "vegan": False, "concern": "dryness", "skinTypes": ["dry", "combination"]},
  {"product_id": "p4", "brand": "Re'equil", "name": "Ultra Matte Dry Touch Sunscreen SPF 50", "category": "Sunscreen", "price": "₹525", "priceValue": 525, "rating": 4.5, "image": "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&h=300&fit=crop&auto=format", "tags": ["SPF 50", "Matte finish"], "reason": "Daily UV protection to prevent worsening of pigmentation.", "ingredients": ["Octinoxate", "Avobenzone", "Niacinamide"], "fragranceFree": True, "vegan": True, "concern": "pigmentation", "skinTypes": ["oily", "combination"]},
  {"product_id": "p5", "brand": "Plum", "name": "E-Luminence Eye Serum", "category": "Eye Cream", "price": "₹675", "priceValue": 675, "rating": 4.3, "image": "https://images.unsplash.com/photo-1607006483224-dfc695a14fcc?w=300&h=300&fit=crop&auto=format", "tags": ["Dark circles", "Puffiness"], "reason": "Addresses visible dark circles detected under-eye.", "ingredients": ["Caffeine", "Niacinamide", "Peptides"], "fragranceFree": True, "vegan": True, "concern": "darkcircles", "skinTypes": ["dry", "combination", "balanced"]},
  {"product_id": "p6", "brand": "Simple", "name": "Kind to Skin Moisturizing Facial Wash", "category": "Cleanser", "price": "₹349", "priceValue": 349, "rating": 4.5, "image": "https://images.unsplash.com/photo-1556228841-a3c527ebefe5?w=300&h=300&fit=crop&auto=format", "tags": ["Sensitive", "Fragrance-free"], "reason": "Gentle daily cleanser that respects your skin barrier.", "ingredients": ["Glycerin", "Panthenol", "Allantoin"], "fragranceFree": True, "vegan": True, "concern": "dryness", "skinTypes": ["dry", "sensitive", "combination"]},
  {"product_id": "p7", "brand": "The Ordinary", "name": "Salicylic Acid 2% Solution", "category": "Treatment", "price": "₹690", "priceValue": 690, "rating": 4.2, "image": "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=300&h=300&fit=crop&auto=format", "tags": ["Blemishes", "Exfoliating"], "reason": "Helps with the appearance of clogged pores and blemish-like spots.", "ingredients": ["Salicylic Acid 2%"], "fragranceFree": True, "vegan": True, "concern": "acne", "skinTypes": ["oily", "combination"]},
  {"product_id": "p8", "brand": "Cetaphil", "name": "Gentle Skin Cleanser", "category": "Cleanser", "price": "₹499", "priceValue": 499, "rating": 4.6, "image": "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300&h=300&fit=crop&auto=format", "tags": ["Barrier-friendly", "Daily"], "reason": "Mild cleanse option for sensitive or reactive-looking skin.", "ingredients": ["Glycerin", "Cetyl Alcohol"], "fragranceFree": True, "vegan": False, "concern": "dryness", "skinTypes": ["dry", "sensitive", "balanced"]},
]


def main() -> None:
    db = get_db()
    ensure_indexes(db)
    now = datetime.now(timezone.utc)
    for product in PRODUCTS:
        product = {**product, "updated_at": now}
        db.products.update_one(
            {"product_id": product["product_id"]},
            {"$set": product, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
    print(f"Seeded {len(PRODUCTS)} products")


if __name__ == "__main__":
    main()
