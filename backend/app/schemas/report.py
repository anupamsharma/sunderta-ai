from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator

Confidence = Literal["high", "medium", "low"]
Severity = Literal["none", "mild", "moderate", "prominent", "uncertain"]


class ScoreItem(BaseModel):
    score: int = Field(ge=0, le=100)
    confidence: Confidence
    explanation: str = ""


class RatingItem(BaseModel):
    rating: str
    explanation: str = ""


class QualityAssessment(BaseModel):
    lighting: RatingItem
    sharpness: RatingItem
    face_position: RatingItem
    makeup_or_filter_interference: RatingItem
    limitations: list[str] = Field(default_factory=list)


class SkinProfile(BaseModel):
    apparent_skin_type: str
    confidence: Confidence
    explanation: str = ""


class VisibleObservation(BaseModel):
    name: str
    category: str
    severity: str
    confidence: Confidence
    regions: list[str] = Field(default_factory=list)
    observation: str = ""
    possible_image_artifact: bool = False


class StrengthItem(BaseModel):
    name: str
    confidence: Confidence
    explanation: str = ""


class RoutineStep(BaseModel):
    step: int
    category: str
    suggested_ingredients: list[str] = Field(default_factory=list)
    reason: str = ""
    usage_guidance: str = ""


class RoutineBlock(BaseModel):
    morning: list[RoutineStep] = Field(default_factory=list)
    night: list[RoutineStep] = Field(default_factory=list)
    weekly_or_optional: list[RoutineStep] = Field(default_factory=list)


class IngredientHelpful(BaseModel):
    ingredient: str
    reason: str = ""
    caution: str = ""


class IngredientCaution(BaseModel):
    ingredient: str
    reason: str = ""


class IngredientGuidance(BaseModel):
    potentially_helpful: list[IngredientHelpful] = Field(default_factory=list)
    use_with_care: list[IngredientCaution] = Field(default_factory=list)


class ProfessionalGuidance(BaseModel):
    dermatologist_consultation_recommended: bool = False
    reason: str = ""


class InputSummary(BaseModel):
    number_of_images_reviewed: int = 1
    view_consistency: str = "medium"
    general_image_quality: str = "acceptable"


class SkinReport(BaseModel):
    analysis_status: str = "completed"
    input_summary: InputSummary
    quality_assessment: QualityAssessment
    skin_profile: SkinProfile
    scores: dict[str, ScoreItem]
    visible_observations: list[VisibleObservation] = Field(default_factory=list)
    strengths: list[StrengthItem] = Field(default_factory=list)
    routine: RoutineBlock
    ingredient_guidance: IngredientGuidance
    professional_guidance: ProfessionalGuidance
    summary: str = ""
    disclaimer: str

    @field_validator("disclaimer")
    @classmethod
    def disclaimer_required(cls, v: str) -> str:
        if not v or len(v.strip()) < 20:
            raise ValueError("disclaimer is required")
        return v

    @field_validator("scores")
    @classmethod
    def require_overall(cls, v: dict[str, ScoreItem]) -> dict[str, ScoreItem]:
        if "overall_skin_appearance" not in v:
            raise ValueError("overall_skin_appearance score required")
        return v


REQUIRED_SCORE_KEYS = [
    "overall_skin_appearance",
    "hydration_appearance",
    "texture_appearance",
    "tone_evenness",
    "clarity",
    "dark_circle_appearance",
    "fine_line_appearance",
]


def validate_skin_report(data: dict[str, Any]) -> SkinReport:
    return SkinReport.model_validate(data)
