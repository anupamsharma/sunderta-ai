from __future__ import annotations

from typing import Any


CATEGORY_KEYS = [
    ("overall", "Overall", "overall_skin_appearance"),
    ("hydration", "Hydration", "hydration_appearance"),
    ("texture", "Texture", "texture_appearance"),
    ("tone", "Tone Evenness", "tone_evenness"),
    ("clarity", "Clarity", "clarity"),
    ("darkcircles", "Dark Circles", "dark_circle_appearance"),
    ("finelines", "Fine Lines", "fine_line_appearance"),
]


def _score(report: dict[str, Any], key: str) -> int:
    item = (report.get("scores") or {}).get(key) or {}
    return int(item.get("score") or 0)


def compare_reports(previous: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    categories = []
    improvements = []
    declines = []
    for key, label, backend in CATEGORY_KEYS:
        prev_s = _score(previous, backend)
        curr_s = _score(current, backend)
        delta = curr_s - prev_s
        categories.append({
            "key": key,
            "label": label,
            "previous": prev_s,
            "current": curr_s,
            "delta": delta,
        })
        if delta >= 3:
            improvements.append(f"{label} improved by {delta} points (cosmetic appearance only).")
        elif delta <= -3:
            declines.append(f"{label} declined by {abs(delta)} points (cosmetic appearance only).")

    prev_limitations = ((previous.get("quality_assessment") or {}).get("limitations") or [])
    curr_limitations = ((current.get("quality_assessment") or {}).get("limitations") or [])
    warning = None
    prev_quality = ((previous.get("input_summary") or {}).get("general_image_quality") or "")
    curr_quality = ((current.get("input_summary") or {}).get("general_image_quality") or "")
    if prev_quality and curr_quality and prev_quality != curr_quality:
        warning = (
            "These captures appear to have been made under substantially different image-quality "
            "conditions. Score differences may reflect lighting or camera changes rather than skin changes."
        )

    overall_prev = _score(previous, "overall_skin_appearance")
    overall_curr = _score(current, "overall_skin_appearance")

    return {
        "previousOverall": overall_prev,
        "currentOverall": overall_curr,
        "overallDelta": overall_curr - overall_prev,
        "categories": categories,
        "apparentImprovements": improvements,
        "apparentDeclines": declines,
        "qualityLimitations": list(dict.fromkeys([*prev_limitations, *curr_limitations])),
        "conditionWarning": warning,
        "disclaimer": (
            "Comparison reflects cosmetic appearance estimates from images only. "
            "Score changes are not medically meaningful."
        ),
    }
