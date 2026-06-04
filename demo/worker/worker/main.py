import logging
import sqlite3
import sys

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
    bus = RedisBus()
    logger.info("DCF AIT demo ai-worker started — SQLite queue, artifacts=%s", config.ARTIFACT_DIR)
    while True:
        job = bus.blocking_pop(timeout=5)
        if not job:
            continue
        job_id = job.pop("_jobId", None)
        case_id = job.get("caseId")
        stage = job.get("stage")
        payload = job.get("payload") or {}
        handler = stages.STAGE_HANDLERS.get(stage)
        if not handler:
            logger.warning("Unknown stage %s", stage)
            if job_id is not None:
                bus.complete_job(job_id)
            continue
        if not payload.get("force") and db.should_skip_stage(case_id, _stage_key(stage)):
            logger.info("Skipping duplicate stage %s for case %s", stage, case_id)
            if job_id is not None:
                bus.complete_job(job_id)
            continue
        try:
            logger.info("Running stage %s for case %s", stage, case_id)
            handler(case_id, bus, payload)
            if job_id is not None:
                bus.complete_job(job_id)
        except Exception:
            logger.exception("Stage %s failed for case %s", stage, case_id)
            if job_id is not None:
                with sqlite3.connect(config.sqlite_path()) as conn:
                    conn.execute(
                        "UPDATE pipeline_jobs SET status = 'pending' WHERE id = ?",
                        (job_id,),
                    )
                    conn.commit()


def _stage_key(stage: str) -> str:
    return {"transcribe": "transcription", "keywords_triage": "triage"}.get(stage, stage)


if __name__ == "__main__":
    main()
