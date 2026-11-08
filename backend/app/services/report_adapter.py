from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

METRIC_MAP = [
    ("hydration", "Hydration", "hydration_appearance"),
    ("texture", "Texture", "texture_appearance"),
    ("tone", "Tone Evenness", "tone_evenness"),
    ("clarity", "Clarity", "clarity"),
    ("finelines", "Fine Lines", "fine_line_appearance"),
    ("darkcircles", "Dark Circles", "dark_circle_appearance"),
]

CONCERN_COLORS = {
    "blemishes": "#E9B44C",
    "acne": "#E9B44C",
    "redness": "#E07A5F",
    "dryness": "#9EC8E0",
    "oiliness": "#D9B85F",
    "pigmentation": "#D9B85F",
    "dark_circles": "#A89CC8",
    "fine_lines": "#C4B5A0",
    "texture": "#8FBC8F",
    "other": "#B0A99F",
}

CONCERN_ICONS = {
    "blemishes": "●",
    "acne": "●",
    "redness": "◆",
    "dryness": "◐",
    "oiliness": "○",
    "pigmentation": "◈",
    "dark_circles": "◎",
    "fine_lines": "⌒",
    "texture": "◇",
    "other": "•",
}

STRENGTH_ICONS = ["💧", "✨", "🎨", "🌿", "☀️", "🪞"]

SKIN_TYPE_LABELS = {
    "dry": "Dry",
    "oily": "Oily",
    "combination": "Combination",
    "balanced": "Balanced",
    "uncertain": "Uncertain",
}


def _status_for_score(score: int) -> str:
    if score >= 85:
        return "Good"
    if score >= 70:
        return "Fair"
    return "Needs Attention"


def _cap_confidence(value: str) -> str:
    return (value or "medium").capitalize()


def to_ui_report(
    analysis_id: str,
    created_at: datetime | str,
    raw_report: dict[str, Any],
    prev_score: Optional[int] = None,
) -> dict[str, Any]:
    scores = raw_report.get("scores") or {}
    overall = scores.get("overall_skin_appearance") or {}
    score = int(overall.get("score") or 0)
    profile = raw_report.get("skin_profile") or {}
    skin_key = (profile.get("apparent_skin_type") or "uncertain").lower()
    skin_type = SKIN_TYPE_LABELS.get(skin_key, skin_key.title())

    if isinstance(created_at, datetime):
        date_str = created_at.date().isoformat()
    else:
        date_str = str(created_at)[:10]

    metrics = []
    for key, label, backend_key in METRIC_MAP:
        item = scores.get(backend_key) or {}
        s = int(item.get("score") or 0)
        metrics.append({
            "key": key,
            "label": label,
            "score": s,
            "status": _status_for_score(s),
            "confidence": _cap_confidence(item.get("confidence", "medium")),
            "desc": item.get("explanation") or "",
        })

    concerns = []
    for idx, obs in enumerate(raw_report.get("visible_observations") or []):
        cat = (obs.get("category") or "other").lower()
        cid = cat.replace(" ", "_")
        concerns.append({
            "id": f"{cid}-{idx}",
            "label": obs.get("name") or cat.replace("_", " ").title(),
            "severity": (obs.get("severity") or "mild").title(),
            "icon": CONCERN_ICONS.get(cid, CONCERN_ICONS.get(cat, "•")),
            "color": CONCERN_COLORS.get(cid, CONCERN_COLORS.get(cat, "#B0A99F")),
            "observed": obs.get("observation") or "",
            "meaning": f"Category: {cat.replace('_', ' ')}. Confidence: {obs.get('confidence', 'medium')}.",
            "nextStep": "Follow the personalized routine guidance in your report and patch-test new actives.",
        })

    strengths = []
    for idx, s in enumerate(raw_report.get("strengths") or []):
        strengths.append({
            "id": f"strength-{idx}",
            "label": s.get("name") or "Strength",
            "icon": STRENGTH_ICONS[idx % len(STRENGTH_ICONS)],
        })

    routine = raw_report.get("routine") or {}

    def map_steps(steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
        mapped = []
        for step in steps or []:
            ingredients = step.get("suggested_ingredients") or []
            mapped.append({
                "step": step.get("step") or len(mapped) + 1,
                "type": step.get("category") or "Step",
                "ingredient": ", ".join(ingredients) if ingredients else "",
                "why": step.get("reason") or "",
                "frequency": step.get("usage_guidance") or "",
                "completed": False,
            })
        return mapped

    return {
        "id": analysis_id,
        "date": date_str,
        "score": score,
        "prevScore": prev_score if prev_score is not None else score,
        "skinType": skin_type,
        "skinTypeDesc": profile.get("explanation") or "",
        "metrics": metrics,
        "concerns": concerns,
        "strengths": strengths,
        "morningRoutine": map_steps(routine.get("morning") or []),
        "nightRoutine": map_steps(routine.get("night") or []),
        "weeklyRoutine": map_steps(routine.get("weekly_or_optional") or []),
        "summary": raw_report.get("summary") or "",
        "disclaimer": raw_report.get("disclaimer") or "",
        "ingredientGuidance": raw_report.get("ingredient_guidance") or {},
        "professionalGuidance": raw_report.get("professional_guidance") or {},
        "qualityAssessment": raw_report.get("quality_assessment") or {},
    }
