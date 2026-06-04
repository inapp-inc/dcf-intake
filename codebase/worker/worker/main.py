import logging
import sys
import time

import redis

from . import config
from . import db
from .pipeline import stages
from .redis_bus import RedisBus

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ai-worker")


def main() -> None:
    bus = _connect_redis()
    logger.info("DCF AIT ai-worker started — queue=%s redis=%s", config.PIPELINE_QUEUE, config.REDIS_URL)
    while True:
        try:
            job = bus.blocking_pop(timeout=5)
        except (redis.TimeoutError, redis.ConnectionError, OSError) as exc:
            logger.warning("Redis error (%s), reconnecting in 3s…", exc)
            bus.close()
            time.sleep(3)
            bus = _connect_redis()
            continue
        if not job:
            continue
        case_id = job.get("caseId")
        stage = job.get("stage")
        payload = job.get("payload") or {}
        handler = stages.STAGE_HANDLERS.get(stage)
        if not handler:
            logger.warning("Unknown stage %s", stage)
            continue
        if db.should_skip_stage(case_id, _stage_key(stage)):
            logger.info("Skipping duplicate stage %s for case %s", stage, case_id)
            continue
        try:
            logger.info("Running stage %s for case %s", stage, case_id)
            handler(case_id, bus, payload)
        except Exception:
            logger.exception("Stage %s failed for case %s", stage, case_id)


def _connect_redis() -> RedisBus:
    bus = RedisBus()
    logger.info("Connected to Redis at %s", config.REDIS_URL)
    return bus


def _stage_key(stage: str) -> str:
    """Map job stage name to pipeline_state key."""
    return {"transcribe": "transcription", "keywords_triage": "triage"}.get(stage, stage)


if __name__ == "__main__":
    main()
