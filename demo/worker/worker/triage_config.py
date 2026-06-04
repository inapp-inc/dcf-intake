"""Load triage keyword config from shared SQLite (system_config table)."""

import json
import logging
import os
import re
import sqlite3

logger = logging.getLogger(__name__)

DEFAULT_KEYWORD_PATTERNS = [
    {"label": "weapon", "pattern": r"\b(gun|firearm|weapon|knife|pistol|rifle)\b", "flags": "i"},
    {"label": "injury", "pattern": r"\b(bruise|bruising|hit|beat|abuse|hurt)\b", "flags": "i"},
    {"label": "removal", "pattern": r"\b(removal|removed|foster)\b", "flags": "i"},
]

DEFAULT_TRIAGE_INDICATORS = [
    ("young_child", "Very young child in household", "high"),
    ("weapon", "Weapon present", "critical"),
    ("prior_removal", "Prior removal history", "high"),
    ("perp_in_home", "Perpetrator currently in home", "high"),
    ("imminent_fear", "Reporter expressing imminent fear", "critical"),
]

DEFAULT_ESCALATION_THRESHOLD = 2


def _db_path() -> str:
    url = os.environ.get("DATABASE_URL", "sqlite:///data/dcf-ait.db")
    if url.startswith("sqlite:"):
        path = url.replace("sqlite:///", "").replace("sqlite:", "")
        if path.startswith("//"):
            path = path[1:]
        return path
    return "/data/dcf-ait.db"


def load_triage_config() -> dict:
    path = _db_path()
    try:
        conn = sqlite3.connect(path)
        cur = conn.execute("SELECT value_json FROM system_config WHERE key = ?", ("triage",))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            data = json.loads(row[0])
            return {
                "keywordPatterns": data.get("keywordPatterns") or DEFAULT_KEYWORD_PATTERNS,
                "triageIndicators": data.get("triageIndicators")
                or [
                    {"id": i, "label": l, "severity": s}
                    for i, l, s in DEFAULT_TRIAGE_INDICATORS
                ],
                "escalationThreshold": data.get("escalationThreshold", DEFAULT_ESCALATION_THRESHOLD),
            }
    except Exception as e:
        logger.warning("Could not load triage config from %s: %s", path, e)
    return {
        "keywordPatterns": DEFAULT_KEYWORD_PATTERNS,
        "triageIndicators": [
            {"id": i, "label": l, "severity": s} for i, l, s in DEFAULT_TRIAGE_INDICATORS
        ],
        "escalationThreshold": DEFAULT_ESCALATION_THRESHOLD,
    }


def compiled_keyword_patterns():
    cfg = load_triage_config()
    compiled = []
    for item in cfg["keywordPatterns"]:
        flags = re.I if "i" in (item.get("flags") or "i") else 0
        try:
            compiled.append((re.compile(item["pattern"], flags), item["label"]))
        except re.error as e:
            logger.warning("Invalid keyword pattern %s: %s", item.get("label"), e)
    return compiled


def triage_indicator_tuples():
    cfg = load_triage_config()
    out = []
    for ind in cfg["triageIndicators"]:
        out.append((ind["id"], ind["label"], ind.get("severity", "high")))
    return out or list(DEFAULT_TRIAGE_INDICATORS)


def triage_indicators_prompt_block() -> str:
    """Human-readable indicator list injected into the LLM triage system prompt."""
    lines = []
    for ind_id, label, severity in triage_indicator_tuples():
        lines.append(f'- indicatorId "{ind_id}": {label} (severity: {severity})')
    return "\n".join(lines)
