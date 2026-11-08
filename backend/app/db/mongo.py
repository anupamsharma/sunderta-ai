from functools import lru_cache
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database

from app.core.config import get_settings

_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = MongoClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
    return _client


def get_db() -> Database[Any]:
    settings = get_settings()
    return get_client()[settings.mongodb_database]


def close_client() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


@lru_cache
def ping_mongo() -> bool:
    get_client().admin.command("ping")
    return True
