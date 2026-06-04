import json
import logging
import re
import time
from typing import Any

import httpx

from . import config
from .llm_prompt import truncate_for_llm

logger = logging.getLogger(__name__)


class LlmUnavailable(Exception):
    pass


class LlmClient:
    def chat(self, system: str, user: str, retries: int = 2, max_tokens: int = 2048) -> str:
        user = truncate_for_llm(user)
        if config.LLM_PROVIDER == "ollama":
            return self._ollama_chat(system, user, retries)
        return self._huggingface_chat(system, user, retries, max_tokens)

    def chat_json(self, system: str, user: str, max_tokens: int = 2048) -> dict[str, Any]:
        raw = self.chat(system, user, max_tokens=max_tokens)
        return parse_json_object(raw)

    def health_check(self) -> bool:
        try:
            if config.LLM_PROVIDER == "ollama":
                with httpx.Client(timeout=5.0) as client:
                    r = client.get(f"{config.OLLAMA_BASE_URL.rstrip('/')}/api/tags")
                    return r.status_code == 200
            if not config.HF_API_TOKEN:
                return False
            with httpx.Client(timeout=8.0) as client:
                r = client.get(
                    f"{config.HF_API_BASE.rstrip('/')}/models",
                    headers={"Authorization": f"Bearer {config.HF_API_TOKEN}"},
                )
                return r.status_code == 200
        except Exception:
            return False

    def _huggingface_chat(self, system: str, user: str, retries: int, max_tokens: int = 2048) -> str:
        if not config.HF_API_TOKEN:
            raise LlmUnavailable("HF_API_TOKEN is required when LLM_PROVIDER=huggingface")

        url = f"{config.HF_API_BASE.rstrip('/')}/chat/completions"
        payload = {
            "model": config.HF_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.2,
        }
        headers = {
            "Authorization": f"Bearer {config.HF_API_TOKEN}",
            "Content-Type": "application/json",
        }

        last_err: Exception | None = None
        for attempt in range(retries + 1):
            try:
                with httpx.Client(timeout=config.LLM_REQUEST_TIMEOUT_S) as client:
                    r = client.post(url, json=payload, headers=headers)
                    if r.status_code == 503 and attempt < retries:
                        time.sleep(3 * (attempt + 1))
                        continue
                    r.raise_for_status()
                    data = r.json()
                    return (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
            except Exception as e:
                last_err = e
                logger.warning("HF LLM attempt %s failed: %s", attempt + 1, e)
                if attempt < retries:
                    time.sleep(2)
        raise LlmUnavailable(str(last_err))

    def _ollama_chat(self, system: str, user: str, retries: int) -> str:
        url = f"{config.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
        payload = {
            "model": config.OLLAMA_MODEL,
            "stream": False,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        last_err: Exception | None = None
        for attempt in range(retries + 1):
            try:
                with httpx.Client(timeout=config.LLM_REQUEST_TIMEOUT_S) as client:
                    r = client.post(url, json=payload)
                    r.raise_for_status()
                    data = r.json()
                    return data.get("message", {}).get("content", "")
            except Exception as e:
                last_err = e
                logger.warning("Ollama attempt %s failed: %s", attempt + 1, e)
        raise LlmUnavailable(str(last_err))


def parse_json_object(text: str, max_repairs: int = 3) -> dict[str, Any]:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()

    candidates: list[str] = [text]
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        candidates.append(text[start : end + 1])

    seen: set[str] = set()
    for candidate in candidates:
        for variant in _json_repair_variants(candidate, max_repairs):
            if variant in seen:
                continue
            seen.add(variant)
            try:
                parsed = json.loads(variant)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue

    raise ValueError("Could not parse JSON from model output")


def _json_repair_variants(text: str, max_repairs: int) -> list[str]:
    out = [text]
    if max_repairs <= 0:
        return out
    no_trailing_comma = re.sub(r",(\s*[}\]])", r"\1", text)
    if no_trailing_comma != text:
        out.append(no_trailing_comma)
    closed = _close_truncated_json(text)
    if closed != text:
        out.append(closed)
        out.append(re.sub(r",(\s*[}\]])", r"\1", closed))
    return out


def _close_truncated_json(text: str) -> str:
    """Close unterminated strings/brackets when HF truncates mid-JSON."""
    stack: list[str] = []
    in_string = False
    escape = False
    for ch in text:
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            stack.append("}")
        elif ch == "[":
            stack.append("]")
        elif ch in "}]" and stack and stack[-1] == ch:
            stack.pop()
    suffix = ""
    if in_string:
        suffix += '"'
    suffix += "".join(reversed(stack))
    return text + suffix if suffix else text
