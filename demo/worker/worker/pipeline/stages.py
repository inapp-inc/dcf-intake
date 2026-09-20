import logging
import re
from typing import Any

from .. import api_client, config, db, keywords, minio_store, risk_scoring
from ..llm_prompt import truncate_for_llm
from ..llm_client import LlmClient, LlmUnavailable
from ..redis_bus import RedisBus
from ..whisper_asr import AsrUnavailable, transcribe_audio

logger = logging.getLogger(__name__)

NLP_FIELD_IDS = [
    ("child", "child_name"),
    ("child", "child_dob"),
    ("child", "child_age"),
    ("child", "child_gender"),
    ("child", "child_addr"),
    ("child", "child_school"),
    ("incident", "allegation"),
    ("incident", "inc_date"),
    ("incident", "incident_location"),
    ("incident", "description"),
    ("incident", "dv_concerns"),
    ("reporter", "rep_type"),
    ("reporter", "rep_name"),
    ("reporter", "rep_phone"),
    ("reporter", "rep_addr"),
    ("reporter", "rep_relationship"),
    ("reporter", "rep_is_caretaker"),
    ("household", "caregiver"),
    ("household", "caregiver_phone"),
    ("household", "caregiver_dob"),
    ("household", "alleged"),
    ("household", "other_kids"),
    ("household", "caregiver2"),
    ("household", "caregiver2_addr"),
    ("household", "caregiver2_phone"),
    ("household", "caregiver2_dob"),
    ("filing", "action_taken"),
    ("filing", "protective_strengths"),
]


VALID_SECTIONS = frozenset(s for s, _ in NLP_FIELD_IDS)
VALID_FIELD_IDS = frozenset(f for _, f in NLP_FIELD_IDS)

SECTION_ALIASES = {
    "child_information": "child",
    "child info": "child",
    "child": "child",
    "incident_details": "incident",
    "incident details": "incident",
    "incident": "incident",
    "reporter_information": "reporter",
    "reporter info": "reporter",
    "reporter": "reporter",
    "household_members": "household",
    "household members": "household",
    "household": "household",
    "filing_details": "filing",
    "filing details": "filing",
    "51a_filing": "filing",
    "filing": "filing",
}

FIELD_ALIASES = {
    "childname": "child_name",
    "child_dob": "child_dob",
    "dob": "child_dob",
    "date_of_birth": "child_dob",
    "childage": "child_age",
    "age": "child_age",
    "childgender": "child_gender",
    "gender": "child_gender",
    "childaddress": "child_addr",
    "address": "child_addr",
    "home_address": "child_addr",
    "childschool": "child_school",
    "school": "child_school",
    "nature_of_allegation": "allegation",
    "allegation_type": "allegation",
    "incident_date": "inc_date",
    "date_of_incident": "inc_date",
    "incident_description": "description",
    "reporter_type": "rep_type",
    "reporter_name": "rep_name",
    "callback_number": "rep_phone",
    "phone": "rep_phone",
    "primary_caregiver": "caregiver",
    "caregiver_name": "caregiver",
    "alleged_responsible_party": "alleged",
    "responsible_party": "alleged",
    "other_children": "other_kids",
    "second_caregiver": "caregiver2",
    "caregiver_phone": "caregiver_phone",
    "caregiver_dob": "caregiver_dob",
    "primary_caregiver_phone": "caregiver_phone",
    "second_caregiver_address": "caregiver2_addr",
    "caregiver2_phone": "caregiver2_phone",
    "caregiver2_dob": "caregiver2_dob",
    "reporter_address": "rep_addr",
    "rep_address": "rep_addr",
    "relationship_to_child": "rep_relationship",
    "reporter_relationship": "rep_relationship",
    "reporter_is_caretaker": "rep_is_caretaker",
    "is_caretaker": "rep_is_caretaker",
    "incident_location": "incident_location",
    "location": "incident_location",
    "domestic_violence": "dv_concerns",
    "dv_concerns": "dv_concerns",
    "action_taken": "action_taken",
    "protective_strengths": "protective_strengths",
    "protective_factors": "protective_strengths",
}

