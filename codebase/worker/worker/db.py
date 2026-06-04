import json
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.rows import dict_row

from . import config


@contextmanager
def connect():
    with psycopg.connect(config.DATABASE_URL, row_factory=dict_row) as conn:
        yield conn


def get_stage_status(case_id: str, stage: str) -> str | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT stages FROM pipeline_state WHERE case_id = %s",
            (case_id,),
        ).fetchone()
    if not row or not row.get("stages"):
        return None
    stages = row["stages"]
    if isinstance(stages, str):
        stages = json.loads(stages)
    return stages.get(stage)


def should_skip_stage(case_id: str, stage: str) -> bool:
    """Anti-recursion: skip if stage already running or complete."""
    status = get_stage_status(case_id, stage)
    return status in ("running", "complete")


def set_pipeline_stage(case_id: str, stage: str, status: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO pipeline_state (case_id, current_stage, stages, updated_at)
            VALUES (%s, %s, %s::jsonb, now())
            ON CONFLICT (case_id) DO UPDATE SET
              current_stage = EXCLUDED.current_stage,
              stages = pipeline_state.stages || EXCLUDED.stages,
              updated_at = now()
            """,
            (case_id, stage, json.dumps({stage: status})),
        )
        conn.commit()


def get_checkpoint_status(case_id: str) -> str:
    with connect() as conn:
        row = conn.execute(
            "SELECT form51a_checkpoint_status FROM cases WHERE id = %s",
            (case_id,),
        ).fetchone()
    return row["form51a_checkpoint_status"] if row else "not_started"


def set_case_ai_populating(case_id: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE cases SET form51a_checkpoint_status = 'ai_populating', updated_at = now() WHERE id = %s",
            (case_id,),
        )
        conn.commit()


def save_transcript_segments(case_id: str, segments: list[dict[str, Any]]) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM transcript_segments WHERE case_id = %s", (case_id,))
        for seg in segments:
            conn.execute(
                """
                INSERT INTO transcript_segments (case_id, speaker, text, offset_ms, keyword_flag)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    case_id,
                    seg["speaker"],
                    seg["text"],
                    seg.get("offset_ms"),
                    seg.get("keyword_flag", False),
                ),
            )
        conn.commit()


def save_risk(case_id: str, score: int, factors: list[str], model_version: str) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO risk_assessments (case_id, score, contributing_factors, model_version)
            VALUES (%s, %s, %s::jsonb, %s)
            """,
            (case_id, score, json.dumps(factors), model_version),
        )
        conn.execute(
            "UPDATE cases SET risk_score = %s, updated_at = now() WHERE id = %s",
            (score, case_id),
        )
        conn.commit()


def save_triage_flag(case_id: str, indicator_id: str, label: str, severity: str, evidence: str) -> str:
    with connect() as conn:
        row = conn.execute(
            """
            INSERT INTO triage_flags (case_id, indicator_id, label, severity, evidence)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (case_id, indicator_id, label, severity, evidence),
        ).fetchone()
        conn.execute(
            """
            UPDATE cases SET triage_flag_count = (
              SELECT COUNT(*) FROM triage_flags WHERE case_id = %s AND status = 'pending'
            ), updated_at = now() WHERE id = %s
            """,
            (case_id, case_id),
        )
        conn.commit()
    return str(row["id"]) if row else ""


def save_background_sources(case_id: str, sources: list[dict[str, Any]]) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM background_check_runs WHERE case_id = %s", (case_id,))
        for s in sources:
            conn.execute(
                """
                INSERT INTO background_check_runs (case_id, source, status, result_summary, started_at, completed_at)
                VALUES (%s, %s, %s, %s, now(), now())
                """,
                (case_id, s["name"], s["status"], s.get("summary")),
            )
        conn.commit()


def save_document(case_id: str, doc_type: str, content: dict, model_version: str, validated: bool) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO case_documents (case_id, doc_type, content, model_version, validated)
            VALUES (%s, %s, %s::jsonb, %s, %s)
            """,
            (case_id, doc_type, json.dumps(content), model_version, validated),
        )
        conn.commit()


def add_assistant_message(case_id: str, msg_type: str, message: str, field_jump: str | None = None) -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO assistant_messages (case_id, msg_type, message, field_jump)
            VALUES (%s, %s, %s, %s)
            """,
            (case_id, msg_type, message, field_jump),
        )
        conn.commit()


def update_child_display(case_id: str, name: str) -> None:
    if not name:
        return
    with connect() as conn:
        conn.execute(
            "UPDATE cases SET child_display = %s, updated_at = now() WHERE id = %s",
            (name, case_id),
        )
        conn.commit()
