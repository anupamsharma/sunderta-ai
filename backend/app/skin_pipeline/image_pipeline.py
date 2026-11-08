"""Image analysis preparation."""

from pathlib import Path
from typing import Any

from app.skin_pipeline.legacy import prepare_image_mode, load_face_detector


def prepare_image(image_path: Path) -> tuple[list[str], list[Any]]:
    detector = load_face_detector()
    return prepare_image_mode(image_path=image_path, detector=detector)