FIELD_LABEL_ALIASES = {
    "child's full name": "child_name",
    "date of birth": "child_dob",
    "approximate age": "child_age",
    "gender": "child_gender",
    "home address": "child_addr",
    "school / daycare": "child_school",
    "nature of allegation": "allegation",
    "date of most recent incident": "inc_date",
    "incident description": "description",
    "reporter type": "rep_type",
    "reporter name (if disclosed)": "rep_name",
    "callback number": "rep_phone",
    "primary caregiver": "caregiver",
    "alleged responsible party": "alleged",
    "other children in household": "other_kids",
    "second caregiver / absent parent": "caregiver2",
    "primary caregiver phone": "caregiver_phone",
    "primary caregiver dob / age": "caregiver_dob",
    "second caregiver address": "caregiver2_addr",
    "second caregiver phone": "caregiver2_phone",
    "second caregiver dob / age": "caregiver2_dob",
    "reporter address": "rep_addr",
    "relationship to child": "rep_relationship",
    "reporter is caretaker? (yes / no)": "rep_is_caretaker",
    "incident location": "incident_location",
    "domestic violence / safety concerns": "dv_concerns",
    "action already taken": "action_taken",
    "protective factors / strengths": "protective_strengths",
}


def _coerce_confidence(raw: Any, has_value: bool) -> float:
    if raw is None or raw == "":
        return 0.8 if has_value else 0.0
    try:
        conf = float(raw)
    except (TypeError, ValueError):
        return 0.8 if has_value else 0.0
    if conf > 1:
        conf /= 100.0
    if conf <= 0 and has_value:
        return 0.8
    return max(0.0, min(1.0, conf))


def _resolve_field_id(raw_field: str) -> str:
    key = raw_field.strip().lower()
    if key in VALID_FIELD_IDS:
        return key
    label = FIELD_LABEL_ALIASES.get(key)
    if label:
        return label
    norm = re.sub(r"[^a-z0-9]+", "_", key).strip("_")
    if norm in VALID_FIELD_IDS:
        return norm
    return FIELD_ALIASES.get(norm, norm)


def normalize_merge_field(item: dict[str, Any]) -> dict[str, Any] | None:
    raw_section = str(item.get("sectionId") or item.get("section") or "").strip().lower()
    raw_section = SECTION_ALIASES.get(raw_section, raw_section)
    if raw_section not in VALID_SECTIONS:
        return None
    field_id = _resolve_field_id(str(item.get("fieldId") or item.get("field") or ""))
    if field_id not in VALID_FIELD_IDS:
        return None
    value = item.get("value")
    if value is None:
        val_str = ""
    elif isinstance(value, (dict, list)):
        val_str = str(value)
    else:
        val_str = str(value).strip()
    if not val_str or val_str.lower() in ("unknown", "n/a", "none", "null"):
        val_str = ""
    conf = _coerce_confidence(item.get("confidence"), bool(val_str))
    return {
        "sectionId": raw_section,
        "fieldId": field_id,
        "value": val_str,
        "confidence": conf,
        "threshold": config.NLP_CONFIDENCE_THRESHOLD,
    }


