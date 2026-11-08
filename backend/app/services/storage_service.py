from __future__ import annotations

import uuid
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings
from app.core.security import safe_join


class MediaStorage(Protocol):
    def save(self, user_id: str, analysis_id: str, original_name: str, data: bytes, content_type: str) -> str: ...
    def delete(self, relative_path: str) -> None: ...
    def exists(self, relative_path: str) -> bool: ...
    def absolute_path(self, relative_path: str) -> Path: ...
    def delete_analysis_dir(self, user_id: str, analysis_id: str) -> None: ...


class LocalMediaStorage:
    def __init__(self, root: str | None = None) -> None:
        self.root = Path(root or get_settings().upload_root)
        self.root.mkdir(parents=True, exist_ok=True)

    def save(self, user_id: str, analysis_id: str, original_name: str, data: bytes, content_type: str) -> str:
        ext = Path(original_name).suffix.lower() or _ext_from_content_type(content_type)
        filename = f"{uuid.uuid4().hex}{ext}"
        dest_dir = safe_join(self.root, user_id, analysis_id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest = dest_dir / filename
        dest.write_bytes(data)
        return f"{user_id}/{analysis_id}/{filename}"

    def delete(self, relative_path: str) -> None:
        path = self.absolute_path(relative_path)
        if path.exists() and path.is_file():
            path.unlink()

    def exists(self, relative_path: str) -> bool:
        return self.absolute_path(relative_path).exists()

    def absolute_path(self, relative_path: str) -> Path:
        parts = Path(relative_path).parts
        return safe_join(self.root, *parts)

    def delete_analysis_dir(self, user_id: str, analysis_id: str) -> None:
        dest_dir = safe_join(self.root, user_id, analysis_id)
        if dest_dir.exists():
            for child in dest_dir.rglob("*"):
                if child.is_file():
                    child.unlink()
            for child in sorted(dest_dir.rglob("*"), reverse=True):
                if child.is_dir():
                    child.rmdir()
            dest_dir.rmdir()


def _ext_from_content_type(content_type: str) -> str:
    mapping = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/quicktime": ".mov",
        "video/webm": ".webm",
        "video/x-m4v": ".m4v",
    }
    return mapping.get(content_type, ".bin")


def get_storage() -> LocalMediaStorage:
    return LocalMediaStorage()
