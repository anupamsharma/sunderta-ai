#!/usr/bin/env python3
"""
Sunderta AI - Image and Video Skin Appearance Analyzer

Features
--------
1. Image mode:
   - Validates image quality.
   - Detects a face locally.
   - Sends the image to Azure OpenAI.
   - Saves a structured JSON report.

2. Video mode:
   - Samples frames throughout the video.
   - Scores frames for face size, centering, brightness and sharpness.
   - Removes near-duplicate frames.
   - Selects up to N high-quality frames.
   - Sends selected frames together to Azure OpenAI.
   - Saves a consolidated structured JSON report.

Important
---------
This produces cosmetic observations from visible image characteristics.
It must not be presented as medical diagnosis or clinical measurement.
"""

from __future__ import annotations

import argparse
import base64
import json
import logging
import math
import mimetypes
import os
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Optional, Sequence

import cv2
import numpy as np
from dotenv import load_dotenv
from openai import AzureOpenAI

load_dotenv()

LOGGER = logging.getLogger("skin_analyzer")

SUPPORTED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}

SUPPORTED_VIDEO_EXTENSIONS = {
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".webm",
    ".m4v",
}

DEFAULT_SYSTEM_PROMPT = """
You are the visual analysis component of Sunderta AI, a cosmetic skincare
guidance application.

Analyze only characteristics that are reasonably visible in the supplied
images. The images may be multiple frames of the same person from one short
video.

Rules:

1. Do not identify the person.
2. Do not infer race, ethnicity, religion, health history or other sensitive
   personal attributes.
3. Do not diagnose acne, rosacea, eczema, infection, skin cancer or any other
   medical condition.
4. You may use careful appearance-oriented language such as:
   - visible blemish-like spots
   - apparent redness
   - apparent dryness
   - visible uneven tone
   - dark-circle appearance
   - visible fine lines
   - surface texture appearance
5. Scores are cosmetic presentation estimates, not clinical measurements.
6. Consider lighting, shadows, camera quality, compression and makeup as
   possible limitations.
7. When several frames are supplied, consolidate them into one assessment.
   Do not count the same feature multiple times merely because it appears in
   several frames.
8. Prefer observations that are consistent across multiple frames.
9. If evidence is weak, set confidence to "low" and explain the limitation.
10. Product guidance should describe product categories and ingredients,
    rather than claiming that a product will cure a condition.
11. Recommend consulting a qualified dermatologist for persistent, painful,
    sudden, severe or medically concerning changes.
12. Return only valid JSON matching the requested structure. Do not surround
    the JSON with Markdown fences.
""".strip()


ANALYSIS_PROMPT = """
Review the supplied face image or selected video frames and return one
consolidated cosmetic skin-appearance report.

Use this exact JSON structure:

{
  "analysis_status": "completed",
  "input_summary": {
    "number_of_images_reviewed": 0,
    "view_consistency": "high | medium | low",
    "general_image_quality": "good | acceptable | limited"
  },
  "quality_assessment": {
    "lighting": {
      "rating": "good | acceptable | poor",
      "explanation": ""
    },
    "sharpness": {
      "rating": "good | acceptable | poor",
      "explanation": ""
    },
    "face_position": {
      "rating": "good | acceptable | poor",
      "explanation": ""
    },
    "makeup_or_filter_interference": {
      "rating": "unlikely | possible | likely | unknown",
      "explanation": ""
    },
    "limitations": []
  },
  "skin_profile": {
    "apparent_skin_type": "dry | oily | combination | balanced | uncertain",
    "confidence": "high | medium | low",
    "explanation": ""
  },
  "scores": {
    "overall_skin_appearance": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    },
    "hydration_appearance": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    },
    "texture_appearance": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    },
    "tone_evenness": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    },
    "clarity": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    },
    "dark_circle_appearance": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    },
    "fine_line_appearance": {
      "score": 0,
      "confidence": "high | medium | low",
      "explanation": ""
    }
  },
  "visible_observations": [
    {
      "name": "",
      "category": "blemishes | redness | dryness | oiliness | pigmentation | dark_circles | fine_lines | texture | other",
      "severity": "none | mild | moderate | prominent | uncertain",
      "confidence": "high | medium | low",
      "regions": [],
      "observation": "",
      "possible_image_artifact": false
    }
  ],
  "strengths": [
    {
      "name": "",
      "confidence": "high | medium | low",
      "explanation": ""
    }
  ],
  "routine": {
    "morning": [
      {
        "step": 1,
        "category": "",
        "suggested_ingredients": [],
        "reason": "",
        "usage_guidance": ""
      }
    ],
    "night": [
      {
        "step": 1,
        "category": "",
        "suggested_ingredients": [],
        "reason": "",
        "usage_guidance": ""
      }
    ],
    "weekly_or_optional": []
  },
  "ingredient_guidance": {
    "potentially_helpful": [
      {
        "ingredient": "",
        "reason": "",
        "caution": ""
      }
    ],
    "use_with_care": [
      {
        "ingredient": "",
        "reason": ""
      }
    ]
  },
  "professional_guidance": {
    "dermatologist_consultation_recommended": false,
    "reason": ""
  },
  "summary": "",
  "disclaimer": "This report provides cosmetic skincare guidance based on visible image characteristics. It is not a medical diagnosis or clinical measurement. Results may be affected by lighting, camera quality, makeup, filters and image compression."
}

Requirements:

- Every numeric score must be an integer from 0 to 100.
- A higher score must always mean a more favourable visible appearance.
- Do not fabricate exact moisture percentages, pore measurements or biological
  values.
- Keep the recommendations conservative and suitable for a general consumer.
- Mention patch testing when suggesting active ingredients.
- Return an empty array when there is no reliable observation for a section.
""".strip()