def _collect_merge_fields(raw_fields: list[Any]) -> list[dict[str, Any]]:
    """Prefer high-confidence fields; fall back to any non-empty extraction."""
    merge_fields: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    threshold = config.NLP_CONFIDENCE_THRESHOLD

    for item in raw_fields:
        if not isinstance(item, dict):
            continue
        normalized = normalize_merge_field(item)
        if not normalized or not normalized["value"]:
            continue
        if normalized["confidence"] < threshold:
            continue
        key = (normalized["sectionId"], normalized["fieldId"])
        if key in seen:
            continue
        seen.add(key)
        merge_fields.append(normalized)

    if merge_fields:
        return merge_fields

    for item in raw_fields:
        if not isinstance(item, dict):
            continue
        normalized = normalize_merge_field(item)
        if not normalized or not normalized["value"]:
            continue
        key = (normalized["sectionId"], normalized["fieldId"])
        if key in seen:
            continue
        seen.add(key)
        normalized["confidence"] = max(normalized["confidence"], 0.75)
        merge_fields.append(normalized)

    return merge_fields


def _parse_risk_score(raw: Any) -> int:
    try:
        return max(1, min(20, int(float(raw))))
    except (TypeError, ValueError):
        return 10


def clean_transcript_text(segments: list[dict]) -> str:
    lines = []
    for seg in segments:
        sp = "Screener" if seg["speaker"] == "S" else "Caller"
        text = re.sub(r"\s+", " ", seg["text"]).strip()
        lines.append(f"{sp}: {text}")
    return "\n".join(lines)


def field_memo_transcript_text(segments: list[dict]) -> str:
    """Plain text for Field Report notes — no intake speaker labels."""
    lines: list[str] = []
    for seg in segments:
        text = re.sub(r"\s+", " ", str(seg.get("text", ""))).strip()
        if text:
            lines.append(text)
    return "\n".join(lines)


def run_transcribe(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_pipeline_stage(case_id, "transcription", "running")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "transcription", "status": "running"})

    audio_key = payload.get("audioKey") or minio_store.find_latest_audio_key(case_id)
    if not audio_key:
        db.set_pipeline_stage(case_id, "transcription", "failed")
        db.add_assistant_message(case_id, "warning", "No audio file found for transcription.", None)
        return

    db.add_assistant_message(
        case_id,
        "info",
        "I'm listening to the recording and transcribing speaker-attributed lines…",
        None,
    )
    bus.publish_case_event(
        case_id,
        {"type": "assistant.refresh"},
    )

    def on_segment(seg: dict, index: int) -> None:
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

    try:
        audio_bytes = minio_store.get_bytes(audio_key)
        ext = "." + audio_key.rsplit(".", 1)[-1] if "." in audio_key else ".wav"
        segments = transcribe_audio(audio_bytes, suffix=ext, on_segment=on_segment)
    except AsrUnavailable as e:
        logger.error("Transcribe failed (HF ASR): %s", e)
        db.set_pipeline_stage(case_id, "transcription", "failed")
        api_client.audit_model_unavailable(case_id, "transcription")
        db.add_assistant_message(
            case_id,
            "warning",
            "Transcription unavailable — check HF_API_TOKEN or try again.",
            None,
        )
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "transcription", "status": "failed"})
        return
    except Exception as e:
        logger.exception("Transcribe failed: %s", e)
        db.set_pipeline_stage(case_id, "transcription", "failed")
        api_client.audit_model_unavailable(case_id, "transcription")
        db.add_assistant_message(
            case_id,
            "warning",
            "Transcription unavailable — please enter fields manually.",
            None,
        )
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "transcription", "status": "failed"})
        return

    db.save_transcript_segments(case_id, segments)
    minio_store.put_json(f"transcribe/output/{case_id}.json", {"segments": segments})

    db.set_pipeline_stage(case_id, "transcription", "complete")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "transcription", "status": "complete"})
    db.add_assistant_message(
        case_id,
        "success",
        "I've transcribed the audio. Review teal-highlighted AI fields and confirm each before completing the Initial Report checkpoint.",
        None,
    )
    bus.enqueue(case_id, "clean", {})


def run_clean(case_id: str, bus: RedisBus, _: dict) -> None:
    data = minio_store.get_json(f"transcribe/output/{case_id}.json")
    cleaned = clean_transcript_text(data.get("segments", []))
    minio_store.put_json(f"transcribe/output/{case_id}-clean.txt", {"text": cleaned})
    bus.enqueue(case_id, "nlp", {"cleanText": cleaned})


