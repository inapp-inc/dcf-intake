"""Statistical risk framework weights — loaded from system_config.risk_framework."""

import json
import logging
import os
import sqlite3

logger = logging.getLogger(__name__)

DEFAULT = {
    "version": "statistical-v1",
    "scaleMin": 1,
    "scaleMax": 20,
    "baselinePoints": 2,
    "emergencyPoints": 5,
    "keywordPoints": {"weapon": 4, "injury": 3, "removal": 2},
    "defaultKeywordPoints": 2,
    "triageSeverityPoints": {"critical": 4, "high": 2},
    "pendingTriageMultiplier": 0.5,
    "bands": [
        {"min": 15, "label": "High"},
        {"min": 10, "label": "Moderate"},
        {"min": 1, "label": "Lower"},
    ],
}


def _db_path() -> str:
    url = os.environ.get("DATABASE_URL", "sqlite:///data/intake-demo.db")
    if url.startswith("sqlite:"):
        path = url.replace("sqlite:///", "").replace("sqlite:", "")
        if path.startswith("//"):
            path = path[1:]
        return path
    return "/data/intake-demo.db"


def load_risk_framework() -> dict:
    path = _db_path()
    try:
        conn = sqlite3.connect(path)
        cur = conn.execute("SELECT value_json FROM system_config WHERE key = ?", ("risk_framework",))
        row = cur.fetchone()
        conn.close()
        if row and row[0]:
            data = json.loads(row[0])
            return {**DEFAULT, **data}
    except Exception as e:
        logger.warning("Could not load risk framework from %s: %s", path, e)
    return dict(DEFAULT)
