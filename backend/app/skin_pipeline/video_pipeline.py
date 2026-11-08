"""Video frame sampling and selection."""

from pathlib import Path
from typing import Any

from app.skin_pipeline.legacy import prepare_video_mode, load_face_detector


def prepare_video(
    video_path: Path,
    candidate_count: int = 20,
    max_frames: int = 4,
    save_frames: bool = True,
    output_dir: Path | None = None,
) -> tuple[list[str], list[Any], list[Any]]:
    detector = load_face_detector()
    out = output_dir or video_path.parent
    return prepare_video_mode(
        video_path=video_path,
        detector=detector,
        candidate_count=candidate_count,
        max_frames=max_frames,
        save_frames=save_frames,
        output_dir=out,
    )
