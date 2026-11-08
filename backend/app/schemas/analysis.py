from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

AnalysisStatus = Literal[
    "created", "uploaded", "queued", "processing", "completed", "failed", "cancelled"
]


class ProgressInfo(BaseModel):
    stage: str = "created"
    progress: int = Field(default=0, ge=0, le=100)
    message: str = ""


class AnalysisStatusResponse(BaseModel):
    id: str
    status: AnalysisStatus
    mode: Literal["image", "video"]
    progress: ProgressInfo
    error_code: Optional[str] = None
    error_message: Optional[str] = None