def run_nlp(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_case_ai_populating(case_id)
    db.set_pipeline_stage(case_id, "nlp", "running")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "running"})
    db.add_assistant_message(
        case_id,
        "info",
        "Extracting Initial Report fields from the transcript with the intake model…",
        None,
    )
    bus.publish_case_event(case_id, {"type": "assistant.refresh"})

    text = payload.get("cleanText") or ""
    if not text:
        try:
            data = minio_store.get_json(f"transcribe/output/{case_id}-clean.txt")
            text = data.get("text", "")
        except Exception:
            data = minio_store.get_json(f"transcribe/output/{case_id}.json")
            text = clean_transcript_text(data.get("segments", []))
    text = truncate_for_llm(text)

    llm = LlmClient()
    system = (
        "You extract structured child-welfare Initial Report intake fields from hotline call transcripts. "
        "Respond with JSON only, no markdown. "
        'Schema: {"fields":[{"sectionId":"child|incident|reporter|household|filing",'
        '"fieldId":"<id>","value":"<text>","confidence":0.0-1.0}]} '
        "Use exact sectionId and fieldId from the provided list. "
        "Extract as much information as the transcript supports — be thorough. "
        "Include a field only when there is evidence in the transcript (explicit statement or reasonable inference). "
        "Do not invent facts. If a topic was not discussed, omit that field entirely. "
        "Guidance by area:\n"
        "- child: full name, DOB or age, gender, complete home address, school/daycare\n"
        "- incident: allegation type, date/time, location, detailed narrative, any DV or safety concerns\n"
        "- reporter: mandated vs voluntary, name, phone, address, institution/employer, relationship to child, "
        "whether reporter is a caretaker (yes/no)\n"
        "- household: primary caregiver name/phone/DOB, alleged responsible party, all other children (names and ages), "
        "second caregiver name/address/phone/DOB when mentioned\n"
        "- filing: actions already taken (911 called, ER visit, school notified), protective factors/strengths mentioned\n"
        "For other_kids list every sibling mentioned, e.g. 'Emma, age 7; Jake, age 4'. "
        "Use full US addresses when stated (street, city, state, zip). "
        "Confidence 0.85+ when clearly stated, 0.65-0.84 when reasonably inferred from context."
    )
    field_list = ", ".join(f"{s}.{f}" for s, f in NLP_FIELD_IDS)

    try:
        result = llm.chat_json(
            system,
            f"Extract every supported field from this list:\n{field_list}\n\nTranscript:\n{text}",
        )
        raw_fields = result.get("fields", [])
    except LlmUnavailable as e:
        logger.error("NLP LLM failed: %s", e)
        api_client.audit_model_unavailable(case_id, "nlp")
        db.set_pipeline_stage(case_id, "nlp", "failed")
        db.set_checkpoint_status(case_id, "incomplete")
        db.add_assistant_message(case_id, "warning", "AI field extraction unavailable — enter fields manually.", None)
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "failed"})
        bus.publish_case_event(case_id, {"type": "form.checkpoint.changed", "checkpointStatus": "incomplete"})
        return
    except ValueError as e:
        logger.warning("NLP LLM returned unparseable JSON for %s: %s", case_id, e)
        raw_fields = []

    merge_fields = _collect_merge_fields(raw_fields)

    minio_store.put_json(f"nlp/output/{case_id}.json", {"fields": raw_fields})
    api_client.merge_nlp_fields(case_id, merge_fields)
    if not merge_fields:
        logger.warning("NLP produced no valid fields above threshold for %s", case_id)
        db.add_assistant_message(
            case_id,
            "warning",
            "AI could not map fields from this recording — please fill required items manually.",
            None,
        )

    child_name = next((f["value"] for f in merge_fields if f.get("fieldId") == "child_name"), "")
    db.update_child_display(case_id, child_name)

    for f in merge_fields:
        if f.get("fieldId") == "child_dob" and not f.get("value"):
            db.add_assistant_message(
                case_id,
                "warning",
                "Date of birth is missing — check CCWIS or call the reporter back.",
                "child_dob",
            )

    db.set_pipeline_stage(case_id, "nlp", "complete")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "nlp", "status": "complete"})
    if payload.get("reextract"):
        return
    _maybe_clinical_review_flag(case_id, bus)
    bus.enqueue(case_id, "keywords_triage", {"transcript": text})


