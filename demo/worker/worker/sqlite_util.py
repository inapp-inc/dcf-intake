import json
from typing import Any


def as_bool(value: Any) -> bool:
    return value in (True, 1, "1")


def bind_params(*values: Any) -> tuple[Any, ...]:
    """Normalize values for sqlite3 (booleans → 0/1)."""
    out: list[Any] = []
    for v in values:
        if isinstance(v, bool):
            out.append(1 if v else 0)
        else:
            out.append(v)
    return tuple(out)


def parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if not isinstance(value, str):
        return default
    text = value.strip()
    if not text or text[0] not in "{[":
        return default
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return default
