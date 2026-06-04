import json
import logging
from pathlib import Path
from typing import Any

from . import config

logger = logging.getLogger(__name__)


def _root() -> Path:
    return Path(config.ARTIFACT_DIR)


def _path(key: str) -> Path:
    p = _root() / key
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def put_json(key: str, data: Any) -> None:
    _path(key).write_text(json.dumps(data, indent=2), encoding="utf-8")


def get_json(key: str) -> Any:
    return json.loads(_path(key).read_text(encoding="utf-8"))


def put_bytes(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    void = content_type
    del void
    _path(key).write_bytes(data)


def get_bytes(key: str) -> bytes:
    return _path(key).read_bytes()


def find_latest_audio_key(case_id: str) -> str | None:
    prefix = _root() / "audio" / "input" / case_id
    if not prefix.is_dir():
        return None
    files = sorted(
        p for p in prefix.iterdir() if p.is_file() and not p.name.endswith(".keep")
    )
    if not files:
        return None
    return str(files[-1].relative_to(_root()))
