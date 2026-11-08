from rq import Retry

from app.core.config import get_settings
from app.queue.redis import get_queue


def enqueue_analysis(analysis_id: str) -> str:
    settings = get_settings()
    queue = get_queue()
    job = queue.enqueue(
        "app.workers.tasks.process_analysis",
        analysis_id,
        job_timeout=settings.job_timeout_seconds,
        retry=Retry(max=settings.max_job_retries, interval=[10, 30]),
        result_ttl=86400,
        failure_ttl=86400,
    )
    return job.id
