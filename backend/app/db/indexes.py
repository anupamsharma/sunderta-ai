from pymongo import ASCENDING, DESCENDING
from pymongo.database import Database


def ensure_indexes(db: Database) -> None:
    db.analyses.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.analyses.create_index([("user_id", ASCENDING), ("status", ASCENDING)])
    db.analyses.create_index([("status", ASCENDING), ("created_at", DESCENDING)])
    db.profiles.create_index("user_id", unique=True)
    db.routines.create_index("user_id", unique=True)
    db.routine_completions.create_index([("user_id", ASCENDING), ("date", ASCENDING)])
    db.products.create_index("product_id", unique=True)
    db.products.create_index([("category", ASCENDING), ("concern", ASCENDING)])
    db.conversations.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
    db.messages.create_index([("conversation_id", ASCENDING), ("created_at", ASCENDING)])
    db.comparisons.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    db.access_links.create_index("token", unique=True)
    db.access_links.create_index([("created_at", DESCENDING)])
