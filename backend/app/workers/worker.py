"""RQ worker entrypoint: python -m app.workers.worker"""

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.queue.redis import get_redis


def main() -> None:
    configure_logging()
    settings = get_settings()
    from rq import Worker

    redis = get_redis()
    worker = Worker([settings.rq_queue_name], connection=redis)
    worker.work(with_scheduler=True)


if __name__ == "__main__":
    main()
