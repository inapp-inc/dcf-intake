import logging
import re
import time
from typing import Any

from .. import api_client, config, db, keywords, minio_store
from ..llm_client import LlmClient, LlmUnavailable
from ..llm_prompt import truncate_for_llm
from ..redis_bus import RedisBus
from ..whisper_asr import AsrUnavailable, transcribe_live_chunk

logger = logging.getLogger(__name__)

SECTION_ORDER = ["child", "incident", "reporter", "household", "filing"]


def live_transcript_text(segments: list[dict[str, Any]]) -> str:
    lines: list[str] = []
    for seg in segments:
        text = re.sub(r"\s+", " ", str(seg.get("text", ""))).strip()
        if text:
            lines.append(text)
    return "\n".join(lines)


def _filled_fields_summary(fields: list[dict[str, Any]]) -> str:
    filled: list[str] = []
    missing_required: list[str] = []
    for row in fields:
        label = str(row.get("label") or row.get("field_id"))
        value = str(row.get("value") or "").strip()
        section = str(row.get("section_id"))
        field_id = str(row.get("field_id"))
        key = f"{section}.{field_id}"
        if value:
            filled.append(f"{key}={value}")
        elif row.get("required"):
            missing_required.append(f"{key} ({label})")
    return (
        "Filled fields:\n"
        + ("\n".join(filled) if filled else "(none)")
        + "\n\nMissing required:\n"
        + ("\n".join(missing_required) if missing_required else "(none)")
    )


def run_incremental_nlp(case_id: str, bus: RedisBus, transcript: str) -> int:
    from .stages import NLP_FIELD_IDS, _collect_merge_fields

    if not transcript.strip():
        return 0

    db.set_case_ai_populating(case_id)
    db.set_pipeline_stage(case_id, "nlp", "running")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "running"})

    fields = db.get_form_field_snapshot(case_id)
    filled_keys = {
        f"{r['section_id']}.{r['field_id']}"
        for r in fields
        if str(r.get("value") or "").strip()
    }
    unfilled = [
        f"{s}.{f}"
        for s, f in NLP_FIELD_IDS
        if f"{s}.{f}" not in filled_keys
    ]
    if not unfilled:
        db.set_pipeline_stage(case_id, "nlp", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "complete"})
        return 0

    field_list = ", ".join(unfilled[:40])
    llm = LlmClient()
    system = (
        "You extract structured child-welfare Initial Report intake fields from live hotline transcript chunks. "
        "Respond with JSON only, no markdown. "
        'Schema: {"fields":[{"sectionId":"child|incident|reporter|household|filing",'
        '"fieldId":"<id>","value":"<text>","confidence":0.0-1.0}]} '
        "Extract ONLY from the unfilled field list provided. "
        "Include a field only when the transcript clearly supports it. Do not invent facts. "
        "If a topic was not discussed, omit that field."
    )
    user = (
        f"Unfilled fields to try to extract:\n{field_list}\n\n"
        f"Transcript so far:\n{truncate_for_llm(transcript)}"
    )

    try:
        result = llm.chat_json(system, user, max_tokens=1536)
        raw_fields = result.get("fields", [])
    except (LlmUnavailable, ValueError) as e:
        logger.warning("Incremental NLP failed for %s: %s", case_id, e)
        db.set_pipeline_stage(case_id, "nlp", "failed")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "failed"})
        return 0

    merge_fields = _collect_merge_fields(raw_fields)
    if merge_fields:
        api_client.merge_nlp_fields(case_id, merge_fields, incremental=True)
        child_name = next((f["value"] for f in merge_fields if f.get("fieldId") == "child_name"), "")
        db.update_child_display(case_id, child_name)

    db.set_pipeline_stage(case_id, "nlp", "complete")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "complete"})
    return len(merge_fields)


def run_pending_fields_notice(case_id: str, bus: RedisBus) -> None:
    """Sidebar checklist of required fields still empty — updates when the list changes."""
    fields = db.get_form_field_snapshot(case_id)
    missing = [
        r
        for r in fields
        if r.get("required") and not str(r.get("value") or "").strip()
    ]
    if not missing:
        return

    labels: list[str] = []
    for section_id in SECTION_ORDER:
        for row in missing:
            if row.get("section_id") == section_id:
                labels.append(str(row.get("label") or row.get("field_id")))
    if not labels:
        labels = [str(r.get("label") or r.get("field_id")) for r in missing]

    shown = labels[:8]
    summary = "Pending required fields: " + "; ".join(shown)
    if len(labels) > len(shown):
        summary += f" (+{len(labels) - len(shown)} more)"

    last = db.last_assistant_message(case_id)
    if last and last.get("message") == summary:
        return

    field_id = str(missing[0].get("field_id"))
    db.add_assistant_message(case_id, "warning", summary, field_id)
    bus.publish_case_event(case_id, {"type": "assistant.refresh"})


