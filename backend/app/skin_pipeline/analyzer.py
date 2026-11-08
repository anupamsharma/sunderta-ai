"""Azure OpenAI visual analysis helpers."""

from typing import Any, Sequence

from openai import AzureOpenAI

from app.skin_pipeline.legacy import (
    analyze_with_azure_openai,
    create_multimodal_content,
    extract_json_object,
)


def run_visual_analysis(
    *,
    client: AzureOpenAI,
    deployment: str,
    image_data_urls: Sequence[str],
    local_quality_summary: dict[str, Any],
    detail: str = "high",
    max_completion_tokens: int = 8000,
) -> dict[str, Any]:
    return analyze_with_azure_openai(
        client=client,
        deployment=deployment,
        image_data_urls=image_data_urls,
        detail=detail,
        local_quality_summary=local_quality_summary,
        max_completion_tokens=max_completion_tokens,
    )


__all__ = [
    "run_visual_analysis",
    "create_multimodal_content",
    "extract_json_object",
    "analyze_with_azure_openai",
]
