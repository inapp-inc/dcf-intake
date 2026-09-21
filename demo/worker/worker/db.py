import json
import sqlite3
import uuid
from contextlib import contextmanager
from typing import Any

from . import config
from .sqlite_util import bind_params


@contextmanager
def connect():
    conn = sqlite3.connect(config.sqlite_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    return dict(row)


def get_stage_status(case_id: str, stage: str) -> str | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT stages FROM pipeline_state WHERE case_id = ?",
            (case_id,),
        ).fetchone()
    if not row or not row["stages"]:
        return None
    stages = json.loads(row["stages"])
    return stages.get(stage)


def should_skip_stage(case_id: str, stage: str) -> bool:
    status = get_stage_status(case_id, stage)
    return status in ("running", "complete")


def set_pipeline_stage(case_id: str, stage: str, status: str) -> None:
    with connect() as conn:
        row = conn.execute(
            "SELECT stages FROM pipeline_state WHERE case_id = ?",
            (case_id,),
        ).fetchone()
        stages: dict[str, str] = {}
        if row and row["stages"]:
            stages = json.loads(row["stages"])
        stages[stage] = status
        conn.execute(
            """
            INSERT INTO pipeline_state (case_id, current_stage, stages, updated_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT (case_id) DO UPDATE SET
              current_stage = excluded.current_stage,
              stages = excluded.stages,
              updated_at = datetime('now')
            """,
            (case_id, stage, json.dumps(stages)),
        )


def get_checkpoint_status(case_id: str) -> str:
    with connect() as conn:
        row = conn.execute(
            "SELECT form51a_checkpoint_status FROM cases WHERE id = ?",
            (case_id,),
        ).fetchone()
    return row["form51a_checkpoint_status"] if row else "not_started"


def set_case_ai_populating(case_id: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE cases SET form51a_checkpoint_status = 'ai_populating', updated_at = datetime('now') WHERE id = ?",
            (case_id,),
        )


def set_checkpoint_status(case_id: str, status: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE cases SET form51a_checkpoint_status = ?, updated_at = datetime('now') WHERE id = ?",
            (status, case_id),
        )


def get_live_session_status(case_id: str) -> str:
    with connect() as conn:
        row = conn.execute(
            "SELECT live_session_status FROM cases WHERE id = ?",
            (case_id,),
        ).fetchone()
    return row["live_session_status"] if row else "idle"


def get_live_session_id(case_id: str) -> str | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT live_session_id FROM cases WHERE id = ?",
            (case_id,),
        ).fetchone()
    if not row or not row["live_session_id"]:
        return None
    return str(row["live_session_id"])


def can_process_live_chunk(case_id: str, session_id: str | None) -> bool:
    if not session_id:
        return False
    if session_id != get_live_session_id(case_id):
        return False
    return get_live_session_status(case_id) in ("recording", "ended")


def count_pending_live_chunk_jobs(case_id: str) -> int:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT payload FROM pipeline_jobs
            WHERE status IN ('pending', 'processing')
            ORDER BY id ASC
            """
        ).fetchall()
    count = 0
    for row in rows:
        try:
            body = json.loads(row["payload"])
        except json.JSONDecodeError:
            continue
        if body.get("caseId") == case_id and body.get("stage") == "live_chunk":
            count += 1
    return count


def wait_for_pending_live_chunks(case_id: str, timeout_s: float = 60.0) -> None:
    import time

    deadline = time.time() + timeout_s
    while time.time() < deadline:
        if count_pending_live_chunk_jobs(case_id) == 0:
            return
        time.sleep(0.4)


def list_untranscribed_live_artifacts(case_id: str, session_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT audio_key, chunk_index, byte_size
            FROM case_audio_artifacts
            WHERE case_id = ? AND source = 'live' AND session_id = ? AND retained = 1 AND transcribed = 0
            ORDER BY chunk_index ASC NULLS LAST, created_at ASC
            """,
            (case_id, session_id),
        ).fetchall()
    return [dict(r) for r in rows]


def mark_audio_transcribed(case_id: str, audio_key: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE case_audio_artifacts SET transcribed = 1 WHERE case_id = ? AND audio_key = ?",
            (case_id, audio_key),
        )


def append_transcript_segment(case_id: str, seg: dict[str, Any]) -> int:
    """Insert one transcript line; returns zero-based index for WS events."""
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS c FROM transcript_segments WHERE case_id = ?",
            (case_id,),
        ).fetchone()
        index = int(row["c"]) if row else 0
        conn.execute(
            """
            INSERT INTO transcript_segments (id, case_id, speaker, text, offset_ms, keyword_flag)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            bind_params(
                str(uuid.uuid4()),
                case_id,
                seg["speaker"],
                seg["text"],
                seg.get("offset_ms"),
                bool(seg.get("keyword_flag")),
            ),
        )
    return index


def get_transcript_segments(case_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT speaker, text, offset_ms, keyword_flag
            FROM transcript_segments
            WHERE case_id = ?
            ORDER BY COALESCE(offset_ms, 999999999), created_at
            """,
            (case_id,),
        ).fetchall()
    return [
        {
            "speaker": r["speaker"],
            "text": r["text"],
            "offset_ms": r["offset_ms"],
            "keyword_flag": bool(r["keyword_flag"]),
        }
        for r in rows
    ]


