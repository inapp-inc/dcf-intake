import json
import logging
import sqlite3
import time
from typing import Any

import httpx

from . import config

logger = logging.getLogger(__name__)


class RedisBus:
    """Demo stack: SQLite job queue + HTTP events to API (no Redis)."""

    def __init__(self) -> None:
        self._http = httpx.Client(timeout=120.0)
        self.ping()

    def ping(self) -> None:
        with sqlite3.connect(config.sqlite_path(), timeout=5) as conn:
            conn.execute("SELECT 1")

    def close(self) -> None:
        self._http.close()

    def blocking_pop(self, timeout: int = 5) -> dict[str, Any] | None:
        deadline = time.time() + timeout
        while time.time() < deadline:
            job = self._claim_job()
            if job:
                return job
            time.sleep(0.4)
        return None

    def _claim_job(self) -> dict[str, Any] | None:
        with sqlite3.connect(config.sqlite_path(), timeout=30) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                """
                SELECT id, payload FROM pipeline_jobs
                WHERE status = 'pending'
                ORDER BY id ASC LIMIT 1
                """
            ).fetchone()
            if not row:
                return None
            conn.execute(
                "UPDATE pipeline_jobs SET status = 'processing' WHERE id = ?",
                (row["id"],),
            )
            conn.commit()
            body = json.loads(row["payload"])
            body["_jobId"] = row["id"]
            return body

    def complete_job(self, job_id: int) -> None:
        with sqlite3.connect(config.sqlite_path(), timeout=30) as conn:
            conn.execute("DELETE FROM pipeline_jobs WHERE id = ?", (job_id,))
            conn.commit()

    def enqueue(self, case_id: str, stage: str, payload: dict | None = None) -> None:
        body = json.dumps({"caseId": case_id, "stage": stage, "payload": payload or {}})
        with sqlite3.connect(config.sqlite_path(), timeout=30) as conn:
            conn.execute(
                "INSERT INTO pipeline_jobs (payload, status) VALUES (?, 'pending')",
                (body,),
            )
            conn.commit()
        logger.info("Enqueued %s for case %s", stage, case_id)

    def publish_case_event(self, case_id: str, event: dict[str, Any]) -> None:
        url = f"{config.API_BASE_URL}/internal/cases/{case_id}/events"
        try:
            r = self._http.post(
                url,
                json=event,
                headers={"X-Internal-Key": config.INTERNAL_API_KEY},
            )
            r.raise_for_status()
        except Exception as exc:
            logger.warning("Event publish failed: %s", exc)