@dataclass
class FrameQuality:
    frame_index: int
    timestamp_seconds: float
    width: int
    height: int

    face_detected: bool
    face_count: int
    face_area_ratio: float
    face_center_score: float

    brightness_mean: float
    brightness_score: float

    sharpness_variance: float
    sharpness_score: float

    exposure_score: float
    resolution_score: float

    total_score: float

    selected: bool = False
    saved_path: Optional[str] = None


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Analyze a face image or short face video using Azure OpenAI."
        )
    )

    parser.add_argument(
        "--mode",
        required=True,
        choices=("image", "video"),
        help="Input mode.",
    )

    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Path to an image or video file.",
    )

    parser.add_argument(
        "--output",
        type=Path,
        default=Path("skin_report.json"),
        help="Path of the generated JSON report.",
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("skin_analysis_output"),
        help="Directory for selected frames and diagnostic metadata.",
    )

    parser.add_argument(
        "--max-frames",
        type=int,
        default=4,
        help="Maximum video frames sent to Azure OpenAI.",
    )

    parser.add_argument(
        "--candidate-frames",
        type=int,
        default=20,
        help="Approximate number of video frames sampled before selection.",
    )

    parser.add_argument(
        "--detail",
        choices=("low", "high", "auto"),
        default="high",
        help="Image detail value sent to the vision model.",
    )

    parser.add_argument(
        "--save-selected-frames",
        action="store_true",
        help="Save frames selected from video.",
    )

    parser.add_argument(
        "--deployment",
        default=os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-5.4"),
        help="Azure OpenAI deployment name.",
    )

    parser.add_argument(
        "--api-version",
        default=os.getenv(
            "AZURE_OPENAI_API_VERSION",
            "2024-12-01-preview",
        ),
        help="Azure OpenAI API version.",
    )

    parser.add_argument(
        "--endpoint",
        default=os.getenv(
            "AZURE_OPENAI_ENDPOINT",
            "https://india-west-az-ai.openai.azure.com/",
        ),
        help="Azure OpenAI endpoint.",
    )

    parser.add_argument(
        "--max-completion-tokens",
        type=int,
        default=8000,
        help="Maximum completion tokens.",
    )

    parser.add_argument(
        "--debug",
        action="store_true",
        help="Enable detailed logging.",
    )

    args = parser.parse_args()

    if not 1 <= args.max_frames <= 10:
        parser.error("--max-frames must be between 1 and 10.")

    if not 4 <= args.candidate_frames <= 100:
        parser.error("--candidate-frames must be between 4 and 100.")

    return args


def configure_logging(debug: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
    )