def run_gap_coach(case_id: str, bus: RedisBus, transcript: str) -> None:
    fields = db.get_form_field_snapshot(case_id)
    missing = [
        r
        for r in fields
        if r.get("required") and not str(r.get("value") or "").strip()
    ]
    if not missing:
        db.add_assistant_message(
            case_id,
            "success",
            "All required Initial Report fields have been captured — review teal highlights and confirm.",
            None,
        )
        bus.publish_case_event(case_id, {"type": "assistant.refresh"})
        return

    run_pending_fields_notice(case_id, bus)

    recent_jumps = set(db.recent_coach_field_jumps(case_id))
    candidates = [r for r in missing if str(r.get("field_id")) not in recent_jumps]
    if not candidates:
        candidates = missing

    priority = candidates[0]
    for section_id in SECTION_ORDER:
        match = next((r for r in candidates if r.get("section_id") == section_id), None)
        if match:
            priority = match
            break

    field_id = str(priority.get("field_id"))

    llm = LlmClient()
    system = (
        "You coach child welfare intake screeners during a live call. "
        "Respond with JSON only, no markdown. "
        'Schema: {"priority":"critical|required|info|success","message":str,'
        '"suggestedQuestion":str,"fieldJump":str|null} '
        "Pick the single most important missing required field to ask about next. "
        "suggestedQuestion must be a natural spoken question the screener can ask the caller. "
        "fieldJump must be the field_id (e.g. child_dob). "
        "Do not repeat topics already covered in the transcript unless still missing."
    )
    user = (
        f"{_filled_fields_summary(fields)}\n\n"
        f"Transcript so far:\n{truncate_for_llm(transcript)}\n\n"
        f"Focus on missing field: {priority.get('section_id')}.{field_id} ({priority.get('label')})"
    )

    try:
        result = llm.chat_json(system, user, max_tokens=512)
    except (LlmUnavailable, ValueError) as e:
        logger.warning("Gap coach LLM failed for %s: %s", case_id, e)
        label = str(priority.get("label") or field_id)
        db.add_assistant_message(
            case_id,
            "warning",
            f"Still need: {label}. Ask the caller to provide this detail.",
            field_id,
        )
        bus.publish_case_event(case_id, {"type": "assistant.refresh"})
        return

    msg_type = str(result.get("priority") or "warning")
    if msg_type not in ("critical", "warning", "info", "success"):
        msg_type = "warning"
    message = str(result.get("message") or "").strip()
    question = str(result.get("suggestedQuestion") or "").strip()
    field_jump = result.get("fieldJump")
    if field_jump is not None:
        field_jump = str(field_jump).strip() or field_id
    else:
        field_jump = field_id

    if question and question not in message:
        message = f"{message} Ask: \"{question}\"" if message else f"Ask: \"{question}\""
    if not message:
        message = f"Still need: {priority.get('label')}. Ask the caller for this detail."

    db.add_assistant_message(case_id, msg_type, message, field_jump)
    bus.publish_case_event(case_id, {"type": "assistant.refresh"})


def _transcribe_live_audio(
    case_id: str,
    bus: RedisBus,
    audio_key: str,
    chunk_index: int,
    duration_ms: int,
    session_id: str | None,
) -> bool:
    """Transcribe one live chunk and append to transcript. Returns True when text was added."""
    if session_id and not db.can_process_live_chunk(case_id, session_id):
        logger.info("Skipping live_chunk — session mismatch or inactive for %s", case_id)
        return False

    db.set_pipeline_stage(case_id, "live_transcription", "running")
    bus.publish_case_event(
        case_id,
        {"type": "pipeline.stage", "stage": "live_transcription", "status": "running"},
    )

    audio_bytes = b""
    try:
        audio_bytes = minio_store.get_bytes(audio_key)
        ext = "." + audio_key.rsplit(".", 1)[-1] if "." in audio_key else ".webm"
        offset_ms = chunk_index * max(duration_ms, 3000)
        seg = transcribe_live_chunk(audio_bytes, suffix=ext, offset_ms=offset_ms)
    except AsrUnavailable as e:
        logger.error("live_chunk ASR failed for %s: %s", case_id, e)
        api_client.audit_model_unavailable(case_id, "live_transcription")
        return False
    except Exception as e:
        logger.exception("live_chunk failed for %s: %s", case_id, e)
        return False

    if not seg or not seg.get("text"):
        logger.warning(
            "live_chunk produced no text for %s (key=%s bytes=%s)",
            case_id,
            audio_key,
            len(audio_bytes),
        )
        return False

    index = db.append_transcript_segment(case_id, seg)
    db.mark_audio_transcribed(case_id, audio_key)
    bus.publish_case_event(
        case_id,
        {
            "type": "transcript.line",
            "index": index,
            "speaker": seg["speaker"],
            "text": seg["text"],
            "keywordFlag": seg.get("keyword_flag"),
        },
    )

    if seg.get("keyword_flag"):
        hits = keywords.scan_keywords(seg["text"])
        if hits:
            bus.publish_case_event(case_id, {"type": "triage.alert", "keywords": hits})

    segments = db.get_transcript_segments(case_id)
    transcript = live_transcript_text(segments)
    minio_store.put_json(f"transcribe/output/{case_id}.json", {"segments": segments})

    run_incremental_nlp(case_id, bus, transcript)
    run_gap_coach(case_id, bus, transcript)
    run_pending_fields_notice(case_id, bus)
    bus.publish_case_event(case_id, {"type": "live.snapshot", "chunkIndex": chunk_index})
    return True


