import json
import logging
import re
from typing import Any

import httpx

from . import config

logger = logging.getLogger(__name__)


class OllamaUnavailable(Exception):
    pass


class OllamaClient:
    def __init__(self) -> None:
        self.base = config.OLLAMA_BASE_URL.rstrip("/")
        self.model = config.OLLAMA_MODEL

    def health_check(self) -> bool:
        try:
            with httpx.Client(timeout=5.0) as client:
                r = client.get(f"{self.base}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    def chat(self, system: str, user: str, retries: int = 2) -> str:
        last_err: Exception | None = None
        for attempt in range(retries + 1):
            try:
                with httpx.Client(timeout=120.0) as client:
                    r = client.post(
                        f"{self.base}/api/chat",
                        json={
                            "model": self.model,
                            "stream": False,
                            "messages": [
                                {"role": "system", "content": system},
                                {"role": "user", "content": user},
                            ],
                        },
                    )
                    r.raise_for_status()
                    data = r.json()
                    return data.get("message", {}).get("content", "")
            except Exception as e:
                last_err = e
                logger.warning("Ollama attempt %s failed: %s", attempt + 1, e)
        raise OllamaUnavailable(str(last_err))

    def chat_json(self, system: str, user: str) -> dict[str, Any]:
        raw = self.chat(system, user)
        return parse_json_object(raw)


def parse_json_object(text: str, max_repairs: int = 3) -> dict[str, Any]:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                pass
    if max_repairs <= 0:
        raise ValueError("Could not parse JSON from model output")
    return parse_json_object(text + "}", max_repairs - 1)