def validate_input_file(path: Path, mode: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Input file does not exist: {path}")

    if not path.is_file():
        raise ValueError(f"Input path is not a file: {path}")

    extension = path.suffix.lower()

    if mode == "image" and extension not in SUPPORTED_IMAGE_EXTENSIONS:
        raise ValueError(
            f"Unsupported image extension '{extension}'. "
            f"Supported: {sorted(SUPPORTED_IMAGE_EXTENSIONS)}"
        )

    if mode == "video" and extension not in SUPPORTED_VIDEO_EXTENSIONS:
        raise ValueError(
            f"Unsupported video extension '{extension}'. "
            f"Supported: {sorted(SUPPORTED_VIDEO_EXTENSIONS)}"
        )


def create_azure_client(
    endpoint: str,
    api_version: str,
) -> AzureOpenAI:
    LOGGER.info("Creating Azure OpenAI client (endpoint=%s, api_version=%s).", endpoint, api_version)
    api_key = os.getenv("AZURE_OPENAI_API_KEY")

    if not api_key:
        raise EnvironmentError(
            "AZURE_OPENAI_API_KEY is not set. "
            "Set it before running the script."
        )

    LOGGER.info("Azure OpenAI API key loaded from environment.")
    return AzureOpenAI(
        api_version=api_version,
        azure_endpoint=endpoint,
        api_key=api_key,
    )


def load_face_detector() -> cv2.CascadeClassifier:
    LOGGER.info("Loading OpenCV face detector (OpenCV %s).", cv2.__version__)
    cascade_path = (
        Path(cv2.data.haarcascades)
        / "haarcascade_frontalface_default.xml"
    )

    detector = cv2.CascadeClassifier(str(cascade_path))

    if detector.empty():
        raise RuntimeError(
            f"Could not load OpenCV face cascade: {cascade_path}"
        )

    LOGGER.info("Face cascade loaded from %s.", cascade_path)
    return detector


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def triangular_score(
    value: float,
    lower: float,
    ideal: float,
    upper: float,
) -> float:
    """
    Returns a score from 0 to 1.

    Score rises linearly from lower to ideal and declines linearly from
    ideal to upper.
    """
    if value <= lower or value >= upper:
        return 0.0

    if value == ideal:
        return 1.0

    if value < ideal:
        return (value - lower) / (ideal - lower)

    return (upper - value) / (upper - ideal)


def calculate_resolution_score(width: int, height: int) -> float:
    minimum_dimension = min(width, height)

    if minimum_dimension >= 1080:
        return 1.0
    if minimum_dimension >= 720:
        return 0.85
    if minimum_dimension >= 480:
        return 0.65
    if minimum_dimension >= 320:
        return 0.4

    return 0.15


def calculate_sharpness(gray: np.ndarray) -> tuple[float, float]:
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Smoothly maps approximately:
    # 30 -> low, 100 -> acceptable, 250+ -> strong.
    score = 1.0 - math.exp(-variance / 140.0)

    return variance, clamp(score, 0.0, 1.0)


def calculate_brightness(gray: np.ndarray) -> tuple[float, float]:
    brightness = float(np.mean(gray))

    # Broad optimum near 145 on a scale from 0 to 255.
    score = triangular_score(
        value=brightness,
        lower=35.0,
        ideal=145.0,
        upper=245.0,
    )

    return brightness, clamp(score, 0.0, 1.0)


def calculate_exposure_score(gray: np.ndarray) -> float:
    dark_fraction = float(np.mean(gray < 20))
    bright_fraction = float(np.mean(gray > 245))

    clipped_fraction = dark_fraction + bright_fraction

    return clamp(1.0 - (clipped_fraction * 2.5), 0.0, 1.0)


def detect_faces(
    frame_bgr: np.ndarray,
    detector: cv2.CascadeClassifier,
) -> list[tuple[int, int, int, int]]:
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)

    faces = detector.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(80, 80),
    )

    return [tuple(map(int, face)) for face in faces]


def largest_face(
    faces: Sequence[tuple[int, int, int, int]],
) -> Optional[tuple[int, int, int, int]]:
    if not faces:
        return None

    return max(faces, key=lambda item: item[2] * item[3])


