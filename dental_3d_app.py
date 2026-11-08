from __future__ import annotations

import base64
import json
import os
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import open3d as o3d
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from openai import AzureOpenAI
from PIL import Image
from pydantic import BaseModel, Field
from transformers import pipeline

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development")
API_PORT = int(os.getenv("API_PORT", "8010"))
UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", "/tmp/sunderta-dental-3d"))
MAX_IMAGE_SIZE_MB = int(os.getenv("MAX_IMAGE_SIZE_MB", "15"))
MAX_VIDEO_SIZE_MB = int(os.getenv("MAX_VIDEO_SIZE_MB", "100"))
MAX_VIDEO_DURATION_SECONDS = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", "30"))
DEPTH_MODEL = os.getenv("DEPTH_MODEL", "depth-anything/Depth-Anything-V2-Small-hf")
MAX_FRAMES = int(os.getenv("MAX_FRAMES", "8"))
POINT_STRIDE = int(os.getenv("POINT_STRIDE", "4"))
VOXEL_SIZE = float(os.getenv("VOXEL_SIZE", "0.01"))

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Sunderta Dental 3D POC",
    version="0.1.0",
    description=(
        "Appearance-only dental scan POC. Produces an approximate monocular-depth "
        "point cloud and non-diagnostic visual observations."
    ),
)

_depth_pipe = None


class Finding(BaseModel):
    label: str
    confidence: float = Field(ge=0.0, le=1.0)
    region: str
    observation: str
    suggested_next_step: str


class AnalyzeResponse(BaseModel):
    analysis_id: str
    media_type: str
    frames_used: int
    point_cloud_url: str
    preview_url: str
    findings: list[Finding]
    capture_feedback: list[str]
    disclaimer: str


def get_depth_pipeline():
    global _depth_pipe
    if _depth_pipe is None:
        device = 0 if torch.cuda.is_available() else -1
        _depth_pipe = pipeline("depth-estimation", model=DEPTH_MODEL, device=device)
    return _depth_pipe


def azure_client() -> AzureOpenAI | None:
    key = os.getenv("AZURE_OPENAI_API_KEY", "").strip()
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "").strip()
    version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview").strip()
    if not key or not endpoint:
        return None
    return AzureOpenAI(api_key=key, azure_endpoint=endpoint, api_version=version)


def encode_jpeg(frame_bgr: np.ndarray) -> str:
    ok, encoded = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    if not ok:
        raise ValueError("Could not encode frame")
    return base64.b64encode(encoded.tobytes()).decode("ascii")


def image_quality_feedback(frame: np.ndarray) -> list[str]:
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    brightness = float(gray.mean())
    sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    feedback: list[str] = []
    if brightness < 55:
        feedback.append("Image is too dark; use bright, diffuse front lighting.")
    elif brightness > 220:
        feedback.append("Image is overexposed; reduce direct flash or glare.")
    if sharpness < 70:
        feedback.append("Image is blurry; hold still and move the camera slightly farther away.")
    if not feedback:
        feedback.append("Capture quality is acceptable for an appearance-only POC.")
    return feedback


def extract_frames(path: Path, content_type: str) -> list[np.ndarray]:
    if content_type.startswith("image/"):
        frame = cv2.imread(str(path))
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        return [frame]

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise HTTPException(status_code=400, detail="Invalid video")

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    duration = frame_count / fps if frame_count else 0.0
    if duration > MAX_VIDEO_DURATION_SECONDS:
        cap.release()
        raise HTTPException(
            status_code=413,
            detail=f"Video exceeds {MAX_VIDEO_DURATION_SECONDS} seconds",
        )

    indices = np.linspace(0, max(frame_count - 1, 0), num=min(MAX_FRAMES, max(frame_count, 1)), dtype=int)
    wanted = set(int(i) for i in indices)
    frames: list[np.ndarray] = []
    i = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if i in wanted:
            frames.append(frame)
        i += 1
    cap.release()

    if not frames:
        raise HTTPException(status_code=400, detail="No readable video frames")
    return frames


def depth_to_cloud(frame_bgr: np.ndarray) -> o3d.geometry.PointCloud:
    rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    result = get_depth_pipeline()(pil)
    depth = np.asarray(result["depth"], dtype=np.float32)
    depth = cv2.resize(depth, (rgb.shape[1], rgb.shape[0]), interpolation=cv2.INTER_CUBIC)

    depth -= depth.min()
    max_depth = float(depth.max())
    if max_depth > 0:
        depth /= max_depth
    depth = 0.15 + (1.0 - depth) * 0.85

    h, w = depth.shape
    focal = 0.9 * max(h, w)
    cx, cy = w / 2.0, h / 2.0

    ys, xs = np.mgrid[0:h:POINT_STRIDE, 0:w:POINT_STRIDE]
    z = depth[::POINT_STRIDE, ::POINT_STRIDE]
    x = (xs - cx) * z / focal
    y = (ys - cy) * z / focal

    points = np.stack([x, -y, z], axis=-1).reshape(-1, 3)
    colors = rgb[::POINT_STRIDE, ::POINT_STRIDE].reshape(-1, 3).astype(np.float32) / 255.0

    valid = np.isfinite(points).all(axis=1)
    cloud = o3d.geometry.PointCloud()
    cloud.points = o3d.utility.Vector3dVector(points[valid])
    cloud.colors = o3d.utility.Vector3dVector(colors[valid])
    return cloud