def get_form_field_snapshot(case_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT section_id, field_id, label, required, value, source, ai_confidence, confirmed_by_human
            FROM form_51a_fields
            WHERE case_id = ?
            ORDER BY section_id, field_id
            """,
            (case_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def last_assistant_message(case_id: str) -> dict[str, Any] | None:
    with connect() as conn:
        row = conn.execute(
            """
            SELECT msg_type, message, field_jump
            FROM assistant_messages
            WHERE case_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (case_id,),
        ).fetchone()
    return dict(row) if row else None


def recent_coach_field_jumps(case_id: str, limit: int = 5) -> list[str]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT field_jump FROM assistant_messages
            WHERE case_id = ? AND field_jump IS NOT NULL AND msg_type IN ('warning', 'info')
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (case_id, limit),
        ).fetchall()
    return [str(r["field_jump"]) for r in rows if r["field_jump"]]


def save_transcript_segments(case_id: str, segments: list[dict[str, Any]]) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM transcript_segments WHERE case_id = ?", (case_id,))
        for seg in segments:
            conn.execute(
                """
                INSERT INTO transcript_segments (id, case_id, speaker, text, offset_ms, keyword_flag)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                bind_params(
                    str(uuid.uuid4()),
                    case_id,
                    seg["speaker"],
                    seg["text"],
                    seg.get("offset_ms"),
                    bool(seg.get("keyword_flag")),
                ),
            )


def save_risk(case_id: str, score: int, factors: list[str], model_version: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO risk_assessments (id, case_id, score, contributing_factors, model_version)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), case_id, score, json.dumps(factors), model_version),
        )
        conn.execute(
            "UPDATE cases SET risk_score = ?, updated_at = datetime('now') WHERE id = ?",
            (score, case_id),
        )


def save_triage_flag(case_id: str, indicator_id: str, label: str, severity: str, evidence: str) -> str:
    flag_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO triage_flags (id, case_id, indicator_id, label, severity, evidence)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (flag_id, case_id, indicator_id, label, severity, evidence),
        )
        conn.execute(
            """
            UPDATE cases SET triage_flag_count = (
              SELECT COUNT(*) FROM triage_flags WHERE case_id = ? AND status = 'pending'
            ), updated_at = datetime('now') WHERE id = ?
            """,
            (case_id, case_id),
        )
    return flag_id


def save_background_sources(case_id: str, sources: list[dict[str, Any]]) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM background_check_runs WHERE case_id = ?", (case_id,))
        for s in sources:
            conn.execute(
                """
                INSERT INTO background_check_runs (id, case_id, source, status, result_summary, started_at, completed_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                """,
                (str(uuid.uuid4()), case_id, s["name"], s["status"], s.get("summary")),
            )


def save_document(case_id: str, doc_type: str, content: dict, model_version: str, validated: bool) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO case_documents (id, case_id, doc_type, content, model_version, validated)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            bind_params(
                str(uuid.uuid4()),
                case_id,
                doc_type,
                json.dumps(content),
                model_version,
                validated,
            ),
        )


def add_assistant_message(case_id: str, msg_type: str, message: str, field_jump: str | None = None) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO assistant_messages (id, case_id, msg_type, message, field_jump)
            VALUES (?, ?, ?, ?, ?)
            """,
            (str(uuid.uuid4()), case_id, msg_type, message, field_jump),
        )


def list_triage_flags(case_id: str) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT label, severity, status FROM triage_flags WHERE case_id = ?",
            (case_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def case_emergency(case_id: str) -> bool:
    with connect() as conn:
        row = conn.execute("SELECT emergency FROM cases WHERE id = ?", (case_id,)).fetchone()
    return bool(row and row["emergency"])


def get_field_notes(case_id: str) -> str:
    with connect() as conn:
        row = conn.execute("SELECT field_notes FROM cases WHERE id = ?", (case_id,)).fetchone()
    if not row:
        return ""
    return str(row["field_notes"] or "")


def append_field_notes(case_id: str, addition: str) -> str:
    existing = get_field_notes(case_id)
    merged = f"{existing.rstrip()}\n\n{addition.strip()}".strip() if existing.strip() else addition.strip()
    with connect() as conn:
        conn.execute(
            "UPDATE cases SET field_notes = ?, updated_at = datetime('now') WHERE id = ?",
            (merged, case_id),
        )
    return merged


def update_child_display(case_id: str, name: str) -> None:
    if not name:
        return
    with connect() as conn:
        conn.execute(
            "UPDATE cases SET child_display = ?, updated_at = datetime('now') WHERE id = ?",
            (name, case_id),
        )