def reconcile_untranscribed_live_chunks(case_id: str, session_id: str, bus: RedisBus) -> int:
    """Process any saved live audio not yet transcribed (handles end-of-call race)."""
    processed = 0
    pending = db.list_untranscribed_live_artifacts(case_id, session_id)
    if not pending:
        keys = minio_store.list_live_session_chunk_keys(case_id, session_id)
        for i, key in enumerate(keys):
            pending.append({"audio_key": key, "chunk_index": i, "byte_size": 0})

    for row in pending:
        audio_key = str(row["audio_key"])
        chunk_index = int(row.get("chunk_index") or 0)
        if _transcribe_live_audio(case_id, bus, audio_key, chunk_index, 3000, session_id):
            processed += 1
        time.sleep(0.2)
    return processed


def run_live_chunk(case_id: str, bus: RedisBus, payload: dict[str, Any]) -> None:
    audio_key = payload.get("audioKey")
    chunk_index = int(payload.get("chunkIndex") or 0)
    duration_ms = int(payload.get("durationMs") or 0)
    session_id = payload.get("sessionId")
    if not audio_key:
        logger.warning("live_chunk missing audioKey for %s", case_id)
        return

    _transcribe_live_audio(case_id, bus, str(audio_key), chunk_index, duration_ms, str(session_id) if session_id else None)


def run_live_end(case_id: str, bus: RedisBus, payload: dict[str, Any]) -> None:
    from .stages import _maybe_clinical_review_flag, clean_transcript_text

    session_id = payload.get("sessionId")
    if session_id:
        db.wait_for_pending_live_chunks(case_id, timeout_s=60.0)
        reconcile_untranscribed_live_chunks(case_id, str(session_id), bus)

    segments = db.get_transcript_segments(case_id)
    transcript = live_transcript_text(segments)
    if not transcript.strip():
        db.add_assistant_message(
            case_id,
            "warning",
            "Live session ended with no speech detected — enter Initial Report fields manually. "
            "Saved audio is retained for supervisor review until screening decision.",
            None,
        )
        bus.publish_case_event(case_id, {"type": "assistant.refresh"})
        db.set_pipeline_stage(case_id, "live_transcription", "complete")
        db.set_pipeline_stage(case_id, "transcription", "complete")
        bus.publish_case_event(
            case_id,
            {"type": "pipeline.stage", "stage": "live_transcription", "status": "complete"},
        )
        bus.publish_case_event(
            case_id,
            {"type": "pipeline.stage", "stage": "transcription", "status": "complete"},
        )
        return

    cleaned = clean_transcript_text(
        [{"speaker": "C", "text": line} for line in transcript.split("\n") if line.strip()]
    )
    minio_store.put_json(f"transcribe/output/{case_id}-clean.txt", {"text": cleaned})

    run_incremental_nlp(case_id, bus, transcript)
    run_gap_coach(case_id, bus, transcript)

    db.set_pipeline_stage(case_id, "live_transcription", "complete")
    db.set_pipeline_stage(case_id, "transcription", "complete")
    bus.publish_case_event(
        case_id,
        {"type": "pipeline.stage", "stage": "live_transcription", "status": "complete"},
    )
    bus.publish_case_event(
        case_id,
        {"type": "pipeline.stage", "stage": "transcription", "status": "complete"},
    )
    db.add_assistant_message(
        case_id,
        "info",
        "Live call ended. Running emergency triage and risk scoring on the full transcript…",
        None,
    )
    bus.publish_case_event(case_id, {"type": "assistant.refresh"})

    _maybe_clinical_review_flag(case_id, bus)
    bus.enqueue(case_id, "keywords_triage", {"transcript": cleaned})