def calculate_face_center_score(
    face: tuple[int, int, int, int],
    image_width: int,
    image_height: int,
) -> float:
    x, y, width, height = face

    face_center_x = x + width / 2.0
    face_center_y = y + height / 2.0

    image_center_x = image_width / 2.0
    image_center_y = image_height / 2.0

    normalized_x = abs(face_center_x - image_center_x) / image_center_x
    normalized_y = abs(face_center_y - image_center_y) / image_center_y

    distance = math.sqrt(
        (normalized_x * normalized_x)
        + (normalized_y * normalized_y)
    )

    return clamp(1.0 - distance, 0.0, 1.0)


def score_frame(
    frame_bgr: np.ndarray,
    frame_index: int,
    timestamp_seconds: float,
    detector: cv2.CascadeClassifier,
) -> FrameQuality:
    if frame_bgr is None or frame_bgr.size == 0:
        raise ValueError("Cannot score an empty frame.")

    height, width = frame_bgr.shape[:2]
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)

    brightness_mean, brightness_score = calculate_brightness(gray)
    sharpness_variance, sharpness_score = calculate_sharpness(gray)
    exposure_score = calculate_exposure_score(gray)
    resolution_score = calculate_resolution_score(width, height)

    faces = detect_faces(frame_bgr, detector)
    primary_face = largest_face(faces)

    face_detected = primary_face is not None
    face_area_ratio = 0.0
    face_center_score = 0.0

    if primary_face is not None:
        x, y, face_width, face_height = primary_face

        face_area_ratio = (
            float(face_width * face_height)
            / float(width * height)
        )

        face_center_score = calculate_face_center_score(
            primary_face,
            width,
            height,
        )

    # A close but not excessively cropped face is preferred.
    face_size_score = triangular_score(
        value=face_area_ratio,
        lower=0.025,
        ideal=0.28,
        upper=0.75,
    )

    face_presence_score = 1.0 if face_detected else 0.0

    # Weighted quality score.
    total_score = (
        0.25 * sharpness_score
        + 0.15 * brightness_score
        + 0.10 * exposure_score
        + 0.10 * resolution_score
        + 0.15 * face_presence_score
        + 0.15 * face_size_score
        + 0.10 * face_center_score
    )

    # Penalize frames with no face and frames with multiple detected faces.
    if not face_detected:
        total_score *= 0.35

    if len(faces) > 1:
        total_score *= 0.70

    return FrameQuality(
        frame_index=frame_index,
        timestamp_seconds=round(timestamp_seconds, 3),
        width=width,
        height=height,
        face_detected=face_detected,
        face_count=len(faces),
        face_area_ratio=round(face_area_ratio, 4),
        face_center_score=round(face_center_score, 4),
        brightness_mean=round(brightness_mean, 2),
        brightness_score=round(brightness_score, 4),
        sharpness_variance=round(sharpness_variance, 2),
        sharpness_score=round(sharpness_score, 4),
        exposure_score=round(exposure_score, 4),
        resolution_score=round(resolution_score, 4),
        total_score=round(clamp(total_score, 0.0, 1.0), 4),
    )


def image_signature(frame_bgr: np.ndarray) -> np.ndarray:
    """
    Creates a compact normalized grayscale signature for duplicate detection.
    """
    gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
    resized = cv2.resize(gray, (32, 32), interpolation=cv2.INTER_AREA)

    signature = resized.astype(np.float32)
    signature -= float(signature.mean())

    standard_deviation = float(signature.std())

    if standard_deviation > 1e-6:
        signature /= standard_deviation

    return signature


def signature_similarity(
    first: np.ndarray,
    second: np.ndarray,
) -> float:
    first_flat = first.flatten()
    second_flat = second.flatten()

    denominator = (
        np.linalg.norm(first_flat)
        * np.linalg.norm(second_flat)
    )

    if denominator <= 1e-8:
        return 1.0

    similarity = float(
        np.dot(first_flat, second_flat) / denominator
    )

    return clamp(similarity, -1.0, 1.0)


