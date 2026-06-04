import logging
import re
from typing import Any

from .. import api_client, config, db, keywords, minio_store
from ..ollama_client import OllamaClient, OllamaUnavailable
from ..redis_bus import RedisBus
from ..whisper_asr import transcribe_audio

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
    ("incident", "description"),
    ("reporter", "rep_type"),
    ("reporter", "rep_name"),
    ("reporter", "rep_phone"),
    ("household", "caregiver"),
    ("household", "alleged"),
    ("household", "other_kids"),
    ("household", "caregiver2"),
]


def clean_transcript_text(segments: list[dict]) -> str:
    lines = []
    for seg in segments:
        sp = "Screener" if seg["speaker"] == "S" else "Caller"
        text = re.sub(r"\s+", " ", seg["text"]).strip()
        lines.append(f"{sp}: {text}")
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
        "I've transcribed the audio. Review teal-highlighted AI fields and confirm each before completing the 51A checkpoint.",
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
        "Extracting 51A fields from the transcript with the intake model…",
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

    ollama = OllamaClient()
    system = (
        "You extract structured 51A intake fields from call transcripts. "
        "Respond with JSON only: {\"fields\": [{\"sectionId\", \"fieldId\", \"value\", \"confidence\"}]} "
        "confidence is 0-1. Use empty value if unknown."
    )
    field_list = ", ".join(f"{s}.{f}" for s, f in NLP_FIELD_IDS)

    try:
        result = ollama.chat_json(system, f"Fields: {field_list}\n\nTranscript:\n{text}")
        raw_fields = result.get("fields", [])
    except OllamaUnavailable as e:
        logger.error("NLP Ollama failed: %s", e)
        api_client.audit_model_unavailable(case_id, "nlp")
        db.set_pipeline_stage(case_id, "nlp", "failed")
        db.add_assistant_message(case_id, "warning", "AI field extraction unavailable — enter fields manually.", None)
        return

    merge_fields = []
    for item in raw_fields:
        conf = float(item.get("confidence", 0.5))
        if conf < config.NLP_CONFIDENCE_THRESHOLD:
            continue
        merge_fields.append(
            {
                "sectionId": item.get("sectionId"),
                "fieldId": item.get("fieldId"),
                "value": str(item.get("value", "")),
                "confidence": conf,
                "threshold": config.NLP_CONFIDENCE_THRESHOLD,
            }
        )

    minio_store.put_json(f"nlp/output/{case_id}.json", {"fields": raw_fields})
    api_client.merge_nlp_fields(case_id, merge_fields)

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
    _maybe_clinical_review_flag(case_id, bus)
    bus.enqueue(case_id, "keywords_triage", {"transcript": text})
    bus.enqueue(case_id, "risk", {"transcript": text})


def _maybe_clinical_review_flag(case_id: str, bus: RedisBus) -> None:
    """Mock CCWIS: 4 qualifying incidents in 12 months → clinical review flag."""
    prior_incidents = 4
    if prior_incidents < 3:
        return
    flag_id = db.save_triage_flag(
        case_id,
        "clinical_review",
        "Clinical review required (3+ incidents / 12 mo)",
        "high",
        f"Mock CCWIS history: {prior_incidents} qualifying incidents in 12 months",
    )
    db.add_assistant_message(
        case_id,
        "warning",
        "Clinical review may be required based on CCWIS history (demo mock).",
        None,
    )
    bus.publish_case_event(
        case_id,
        {"type": "triage.alert", "flagId": flag_id, "indicatorId": "clinical_review"},
    )


def run_keywords_triage(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_pipeline_stage(case_id, "triage", "running")
    text = payload.get("transcript", "")
    hits = keywords.scan_keywords(text)
    if hits:
        bus.publish_case_event(case_id, {"type": "triage.alert", "keywords": hits})

    ollama = OllamaClient()
    system = (
        "Evaluate emergency triage indicators for child welfare intake. "
        'JSON: {"flags":[{"indicatorId","label","severity":"high|critical","evidence","present":bool}]} '
        f"Indicators: {[t[0] for t in keywords.TRIAGE_INDICATORS]}"
    )
    try:
        result = ollama.chat_json(system, f"Transcript:\n{text}")
        for flag in result.get("flags", []):
            if not flag.get("present"):
                continue
            db.save_triage_flag(
                case_id,
                flag.get("indicatorId", "unknown"),
                flag.get("label", "Triage indicator"),
                flag.get("severity", "high"),
                flag.get("evidence", ""),
            )
        if any(f.get("present") for f in result.get("flags", [])):
            db.add_assistant_message(case_id, "critical", "Emergency triage flags detected — review and confirm or dismiss.", None)
        db.set_pipeline_stage(case_id, "triage", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "triage", "status": "complete"})
    except OllamaUnavailable:
        api_client.audit_model_unavailable(case_id, "triage")
        db.set_pipeline_stage(case_id, "triage", "failed")


def run_risk(case_id: str, bus: RedisBus, payload: dict) -> None:
    db.set_pipeline_stage(case_id, "risk", "running")
    text = payload.get("transcript", "")
    ollama = OllamaClient()
    system = (
        "Actuarial-style advisory risk score 1-20 for child welfare. "
        'JSON: {"score":int,"label":str,"contributingFactors":[str]} '
        "Never recommend legal action; evidence-based factors only."
    )
    try:
        result = ollama.chat_json(system, f"Transcript and context:\n{text}")
        score = max(1, min(20, int(result.get("score", 10))))
        factors = result.get("contributingFactors", []) or []
        db.save_risk(case_id, score, factors, config.OLLAMA_MODEL)
        minio_store.put_json(f"risk/output/{case_id}.json", result)
        db.set_pipeline_stage(case_id, "risk", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "risk", "status": "complete"})
        bus.enqueue(case_id, "documents", {})
    except OllamaUnavailable:
        api_client.audit_model_unavailable(case_id, "risk")
        db.set_pipeline_stage(case_id, "risk", "failed")


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
    bus.enqueue(case_id, "documents", {})


def run_documents(case_id: str, bus: RedisBus, _: dict) -> None:
    db.set_pipeline_stage(case_id, "documents", "running")
    try:
        nlp = minio_store.get_json(f"nlp/output/{case_id}.json")
    except Exception:
        nlp = {"fields": []}
    ollama = OllamaClient()
    system = (
        "Generate supervisor call summary with evidence citations. "
        'JSON: {"summary":str,"sections":[{"title":str,"body":str,"evidence":[str]}]} '
        'Use "Insufficient data" when evidence missing.'
    )
    try:
        result = ollama.chat_json(system, f"Case NLP fields:\n{nlp}")
        validated = bool(result.get("summary"))
        db.save_document(case_id, "supervisor_summary", result, config.OLLAMA_MODEL, validated)
        minio_store.put_json(f"documents/{case_id}/supervisor-summary.json", result)
        db.set_pipeline_stage(case_id, "documents", "complete")
        bus.publish_case_event(case_id, {"type": "pipeline.stage", "stage": "documents", "status": "complete"})
        db.add_assistant_message(
            case_id,
            "info",
            "Supervisor summary draft is ready for review.",
            None,
        )
    except OllamaUnavailable:
        api_client.audit_model_unavailable(case_id, "documents")
        db.set_pipeline_stage(case_id, "documents", "failed")


STAGE_HANDLERS = {
    "transcribe": run_transcribe,
    "clean": run_clean,
    "nlp": run_nlp,
    "keywords_triage": run_keywords_triage,
    "risk": run_risk,
    "background": run_background,
    "documents": run_documents,
}