def _maybe_clinical_review_flag(case_id: str, bus: RedisBus) -> None:
    """Optional demo: mock CCWIS prior incidents → clinical review triage flag."""
    prior_incidents = config.DEMO_MOCK_CCWIS_PRIOR_INCIDENTS
    if prior_incidents < 3:
        return
    flag_id = db.save_triage_flag(
        case_id,
        "clinical_review",
        "Clinical review required (3+ incidents / 12 mo)",
        "high",
        f"Mock CCWIS history: {prior_incidents} qualifying incidents in 12 months",
    )
    bus.publish_case_event(
        case_id,
        {"type": "triage.alert", "flagId": flag_id, "indicatorId": "clinical_review"},
    )


def run_keywords_triage(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_pipeline_stage(case_id, "triage", "running")
    text = truncate_for_llm(payload.get("transcript", ""))
    hits = keywords.scan_keywords(text)
    if hits:
        bus.publish_case_event(case_id, {"type": "triage.alert", "keywords": hits})

    llm = LlmClient()
    indicator_block = keywords.triage_indicators_prompt_block()
    system = (
        "Evaluate emergency triage indicators for child welfare intake. "
        "Respond with JSON only, no markdown. "
        'Schema: {"flags":[{"indicatorId":str,"label":str,"severity":"high|critical","evidence":str,"present":bool}]} '
        "Use indicatorId values exactly as listed. Match severity to the indicator definition when present=true. "
        "Set present true only when clearly supported by the transcript.\n\n"
        f"Configured indicators:\n{indicator_block}"
    )
    try:
        result = llm.chat_json(system, f"Transcript:\n{text}", max_tokens=1024)
        _save_triage_flags(case_id, result.get("flags", []))
    except LlmUnavailable:
        api_client.audit_model_unavailable(case_id, "triage")
        _save_keyword_triage_flags(case_id, text)
        _complete_triage_and_enqueue_risk(case_id, bus, payload)
        return
    except ValueError as e:
        logger.warning("Triage LLM returned unparseable JSON for %s: %s", case_id, e)
        _save_keyword_triage_flags(case_id, text)

    _complete_triage_and_enqueue_risk(case_id, bus, payload)


def _complete_triage_and_enqueue_risk(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_pipeline_stage(case_id, "triage", "complete")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "triage", "status": "complete"})
    bus.enqueue(case_id, "risk", {"transcript": payload.get("transcript", "")})


def _save_triage_flags(case_id: str, flags: list[Any]) -> None:
    if not isinstance(flags, list):
        return
    any_present = False
    for flag in flags:
        if not isinstance(flag, dict) or not flag.get("present"):
            continue
        any_present = True
        db.save_triage_flag(
            case_id,
            str(flag.get("indicatorId", "unknown")),
            str(flag.get("label", "Triage indicator")),
            str(flag.get("severity", "high")),
            str(flag.get("evidence", "")),
        )
    if any_present:
        db.add_assistant_message(
            case_id,
            "critical",
            "Emergency triage flags detected — review and confirm or dismiss.",
            None,
        )


