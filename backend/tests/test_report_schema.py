"""Unit tests that do not require Azure, Mongo, or Redis."""

from app.schemas.report import validate_skin_report
from app.services.comparison_service import compare_reports
from app.services.report_adapter import to_ui_report


SAMPLE_REPORT = {
    "analysis_status": "completed",
    "input_summary": {
        "number_of_images_reviewed": 1,
        "view_consistency": "high",
        "general_image_quality": "good",
    },
    "quality_assessment": {
        "lighting": {"rating": "good", "explanation": "ok"},
        "sharpness": {"rating": "good", "explanation": "ok"},
        "face_position": {"rating": "good", "explanation": "ok"},
        "makeup_or_filter_interference": {"rating": "unknown", "explanation": "ok"},
        "limitations": ["Single image"],
    },
    "skin_profile": {
        "apparent_skin_type": "combination",
        "confidence": "medium",
        "explanation": "T-zone oilier looking",
    },
    "scores": {
        "overall_skin_appearance": {"score": 82, "confidence": "medium", "explanation": "ok"},
        "hydration_appearance": {"score": 80, "confidence": "medium", "explanation": "ok"},
        "texture_appearance": {"score": 85, "confidence": "high", "explanation": "ok"},
        "tone_evenness": {"score": 78, "confidence": "medium", "explanation": "ok"},
        "clarity": {"score": 74, "confidence": "medium", "explanation": "ok"},
        "dark_circle_appearance": {"score": 70, "confidence": "low", "explanation": "ok"},
        "fine_line_appearance": {"score": 88, "confidence": "medium", "explanation": "ok"},
    },
    "visible_observations": [
        {
            "name": "Mild blemish-like spots",
            "category": "blemishes",
            "severity": "mild",
            "confidence": "medium",
            "regions": ["T-zone"],
            "observation": "A few spots visible",
            "possible_image_artifact": False,
        }
    ],
    "strengths": [
        {"name": "Smooth texture appearance", "confidence": "high", "explanation": "Looks smooth"}
    ],
    "routine": {
        "morning": [
            {
                "step": 1,
                "category": "Cleanser",
                "suggested_ingredients": ["Gentle surfactant"],
                "reason": "Cleanse",
                "usage_guidance": "Every morning",
            }
        ],
        "night": [],
        "weekly_or_optional": [],
    },
    "ingredient_guidance": {"potentially_helpful": [], "use_with_care": []},
    "professional_guidance": {
        "dermatologist_consultation_recommended": False,
        "reason": "",
    },
    "summary": "Generally healthy looking skin with mild concerns.",
    "disclaimer": (
        "This report provides cosmetic skincare guidance based on visible image characteristics. "
        "It is not a medical diagnosis or clinical measurement."
    ),
}


def test_validate_skin_report():
    report = validate_skin_report(SAMPLE_REPORT)
    assert report.scores["overall_skin_appearance"].score == 82


def test_report_adapter_ui_shape():
    ui = to_ui_report("abc", "2026-08-03T00:00:00Z", SAMPLE_REPORT, prev_score=79)
    assert ui["score"] == 82
    assert ui["prevScore"] == 79
    assert ui["skinType"] == "Combination"
    assert len(ui["metrics"]) == 6
    assert ui["morningRoutine"][0]["type"] == "Cleanser"
    assert "disclaimer" in ui


def test_comparison_service():
    prev = SAMPLE_REPORT
    curr = {
        **SAMPLE_REPORT,
        "scores": {
            **SAMPLE_REPORT["scores"],
            "overall_skin_appearance": {"score": 86, "confidence": "medium", "explanation": "ok"},
            "clarity": {"score": 80, "confidence": "medium", "explanation": "ok"},
        },
        "input_summary": {
            **SAMPLE_REPORT["input_summary"],
            "general_image_quality": "acceptable",
        },
    }
    result = compare_reports(prev, curr)
    assert result["overallDelta"] == 4
    assert result["conditionWarning"]
    assert "not medically meaningful" in result["disclaimer"].lower()


def test_score_bounds_rejected():
    bad = {
        **SAMPLE_REPORT,
        "scores": {
            **SAMPLE_REPORT["scores"],
            "overall_skin_appearance": {"score": 150, "confidence": "medium", "explanation": "x"},
        },
    }
    try:
        validate_skin_report(bad)
        assert False, "expected validation error"
    except Exception:
        assert True