def sample_video_frames(
    video_path: Path,
    candidate_count: int,
    detector: cv2.CascadeClassifier,
) -> list[tuple[np.ndarray, FrameQuality]]:
    capture = cv2.VideoCapture(str(video_path))

    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    try:
        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = float(capture.get(cv2.CAP_PROP_FPS))

        if fps <= 0 or not math.isfinite(fps):
            fps = 30.0

        if total_frames <= 0:
            raise RuntimeError(
                "Video reports zero frames or an unreadable frame count."
            )

        sample_count = min(candidate_count, total_frames)

        # Avoid the first and final few percent where capture movement is common.
        start_frame = int(total_frames * 0.05)
        end_frame = max(start_frame, int(total_frames * 0.95) - 1)

        frame_indices = np.linspace(
            start_frame,
            end_frame,
            num=sample_count,
            dtype=int,
        )

        frame_indices = sorted(set(int(i) for i in frame_indices))

        LOGGER.info(
            "Sampling %d candidate frame(s) from %d total (fps=%.1f).",
            len(frame_indices),
            total_frames,
            fps,
        )

        candidates: list[tuple[np.ndarray, FrameQuality]] = []

        for sample_number, frame_index in enumerate(frame_indices, start=1):
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            success, frame = capture.read()

            if not success or frame is None:
                LOGGER.warning(
                    "Could not read video frame %s.",
                    frame_index,
                )
                continue

            timestamp_seconds = frame_index / fps

            quality = score_frame(
                frame_bgr=frame,
                frame_index=frame_index,
                timestamp_seconds=timestamp_seconds,
                detector=detector,
            )

            candidates.append((frame, quality))
            LOGGER.info(
                "Candidate %d/%d: frame=%d t=%.2fs score=%.3f faces=%d",
                sample_number,
                len(frame_indices),
                frame_index,
                timestamp_seconds,
                quality.total_score,
                quality.face_count,
            )

        if not candidates:
            raise RuntimeError(
                "No usable frames could be extracted from the video."
            )

        LOGGER.info("Extracted %d usable candidate frame(s).", len(candidates))
        return candidates

    finally:
        capture.release()


def select_diverse_frames(
    candidates: list[tuple[np.ndarray, FrameQuality]],
    max_frames: int,
    duplicate_threshold: float = 0.985,
) -> list[tuple[np.ndarray, FrameQuality]]:
    """
    Selects high-quality, visually distinct frames.

    The score rewards local quality. Near-identical frames are skipped.
    Temporal spread is also encouraged when quality is similar.
    """
    sorted_candidates = sorted(
        candidates,
        key=lambda item: item[1].total_score,
        reverse=True,
    )

    selected: list[tuple[np.ndarray, FrameQuality]] = []
    selected_signatures: list[np.ndarray] = []

    for frame, quality in sorted_candidates:
        if len(selected) >= max_frames:
            break

        # Prefer frames with exactly one detectable face.
        if quality.face_count != 1:
            continue

        signature = image_signature(frame)

        is_duplicate = any(
            signature_similarity(signature, previous)
            >= duplicate_threshold
            for previous in selected_signatures
        )

        if is_duplicate:
            continue

        quality.selected = True
        selected.append((frame, quality))
        selected_signatures.append(signature)

    # If strict face detection or duplicate filtering leaves too few frames,
    # fill the remaining positions with the best available candidates.
    if len(selected) < max_frames:
        selected_indices = {
            quality.frame_index
            for _, quality in selected
        }

        for frame, quality in sorted_candidates:
            if len(selected) >= max_frames:
                break

            if quality.frame_index in selected_indices:
                continue

            quality.selected = True
            selected.append((frame, quality))
            selected_indices.add(quality.frame_index)

    return sorted(
        selected,
        key=lambda item: item[1].timestamp_seconds,
    )


def resize_for_model(
    frame_bgr: np.ndarray,
    max_edge: int = 1280,
) -> np.ndarray:
    """Downscale large frames before JPEG encoding for Azure OpenAI."""
    if frame_bgr is None or frame_bgr.size == 0:
        raise ValueError("Cannot resize an empty frame.")

    height, width = frame_bgr.shape[:2]
    longest = max(width, height)
    if longest <= max_edge:
        return frame_bgr

    scale = max_edge / float(longest)
    new_width = max(1, int(round(width * scale)))
    new_height = max(1, int(round(height * scale)))
    return cv2.resize(frame_bgr, (new_width, new_height), interpolation=cv2.INTER_AREA)