def _save_keyword_triage_flags(case_id: str, text: str) -> None:
    """Fallback when LLM JSON fails — persist keyword scanner hits only."""
    keyword_map = {
        "weapon": ("weapon", "Weapon reference in call", "critical"),
        "injury": ("injury", "Injury or abuse language detected", "high"),
        "removal": ("prior_removal", "Prior removal / foster history mentioned", "high"),
    }
    saved = False
    for hit in keywords.scan_keywords(text):
        meta = keyword_map.get(hit)
        if not meta:
            continue
        db.save_triage_flag(case_id, meta[0], meta[1], meta[2], f"Keyword match: {hit}")
        saved = True
    if saved:
        db.add_assistant_message(
            case_id,
            "warning",
            "Triage flags from keyword scan (LLM triage unavailable) — review and confirm or dismiss.",
            None,
        )


def run_risk(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_pipeline_stage(case_id, "risk", "running")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "risk", "status": "running"})
    text = truncate_for_llm(payload.get("transcript", ""))
    flags = db.list_triage_flags(case_id)
    emergency = db.case_emergency(case_id)
    try:
        result = risk_scoring.compute_statistical_risk(text, flags, emergency)
        db.save_risk(
            case_id,
            int(result["score"]),
            result["contributingFactors"],
            str(result["modelVersion"]),
        )
        minio_store.put_json(f"risk/output/{case_id}.json", result)
        db.set_pipeline_stage(case_id, "risk", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "risk", "status": "complete"})
        bus.enqueue(case_id, "documents", {})
    except Exception as e:
        logger.exception("Statistical risk scoring failed for %s: %s", case_id, e)
        db.save_risk(
            case_id,
            10,
            ["Statistical risk fallback — scoring error; review manually"],
            "statistical-fallback",
        )
        db.set_pipeline_stage(case_id, "risk", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "risk", "status": "complete"})
        bus.enqueue(case_id, "documents", {})


def run_field_memo_transcribe(case_id: str, bus: RedisBus, payload: dict) -> None:
    """Transcribe a Field Report voice memo and append to cases.field_notes (no intake pipeline)."""
    db.set_pipeline_stage(case_id, "field_memo", "running")
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "field_memo", "status": "running"})

    audio_key = payload.get("audioKey")
    if not audio_key:
        db.set_pipeline_stage(case_id, "field_memo", "failed")
        bus.publish_case_event(
            case_id,
            {"type": "field_memo.failed", "message": "No audio file for field memo."},
        )
        return

    try:
        audio_bytes = minio_store.get_bytes(audio_key)
        ext = "." + audio_key.rsplit(".", 1)[-1] if "." in audio_key else ".wav"
        segments = transcribe_audio(audio_bytes, suffix=ext, on_segment=None)
    except AsrUnavailable as e:
        logger.error("Field memo transcribe failed (HF ASR): %s", e)
        db.set_pipeline_stage(case_id, "field_memo", "failed")
        api_client.audit_model_unavailable(case_id, "field_memo")
        bus.publish_case_event(
            case_id,
            {"type": "field_memo.failed", "message": "Transcription unavailable — check HF_API_TOKEN or try again."},
        )
        return
    except Exception as e:
        logger.exception("Field memo transcribe failed: %s", e)
        db.set_pipeline_stage(case_id, "field_memo", "failed")
        bus.publish_case_event(
            case_id,
            {"type": "field_memo.failed", "message": "Transcription failed — try again or type notes manually."},
        )
        return

    body = field_memo_transcript_text(segments)
    if not body.strip():
        db.set_pipeline_stage(case_id, "field_memo", "failed")
        bus.publish_case_event(
            case_id,
            {"type": "field_memo.failed", "message": "No speech detected in the recording."},
        )
        return

    from datetime import datetime, timezone

    stamped = f"--- Voice memo ({datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}) ---\n{body}"
    merged = db.append_field_notes(case_id, stamped)
    minio_store.put_json(
        f"field-memo/output/{case_id}.json",
        {"segments": segments, "text": body, "audioKey": audio_key},
    )

    db.set_pipeline_stage(case_id, "field_memo", "complete")
    bus.publish_case_event(
        case_id,
        {"type": "field_memo.complete", "text": merged, "appended": body},
    )
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "field_memo", "status": "complete"})


