"""Hexagonal ports for AI pipeline adapters (Whisper / Ollama — no stubs)."""
from typing import Any, Protocol


class TranscriptionService(Protocol):
    def transcribe(self, audio_bytes: bytes, suffix: str = ".wav") -> list[dict[str, Any]]: ...


class NlpExtractor(Protocol):
    def extract_fields(self, transcript: str, field_ids: list[tuple[str, str]]) -> dict[str, Any]: ...


class LlmClient(Protocol):
    def chat_json(self, system: str, user: str) -> dict[str, Any]: ...