def encode_frame_as_jpeg_data_url(
    frame_bgr: np.ndarray,
    jpeg_quality: int = 75,
    max_edge: int = 1280,
) -> str:
    compressed = resize_for_model(frame_bgr, max_edge=max_edge)
    success, buffer = cv2.imencode(
        ".jpg",
        compressed,
        [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality],
    )

    if not success:
        raise RuntimeError("Could not encode frame as JPEG.")

    encoded = base64.b64encode(buffer.tobytes()).decode("ascii")
    LOGGER.debug(
        "Encoded frame JPEG: %dx%d -> %d bytes (quality=%d)",
        compressed.shape[1],
        compressed.shape[0],
        len(buffer),
        jpeg_quality,
    )
    return f"data:image/jpeg;base64,{encoded}"


def encode_image_file_as_data_url(
    path: Path,
    jpeg_quality: int = 75,
    max_edge: int = 1280,
) -> str:
    """Always re-encode as compressed JPEG for model upload (smaller payload)."""
    image = cv2.imread(str(path))
    if image is None:
        # Fall back to raw bytes only if OpenCV cannot decode.
        mime_type, _ = mimetypes.guess_type(str(path))
        if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
            mime_type = "image/jpeg"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    return encode_frame_as_jpeg_data_url(
        image,
        jpeg_quality=jpeg_quality,
        max_edge=max_edge,
    )




def save_selected_frames(
    selected_frames: list[tuple[np.ndarray, FrameQuality]],
    output_dir: Path,
) -> None:
    frames_dir = output_dir / "selected_frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    for sequence, (frame, quality) in enumerate(
        selected_frames,
        start=1,
    ):
        filename = (
            f"selected_{sequence:02d}"
            f"_t{quality.timestamp_seconds:.2f}"
            f"_score{quality.total_score:.3f}.jpg"
        )

        output_path = frames_dir / filename

        success = cv2.imwrite(
            str(output_path),
            resize_for_model(frame, max_edge=1280),
            [int(cv2.IMWRITE_JPEG_QUALITY), 80],
        )

        if not success:
            raise RuntimeError(
                f"Could not save selected frame: {output_path}"
            )

        quality.saved_path = str(output_path)
        LOGGER.info("Saved selected frame: %s", output_path)


def prepare_image_mode(
    image_path: Path,
    detector: cv2.CascadeClassifier,
) -> tuple[list[str], list[FrameQuality]]:
    LOGGER.info("Image mode: reading %s", image_path)
    image = cv2.imread(str(image_path))

    if image is None:
        raise RuntimeError(f"Could not decode image: {image_path}")

    height, width = image.shape[:2]
    LOGGER.info("Image loaded (%dx%d). Detecting face and scoring quality...", width, height)

    quality = score_frame(
        frame_bgr=image,
        frame_index=0,
        timestamp_seconds=0.0,
        detector=detector,
    )
    quality.selected = True

    LOGGER.info(
        "Image quality: score=%.3f faces=%d sharpness=%.1f brightness=%.1f",
        quality.total_score,
        quality.face_count,
        quality.sharpness_variance,
        quality.brightness_mean,
    )
    LOGGER.info("Encoding compressed JPEG for Azure OpenAI...")

    return [encode_image_file_as_data_url(image_path)], [quality]


def prepare_video_mode(
    video_path: Path,
    detector: cv2.CascadeClassifier,
    candidate_count: int,
    max_frames: int,
    save_frames: bool,
    output_dir: Path,
) -> tuple[list[str], list[FrameQuality], list[FrameQuality]]:
    LOGGER.info(
        "Video mode: sampling up to %d candidates from %s (max selected=%d)",
        candidate_count,
        video_path,
        max_frames,
    )
    candidates = sample_video_frames(
        video_path=video_path,
        candidate_count=candidate_count,
        detector=detector,
    )

    LOGGER.info("Selecting best diverse frames...")
    selected = select_diverse_frames(
        candidates=candidates,
        max_frames=max_frames,
    )

    if not selected:
        raise RuntimeError("No suitable video frames were selected.")

    LOGGER.info("Selected %d frame(s) of %d candidates.", len(selected), len(candidates))

    if save_frames:
        LOGGER.info("Saving selected frames to %s/selected_frames", output_dir)
        save_selected_frames(selected, output_dir)

    LOGGER.info("Encoding selected frames as compressed JPEGs for Azure OpenAI...")
    image_urls = [
        encode_frame_as_jpeg_data_url(frame, jpeg_quality=75, max_edge=1280)
        for frame, _ in selected
    ]

    selected_quality = [
        quality
        for _, quality in selected
    ]

    all_quality = [
        quality
        for _, quality in candidates
    ]

    return image_urls, selected_quality, all_quality


