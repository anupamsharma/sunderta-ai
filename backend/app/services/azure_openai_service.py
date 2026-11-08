from __future__ import annotations

import logging
from typing import Any, Sequence

from openai import AzureOpenAI

from app.core.config import get_settings
from app.skin_pipeline.analyzer import run_visual_analysis
from app.skin_pipeline.prompts import CHAT_SYSTEM_PROMPT

LOGGER = logging.getLogger(__name__)


def get_azure_client() -> AzureOpenAI:
    settings = get_settings()
    if not settings.azure_openai_api_key:
        raise RuntimeError("AZURE_OPENAI_API_KEY is not configured")
    return AzureOpenAI(
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
    )


def analyze_images(
    image_data_urls: Sequence[str],
    local_quality_summary: dict[str, Any],
) -> dict[str, Any]:
    settings = get_settings()
    client = get_azure_client()
    return run_visual_analysis(
        client=client,
        deployment=settings.azure_openai_deployment,
        image_data_urls=image_data_urls,
        local_quality_summary=local_quality_summary,
    )


def chat_completion(messages: list[dict[str, str]], report_context: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    client = get_azure_client()
    system = CHAT_SYSTEM_PROMPT
    if report_context:
        system += "\n\nReport context (JSON):\n" + str(report_context)[:12000]
    payload = [{"role": "system", "content": system}, *messages]
    response = client.chat.completions.create(
        model=settings.azure_openai_chat_deployment,
        messages=payload,
        max_completion_tokens=1200,
    )
    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("Empty chat response from Azure OpenAI")
    return content
