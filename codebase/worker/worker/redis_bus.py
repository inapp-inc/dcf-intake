import json
import logging
from typing import Any

import redis

from . import config

logger = logging.getLogger(__name__)

# Blocking commands (BRPOP) need socket_timeout=None or a value greater than brpop timeout.
_REDIS_CLIENT_KWARGS = {
    "decode_responses": True,
    "socket_timeout": None,
    "socket_connect_timeout": 10,
    "retry_on_timeout": True,
    "health_check_interval": 30,
}


class RedisBus:
    def __init__(self) -> None:
        self.client = redis.from_url(config.REDIS_URL, **_REDIS_CLIENT_KWARGS)
        self.ping()

    def ping(self) -> None:
        self.client.ping()

    def close(self) -> None:
        try:
            self.client.close()
        except Exception:
            pass

    def enqueue(self, case_id: str, stage: str, payload: dict | None = None) -> None:
        body = {"caseId": case_id, "stage": stage, "payload": payload or {}}
        self.client.lpush(config.PIPELINE_QUEUE, json.dumps(body))
        logger.info("Enqueued %s for case %s", stage, case_id)

    def blocking_pop(self, timeout: int = 5) -> dict[str, Any] | None:
        item = self.client.brpop(config.PIPELINE_QUEUE, timeout=timeout)
        if not item:
            return None
        _, raw = item
        return json.loads(raw)

    def publish_case_event(self, case_id: str, event: dict[str, Any]) -> None:
        channel = f"case:{case_id}:events"
        self.client.publish(channel, json.dumps(event))