def summarize_local_quality(
    selected_quality: Sequence[FrameQuality],
) -> dict[str, Any]:
    if not selected_quality:
        return {}

    average = lambda values: round(float(np.mean(values)), 4)

    return {
        "selected_frame_count": len(selected_quality),
        "average_total_score": average(
            [item.total_score for item in selected_quality]
        ),
        "average_sharpness_score": average(
            [item.sharpness_score for item in selected_quality]
        ),
        "average_brightness_score": average(
            [item.brightness_score for item in selected_quality]
        ),
        "average_face_center_score": average(
            [item.face_center_score for item in selected_quality]
        ),
        "all_selected_frames_have_face": all(
            item.face_detected for item in selected_quality
        ),
        "all_selected_frames_have_single_face": all(
            item.face_count == 1 for item in selected_quality
        ),
    }


def create_multimodal_content(
    image_data_urls: Sequence[str],
    detail: str,
    local_quality_summary: dict[str, Any],
) -> list[dict[str, Any]]:
    text_prompt = (
        ANALYSIS_PROMPT
        + "\n\nLocal image-quality metadata generated before model analysis:\n"
        + json.dumps(local_quality_summary, indent=2)
        + "\n\nTreat this metadata only as supporting quality information. "
          "Perform the cosmetic visual assessment from the actual images."
    )

    content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": text_prompt,
        }
    ]

    for sequence, data_url in enumerate(image_data_urls, start=1):
        content.append(
            {
                "type": "text",
                "text": f"Image/frame {sequence}:",
            }
        )
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": data_url,
                    "detail": detail,
                },
            }
        )

    return content


def extract_json_object(text: str) -> dict[str, Any]:
    cleaned = text.strip()

    if cleaned.startswith("```"):
        lines = cleaned.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        cleaned = "\n".join(lines).strip()

        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].lstrip()

    try:
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1 or end <= start:
            raise ValueError(
                "Azure OpenAI response did not contain a valid JSON object."
            )

        result = json.loads(cleaned[start : end + 1])

    if not isinstance(result, dict):
        raise ValueError(
            "Azure OpenAI response JSON must be an object."
        )

    return result


def analyze_with_azure_openai(
    client: AzureOpenAI,
    deployment: str,
    image_data_urls: Sequence[str],
    detail: str,
    local_quality_summary: dict[str, Any],
    max_completion_tokens: int,
) -> dict[str, Any]:
    content = create_multimodal_content(
        image_data_urls=image_data_urls,
        detail=detail,
        local_quality_summary=local_quality_summary,
    )

    LOGGER.info(
        "Sending %d image(s) to Azure OpenAI deployment '%s' (max_tokens=%d)...",
        len(image_data_urls),
        deployment,
        max_completion_tokens,
    )

    request: dict[str, Any] = {
        "model": deployment,
        "messages": [
            {
                "role": "system",
                "content": DEFAULT_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": content,
            },
        ],
        "max_completion_tokens": max_completion_tokens,
    }

    # JSON mode is useful where supported by the chosen deployment/API.
    # If a deployment rejects it, retry without response_format.
    try:
        LOGGER.info("Calling Azure OpenAI (JSON response format)...")
        response = client.chat.completions.create(
            **request,
            response_format={"type": "json_object"},
        )
    except Exception as error:
        LOGGER.warning(
            "Request with JSON response_format failed: %s",
            error,
        )
        LOGGER.info(
            "Retrying without response_format while retaining JSON instructions."
        )
        response = client.chat.completions.create(**request)

    LOGGER.info("Azure OpenAI response received. Parsing JSON report...")
    message_content = response.choices[0].message.content

    if not message_content:
        raise RuntimeError("Azure OpenAI returned an empty response.")

    report = extract_json_object(message_content)
    LOGGER.info("Report JSON parsed successfully.")

    report["_model_metadata"] = {
        "deployment": deployment,
        "response_id": getattr(response, "id", None),
        "model": getattr(response, "model", None),
        "finish_reason": response.choices[0].finish_reason,
        "usage": (
            response.usage.model_dump()
            if response.usage is not None
            else None
        ),
    }

    return report