def run_background(case_id: str, bus: RedisBus, _: dict) -> None:
    if db.get_checkpoint_status(case_id) != "complete":
        logger.info("Background skipped — checkpoint not complete for %s", case_id)
        return

    db.set_pipeline_stage(case_id, "background", "running")
    sources = [
        {"name": "Central Registry", "status": "complete", "summary": "No match (demo)"},
        {"name": "CORI", "status": "complete", "summary": "Records found — review required (demo)"},
        {"name": "SORI", "status": "complete", "summary": "No match (demo)"},
        {"name": "NCIC", "status": "complete", "summary": "Pending agency response (demo)"},
        {"name": "911 CAD", "status": "complete", "summary": "No prior CAD at address (demo)"},
    ]
    db.save_background_sources(case_id, sources)
    minio_store.put_json(f"background/output/{case_id}.json", {"sources": sources})
    db.set_pipeline_stage(case_id, "background", "complete")
    db.add_assistant_message(
        case_id,
        "info",
        "Background checks completed (demo mock). Review the status grid before submit.",
        None,
    )
    bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "background", "status": "complete"})


def run_documents(case_id: str, bus: RedisBus, _: dict) -> None:
    if db.get_stage_status(case_id, "documents") == "complete":
        logger.info("Documents already complete for %s — skipping duplicate HF call", case_id)
        return

    db.set_pipeline_stage(case_id, "documents", "running")
    try:
        nlp = minio_store.get_json(f"nlp/output/{case_id}.json")
    except Exception:
        nlp = {"fields": []}
    llm = LlmClient()
    system = (
        "Generate supervisor call summary with evidence citations. "
        'JSON: {"summary":str,"sections":[{"title":str,"body":str,"evidence":[str]}]} '
        'Use "Insufficient data" when evidence missing.'
    )
    try:
        result = llm.chat_json(system, f"Case NLP fields:\n{nlp}", max_tokens=1024)
        validated = bool(result.get("summary"))
        db.save_document(case_id, "supervisor_summary", result, config.llm_model_label(), validated)
        minio_store.put_json(f"documents/{case_id}/supervisor-summary.json", result)
        db.set_pipeline_stage(case_id, "documents", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "documents", "status": "complete"})
        db.add_assistant_message(
            case_id,
            "info",
            "Supervisor summary draft is ready for review.",
            None,
        )
    except LlmUnavailable:
        api_client.audit_model_unavailable(case_id, "documents")
        db.set_pipeline_stage(case_id, "documents", "failed")
    except ValueError as e:
        logger.warning("Documents LLM returned unparseable JSON for %s: %s", case_id, e)
        fallback = {
            "summary": "Supervisor summary unavailable — LLM output could not be parsed.",
            "sections": [{"title": "Intake", "body": "Review transcript and Initial Report fields manually.", "evidence": []}],
        }
        db.save_document(case_id, "supervisor_summary", fallback, "fallback", False)
        minio_store.put_json(f"documents/{case_id}/supervisor-summary.json", fallback)
        db.set_pipeline_stage(case_id, "documents", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "documents", "status": "complete"})


STAGE_HANDLERS = {
    "transcribe": run_transcribe,
    "clean": run_clean,
    "nlp": run_nlp,
    "keywords_triage": run_keywords_triage,
    "risk": run_risk,
    "background": run_background,
    "documents": run_documents,
    "field_memo_transcribe": run_field_memo_transcribe,
}


def _register_live_handlers() -> None:
    from . import live_pipeline

    STAGE_HANDLERS["live_chunk"] = live_pipeline.run_live_chunk
    STAGE_HANDLERS["live_end"] = live_pipeline.run_live_end


_register_live_handlers()
