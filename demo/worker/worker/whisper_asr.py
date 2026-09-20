import base64
import logging
import re
import time
from typing import Any, Callable

import httpx

from . import config
from .keywords import scan_keywords

logger = logging.getLogger(__name__)


class AsrUnavailable(Exception):
    pass


_MIME: dict[str, str] = {
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".mpeg": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".m4a": "audio/mp4",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".webm": "audio/webm",
}


def _asr_url() -> str:
    if config.HF_ASR_API_URL:
        return config.HF_ASR_API_URL.rstrip("/")
    model = config.HF_ASR_MODEL
    if model.startswith("http://") or model.startswith("https://"):
        return model.rstrip("/")
    return f"https://router.huggingface.co/hf-inference/models/{model}"


def _headers(content_type: str | None = None) -> dict[str, str]:
    if not config.HF_API_TOKEN:
        raise AsrUnavailable("HF_API_TOKEN is required for cloud transcription")
    h = {"Authorization": f"Bearer {config.HF_API_TOKEN}"}
    if content_type:
        h["Content-Type"] = content_type
    return h


def _request_transcription(audio_bytes: bytes, suffix: str) -> dict[str, Any]:
    url = _asr_url()
    mime = _MIME.get(suffix.lower(), "application/octet-stream")
    last_err: Exception | None = None

    for attempt in range(3):
        try:
            with httpx.Client(timeout=config.ASR_REQUEST_TIMEOUT_S) as client:
                json_payload = {
                    "inputs": base64.b64encode(audio_bytes).decode("ascii"),
                    "parameters": {"return_timestamps": True},
                }
                r = client.post(url, headers=_headers("application/json"), json=json_payload)
                if r.status_code == 503 and attempt < 2:
                    time.sleep(3 * (attempt + 1))
                    continue
                if r.status_code in (400, 415, 422) and attempt == 0:
                    r = client.post(url, headers=_headers(mime), content=audio_bytes)
                r.raise_for_status()
                data = r.json()
                if isinstance(data, list) and data:
                    data = data[0]
                if isinstance(data, dict):
                    return data
                if isinstance(data, str):
                    return {"text": data}
                raise AsrUnavailable(f"Unexpected ASR response type: {type(data)}")
        except AsrUnavailable:
            raise
        except Exception as e:
            last_err = e
            logger.warning("HF ASR attempt %s failed: %s", attempt + 1, e)
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
    raise AsrUnavailable(str(last_err))


def _segments_from_response(
    data: dict[str, Any],
    on_segment: Callable[[dict[str, Any], int], None] | None,
) -> list[dict[str, Any]]:
    chunks = data.get("chunks") or []
    speaker_toggle = True
    segments_out: list[dict[str, Any]] = []

    if chunks:
        for chunk in chunks:
            text = str(chunk.get("text", "")).strip()
            if not text:
                continue
            ts = chunk.get("timestamp") or chunk.get("timestamps") or [0, 0]
            start = float(ts[0]) if ts else 0.0
            speaker = "S" if speaker_toggle else "C"
            speaker_toggle = not speaker_toggle
            kw = len(scan_keywords(text)) > 0
            row = {
                "speaker": speaker,
                "text": text,
                "offset_ms": int(start * 1000),
                "keyword_flag": kw,
            }
            segments_out.append(row)
            if on_segment:
                on_segment(row, len(segments_out) - 1)
    else:
        text = str(data.get("text", "")).strip()
        if text:
            for part in _split_plain_text(text):
                speaker = "S" if speaker_toggle else "C"
                speaker_toggle = not speaker_toggle
                kw = len(scan_keywords(part)) > 0
                row = {
                    "speaker": speaker,
                    "text": part,
                    "offset_ms": len(segments_out) * 3000,
                    "keyword_flag": kw,
                }
                segments_out.append(row)
                if on_segment:
                    on_segment(row, len(segments_out) - 1)

    if not segments_out:
        segments_out.append(
            {
                "speaker": "C",
                "text": "Transcription produced no speech segments.",
                "offset_ms": 0,
                "keyword_flag": False,
            }
        )
    return segments_out


def _split_plain_text(text: str) -> list[str]:
    parts = [p.strip() for p in text.replace("\n", " ").split(". ") if p.strip()]
    if not parts:
        return [text]
    return [p if p.endswith(".") else f"{p}." for p in parts]


def _text_from_response(data: dict[str, Any]) -> str:
    chunks = data.get("chunks") or []
    parts: list[str] = []
    if chunks:
        for chunk in chunks:
            text = str(chunk.get("text", "")).strip()
            if text:
                parts.append(text)
    if not parts:
        text = str(data.get("text", "")).strip()
        if text:
            parts.append(text)
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def transcribe_live_chunk(
    audio_bytes: bytes,
    suffix: str = ".webm",
    offset_ms: int = 0,
) -> dict[str, Any] | None:
    """Transcribe one VAD segment as a single Live line."""
    if not audio_bytes:
        return None
    data = _request_transcription(audio_bytes, suffix)
    text = _text_from_response(data)
    if not text:
        return None
    kw = len(scan_keywords(text)) > 0
    return {
        "speaker": "L",
        "text": text,
        "offset_ms": offset_ms,
        "keyword_flag": kw,
    }


def transcribe_audio(
    audio_bytes: bytes,
    suffix: str = ".wav",
    on_segment: Callable[[dict[str, Any], int], None] | None = None,
) -> list[dict[str, Any]]:
    """Transcribe audio via Hugging Face Inference (no local Whisper RAM)."""
    data = _request_transcription(audio_bytes, suffix)
    return _segments_from_response(data, on_segment)