def write_json(path: Path, content: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    temporary_path = path.with_suffix(path.suffix + ".tmp")

    temporary_path.write_text(
        json.dumps(
            content,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    temporary_path.replace(path)


def build_diagnostics(
    mode: str,
    input_path: Path,
    selected_quality: Sequence[FrameQuality],
    all_quality: Sequence[FrameQuality],
) -> dict[str, Any]:
    return {
        "mode": mode,
        "input_path": str(input_path),
        "selected_frames": [
            asdict(item)
            for item in selected_quality
        ],
        "all_candidate_frames": [
            asdict(item)
            for item in all_quality
        ],
        "local_quality_summary": summarize_local_quality(
            selected_quality
        ),
    }


def run(args: argparse.Namespace) -> int:
    LOGGER.info("=" * 60)
    LOGGER.info("Sunderta AI Skin Analyzer starting")
    LOGGER.info("Mode: %s | Input: %s | Output: %s", args.mode, args.input, args.output)
    LOGGER.info("=" * 60)

    LOGGER.info("Validating input file...")
    validate_input_file(args.input, args.mode)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    LOGGER.info("Output directory ready: %s", args.output_dir)

    detector = load_face_detector()

    if args.mode == "image":
        image_data_urls, selected_quality = prepare_image_mode(
            image_path=args.input,
            detector=detector,
        )
        all_quality = list(selected_quality)

    else:
        (
            image_data_urls,
            selected_quality,
            all_quality,
        ) = prepare_video_mode(
            video_path=args.input,
            detector=detector,
            candidate_count=args.candidate_frames,
            max_frames=args.max_frames,
            save_frames=args.save_selected_frames,
            output_dir=args.output_dir,
        )

    LOGGER.info("Building diagnostics summary...")
    diagnostics = build_diagnostics(
        mode=args.mode,
        input_path=args.input,
        selected_quality=selected_quality,
        all_quality=all_quality,
    )

    diagnostics_path = args.output_dir / "diagnostics.json"
    write_json(diagnostics_path, diagnostics)
    LOGGER.info("Diagnostics written to: %s", diagnostics_path)

    LOGGER.info(
        "Selected %d image/frame(s).",
        len(selected_quality),
    )

    for item in selected_quality:
        LOGGER.info(
            (
                "Selected frame=%d time=%.2fs score=%.3f "
                "face_count=%d sharpness=%.1f brightness=%.1f"
            ),
            item.frame_index,
            item.timestamp_seconds,
            item.total_score,
            item.face_count,
            item.sharpness_variance,
            item.brightness_mean,
        )

    client = create_azure_client(
        endpoint=args.endpoint,
        api_version=args.api_version,
    )

    LOGGER.info("Starting Azure OpenAI skin analysis...")
    report = analyze_with_azure_openai(
        client=client,
        deployment=args.deployment,
        image_data_urls=image_data_urls,
        detail=args.detail,
        local_quality_summary=diagnostics[
            "local_quality_summary"
        ],
        max_completion_tokens=args.max_completion_tokens,
    )

    report["_pipeline_metadata"] = {
        "input_mode": args.mode,
        "input_filename": args.input.name,
        "selected_frame_count": len(selected_quality),
        "diagnostics_path": str(diagnostics_path),
        "local_quality_summary": diagnostics[
            "local_quality_summary"
        ],
    }

    LOGGER.info("Writing final report...")
    write_json(args.output, report)

    LOGGER.info("Report written to: %s", args.output)
    LOGGER.info("Diagnostics written to: %s", diagnostics_path)
    LOGGER.info("Skin analysis complete.")

    return 0


def main() -> int:
    args = parse_arguments()
    configure_logging(args.debug)

    try:
        return run(args)

    except KeyboardInterrupt:
        LOGGER.error("Operation cancelled.")
        return 130

    except Exception as error:
        LOGGER.exception("Skin analysis failed: %s", error)
        return 1


if __name__ == "__main__":
    sys.exit(main())