def merge_clouds(frames: list[np.ndarray]) -> o3d.geometry.PointCloud:
    merged = o3d.geometry.PointCloud()
    for index, frame in enumerate(frames):
        cloud = depth_to_cloud(frame)
        # Small deterministic offset prevents exact overlap. This is not camera-pose recovery.
        transform = np.eye(4)
        transform[0, 3] = (index - (len(frames) - 1) / 2.0) * 0.01
        cloud.transform(transform)
        merged += cloud
    if VOXEL_SIZE > 0:
        merged = merged.voxel_down_sample(VOXEL_SIZE)
    return merged


def save_preview(cloud: o3d.geometry.PointCloud, output_path: Path) -> None:
    points = np.asarray(cloud.points)
    colors = np.asarray(cloud.colors)
    canvas = np.full((800, 800, 3), 245, dtype=np.uint8)
    if points.size == 0:
        cv2.imwrite(str(output_path), canvas)
        return

    xy = points[:, :2]
    low = np.percentile(xy, 1, axis=0)
    high = np.percentile(xy, 99, axis=0)
    span = np.maximum(high - low, 1e-6)
    uv = ((xy - low) / span * 740 + 30).astype(int)
    uv[:, 1] = 799 - uv[:, 1]
    order = np.argsort(points[:, 2])[::-1]
    for idx in order[:: max(1, len(order) // 80000)]:
        u, v = uv[idx]
        if 0 <= u < 800 and 0 <= v < 800:
            color = tuple(int(c * 255) for c in colors[idx][::-1]) if len(colors) else (80, 80, 80)
            cv2.circle(canvas, (u, v), 1, color, -1)
    cv2.imwrite(str(output_path), canvas)


def analyze_with_azure(frames: list[np.ndarray]) -> list[dict[str, Any]]:
    client = azure_client()
    if client is None:
        return []

    deployment = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT") or os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
    if not deployment:
        return []

    content: list[dict[str, Any]] = [{
        "type": "text",
        "text": (
            "Review these mouth images for visible appearance cues only. Do not diagnose. "
            "Return strict JSON with a top-level findings array. Allowed labels: "
            "possible_cavity_like_dark_area, possible_cap_or_crown_alignment_issue, "
            "possible_plaque_or_film, gum_appearance_concern, tooth_surface_irregularity, "
            "uncertain. Each item must include label, confidence from 0 to 1, region, "
            "observation, and suggested_next_step. Use cautious language such as 'may', "
            "'possible', and recommend professional dental examination for suspicious areas."
        ),
    }]
    for frame in frames[:4]:
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{encode_jpeg(frame)}"},
        })

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an oral-appearance assistant. Never claim to detect or diagnose "
                    "cavities, crown failure, infection, or other disease from consumer images."
                ),
            },
            {"role": "user", "content": content},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    raw = response.choices[0].message.content or "{}"
    parsed = json.loads(raw)
    findings = parsed.get("findings", [])
    return findings if isinstance(findings, list) else []


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "environment": APP_ENV,
        "cuda": torch.cuda.is_available(),
        "depth_model": DEPTH_MODEL,
    }


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(file: UploadFile = File(...)) -> AnalyzeResponse:
    content_type = file.content_type or "application/octet-stream"
    is_image = content_type.startswith("image/")
    is_video = content_type.startswith("video/")
    if not (is_image or is_video):
        raise HTTPException(status_code=415, detail="Upload an image or video")

    max_bytes = (MAX_IMAGE_SIZE_MB if is_image else MAX_VIDEO_SIZE_MB) * 1024 * 1024
    payload = await file.read(max_bytes + 1)
    if len(payload) > max_bytes:
        raise HTTPException(status_code=413, detail="File is too large")

    analysis_id = str(uuid.uuid4())
    analysis_dir = UPLOAD_ROOT / analysis_id
    analysis_dir.mkdir(parents=True, exist_ok=False)
    suffix = Path(file.filename or "upload.bin").suffix or (".jpg" if is_image else ".mp4")
    media_path = analysis_dir / f"source{suffix}"
    media_path.write_bytes(payload)

    try:
        frames = extract_frames(media_path, content_type)
        capture_feedback = image_quality_feedback(frames[0])
        cloud = merge_clouds(frames)
        cloud_path = analysis_dir / "mouth_point_cloud.ply"
        preview_path = analysis_dir / "mouth_point_cloud_preview.png"
        o3d.io.write_point_cloud(str(cloud_path), cloud, write_ascii=False)
        save_preview(cloud, preview_path)

        findings_raw = analyze_with_azure(frames)
        findings: list[Finding] = []
        for item in findings_raw:
            try:
                findings.append(Finding.model_validate(item))
            except Exception:
                continue

        return AnalyzeResponse(
            analysis_id=analysis_id,
            media_type="image" if is_image else "video",
            frames_used=len(frames),
            point_cloud_url=f"/artifacts/{analysis_id}/mouth_point_cloud.ply",
            preview_url=f"/artifacts/{analysis_id}/mouth_point_cloud_preview.png",
            findings=findings,
            capture_feedback=capture_feedback,
            disclaimer=(
                "This POC creates an approximate monocular-depth map and appearance-only "
                "observations. It cannot confirm cavities, crown/cap misalignment, infection, "
                "or any dental diagnosis. A dentist should evaluate suspicious areas, pain, "
                "bleeding, swelling, trauma, or persistent symptoms."
            ),
        )
    except HTTPException:
        raise
    except Exception as exc:
        shutil.rmtree(analysis_dir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc


@app.get("/artifacts/{analysis_id}/{filename}")
def artifact(analysis_id: str, filename: str):
    if filename not in {"mouth_point_cloud.ply", "mouth_point_cloud_preview.png"}:
        raise HTTPException(status_code=404, detail="Artifact not found")
    path = UPLOAD_ROOT / analysis_id / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Artifact not found")
    return FileResponse(path)
