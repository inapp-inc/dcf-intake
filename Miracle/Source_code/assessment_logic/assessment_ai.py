"""
AI/ML layer for Milestone 2:
- Load questions from questions.csv
- Build section prompts for Claude 3 Haiku via Amazon Bedrock
- Invoke Bedrock per section with JSON-only responses
- Merge and validate into a single assessment dict
"""

from __future__ import annotations

import csv
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Literal, Optional

import boto3
from botocore.client import BaseClient

# -----------------------------
# Constants & Types
# -----------------------------

ALLOWED_LABELS: List[str] = [
    "Thriving",
    "Safe",
    "Vulnerable",
    "In Crisis",
    "Insufficient data",     # question does not apply to family
]

ALLOWED_STATUSES = [
    "answered",
    "skipped",            # caseworker did not discuss this topic
    "not_applicable",     # question does not apply to family
]

SectionId = Literal[
    "Family & Social Relationships",
    "Household Economy",
    "Living Conditions",
    "Education",
    "Health & Mental Health",
]

EXPECTED_SECTION_IDS: List[SectionId] = [
    "Family & Social Relationships",
    "Household Economy",
    "Living Conditions",
    "Education",
    "Health & Mental Health",
]

STRONG_EVIDENCE_KEYWORDS = [
    "violence",
    "abuse",
    "beaten",
    "assault",
    "suicidal",
    "severe",
    "hospital",
    "hospitalized",
    "homeless",
    "no income",
    "no food",
    "malnutrition",
    "police",
    "court",
    "immediate risk",
    "unsafe",
    "exploitation",
]

# -----------------------------
# Logging
# -----------------------------

logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
logger.setLevel(logging.INFO)


# -----------------------------
# Data Models
# -----------------------------


@dataclass(frozen=True)
class Question:
    q_id: str
    question_text: str
    section_id: SectionId


# -----------------------------
# CSV Loading & Question Catalog
# -----------------------------


SECTION_DOMAIN_MAP: Dict[str, SectionId] = {
    "Family & Social Relationships": "Family & Social Relationships",
    "Household Economy": "Household Economy",
    "Living Conditions": "Living Conditions",
    "Education": "Education",
    "Health & Mental Health": "Health & Mental Health",
}


def normalize_section_id(domain: str) -> SectionId:
    domain_clean = domain.strip()
    if domain_clean not in SECTION_DOMAIN_MAP:
        raise ValueError(f"Unknown domain in questions.csv: {domain!r}")
    return SECTION_DOMAIN_MAP[domain_clean]


def normalize_answer(answer: Optional[str]) -> Optional[str]:
    if not answer:
        return None

    a = answer.strip().lower()

    mapping = {
        "thriving": "Thriving",
        "Thriving": "Thriving",
        "safe": "Safe",
        "vulnerable": "Vulnerable",
        "in crisis": "In Crisis",
        "crisis": "In Crisis",
        "insufficient_data": "Insufficient data",
        "insufficient data": "Insufficient data",
        "not enough data": "Insufficient data",
        "unknown": "Insufficient data",
    }

    return mapping.get(a, "Insufficient data")


def normalize_status(status: str) -> str:
    if not status:
        return "answered"

    s = status.strip().lower()

    mapping = {
        "answered": "answered",
        "skipped": "skipped",
        "not applicable": "not_applicable",
        "not_applicable": "not_applicable",
    }

    return mapping.get(s, "answered")



def load_questions_from_csv(csv_path: Path) -> Dict[SectionId, List[Question]]:
    """
    Load questions from questions.csv and group by section_id.

    CSV columns:
    - question_id
    - question_text_en
    - domain
    """
    sections: Dict[SectionId, List[Question]] = {sid: [] for sid in EXPECTED_SECTION_IDS}

    with csv_path.open("r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            q_id = row["question_id"].strip()
            text = row["question_text_en"].strip()
            domain = row["domain"].strip()
            section_id = normalize_section_id(domain)
            sections[section_id].append(Question(q_id=q_id, question_text=text, section_id=section_id))

    logger.info(
        "Loaded %d questions from %s (per section: %s)",
        sum(len(v) for v in sections.values()),
        csv_path,
        {k: len(v) for k, v in sections.items()},
    )
    return sections


# -----------------------------
# Prompt Engineering
# -----------------------------

SYSTEM_PROMPT: str = (
    "You are an AI social worker assistant helping classify NGO case assessments.\n"
    "You MUST:\n"
    "- Use ONLY the provided context text.\n"
    "- For each question you decide is RELEVANT, choose exactly one label from:\n"
    '  [\"Thriving\", \"Safe\", \"Vulnerable\", \"In Crisis\", \"Insufficient data\"].\n'
    "- If the context does not provide enough evidence for a relevant question, answer \"Insufficient data\".\n"
    ##"- You may OMIT questions that are clearly NOT relevant to the context.\n"
    "- If the question topic was NOT discussed in the context, set status=\"skipped\" and answer=null.\n"
    "- If the question clearly does not apply to the family situation, set status=\"not_applicable\" and answer=null.\n"
    "- If status=\"answered\" but evidence is weak or unclear, answer \"Insufficient data\".\n"
    "- NEVER guess missing information.\n"
    "- Notes must be 1–3 sentences, concise, and evidence-based.\n"
    "- Include 1–3 short evidence snippets (direct quotes or very short paraphrases).\n"
    "- Do NOT include any PII beyond what appears in the context.\n"
    "- Output STRICTLY valid JSON only. No markdown, no extra commentary.\n"
)


def build_section_prompt(
    section_id: SectionId,
    questions: List[Question],
    context_text: str,
) -> str:
    """
    Build a section-specific user prompt for Claude.
    """
    questions_block_lines = []
    for q in questions:
        questions_block_lines.append(f"- {q.q_id}: {q.question_text}")

    questions_block = "\n".join(questions_block_lines)

    rubric = (
        "Rubric for labels:\n"
        "- \"Thriving\": Strongly positive, resilient, no significant concerns.\n"
        "- \"Safe\": Adequate and stable, minor or low-level concerns only.\n"
        "- \"Vulnerable\": Noticeable concerns that may worsen without support.\n"
        "- \"In Crisis\": Serious, urgent, or high-risk concerns that require immediate attention.\n"
        "- \"Insufficient data\": Evidence is missing, contradictory, or too weak to decide.\n"
    )

    schema_description = (
        "You MUST respond with a JSON object matching this schema:\n"
        "{\n"
        f'  \"section_id\": \"{section_id}\",\n'
        "  \"responses\": [\n"
        "    {\n"
        "      \"q_id\": \"<question id from the list>\",\n"
        "      \"question_text\": \"<the exact question text from the list>\",\n"
        "      \"status\": \"answered | skipped | not_applicable\",\n"
        "      \"answer\": \"<one of the allowed labels>\",\n"
        "      \"note\": \"<1–3 sentences summarizing the reasoning>\",\n"
        "      \"evidence_snippets\": [\"<short quote or paraphrase from context>\", \"...\"],\n"
        "      \"relevant\": true\n"
        "    }\n"
        ##"    // Only include questions that are clearly relevant to the context.\n"
        "  ]\n"
        "}\n"
        ##"Do NOT include questions that are clearly not relevant to this case.\n"
    )

    prompt = (
        f"{rubric}\n"
        "Questions for this section:\n"
        f"{questions_block}\n\n"
        "Context (case notes + transcript):\n"
        "--------------------\n"
        f"{context_text}\n"
        "--------------------\n\n"
        f"{schema_description}\n"
        "Remember: JSON only. No markdown, no comments.\n"
    )
    return prompt


# -----------------------------
# Bedrock Invocation Wrapper
# -----------------------------


def _get_bedrock_client(region_name: Optional[str] = None) -> BaseClient:
    region = region_name or boto3.session.Session().region_name or "ap-south-1"
    return boto3.client("bedrock-runtime", region_name=region)


def _invoke_bedrock_raw(
    client: BaseClient,
    model_id: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.1,
    max_tokens: int = 3000,
) -> str:
    """
    Invoke Claude 3 Haiku via Bedrock Converse API and return raw text content.
    Uses client.converse() so the SDK sends the correct request format.
    """
    response = client.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_prompt}]}],
        inferenceConfig={
            "maxTokens": max_tokens,
            "temperature": temperature,
        },
    )

    # Converse response: output.message.content[].text
    content = response.get("output", {}).get("message", {}).get("content", [])
    if not content:
        raise ValueError("Empty content in Bedrock Converse response")
    block = content[0]
    if "text" in block:
        return block["text"]
    raise ValueError(f"Could not extract text from Bedrock response: {response}")


def _parse_json_strict(raw: str) -> dict:
    """
    Try to parse JSON strictly, stripping common wrappers (code fences).
    """
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        idx = text.find("{")
        if idx != -1:
            text = text[idx:]
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        text = text[first : last + 1]
    return json.loads(text)


def _parse_json_lenient(raw: str) -> dict:
    """
    Try to parse JSON after applying common fixes for LLM output:
    - Trailing commas before ] or }
    - Missing commas between } and { or ] and {
    - Unescaped newlines inside double-quoted strings replaced with space
    """
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
        idx = text.find("{")
        if idx != -1:
            text = text[idx:]
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        text = text[first : last + 1]
    # Remove trailing commas before ] or }
    text = re.sub(r",\s*([}\]])", r"\1", text)
    # Insert missing comma between } or ] and next { (array/object element boundary)
    text = re.sub(r"([}\]])[\s\n]*(\s*\"[^\"]*\"\s*:)", r"\1,\2", text)
    text = re.sub(r"([}\]])[\s\n]*(\s*\{)", r"\1,\2", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Replace unescaped newlines inside double-quoted strings (heuristic)
    def replace_newlines_in_quotes(m: "re.Match[str]") -> str:
        return m.group(0).replace("\n", " ")
    text = re.sub(r'"[^"]*"', replace_newlines_in_quotes, text)
    return json.loads(text)


def invoke_bedrock_section(
    context_text: str,
    section_id: SectionId,
    questions: List[Question],
    model_id: str = "anthropic.claude-3-haiku-20240307-v1:0",
    client: Optional[BaseClient] = None,
) -> dict:
    """
    Invoke Bedrock for a single section using the Map step.
    """
    if client is None:
        client = _get_bedrock_client()

    user_prompt = build_section_prompt(section_id, questions, context_text)

    raw = _invoke_bedrock_raw(
        client=client,
        model_id=model_id,
        system_prompt=SYSTEM_PROMPT,
        user_prompt=user_prompt,
        temperature=0.1,
        max_tokens=3000,
    )

    try:
        section_json = _parse_json_strict(raw)
        return section_json
    except json.JSONDecodeError as e:
        logger.warning("JSON parse failed for section %s: %s. Trying lenient parse.", section_id, e)
        try:
            section_json = _parse_json_lenient(raw)
            logger.info("Section %s: parsed with lenient fix (no repair needed)", section_id)
            return section_json
        except json.JSONDecodeError:
            logger.warning("Lenient parse failed. Retrying with repair prompt.")

    repair_prompt = (
        "You previously produced invalid JSON. Your ONLY task now is to fix it.\n"
        "Return the corrected JSON matching the exact schema, with no comments or explanations.\n\n"
        "Here is the invalid JSON:\n"
        f"{raw}\n"
    )

    repaired_raw = _invoke_bedrock_raw(
        client=client,
        model_id=model_id,
        system_prompt=SYSTEM_PROMPT,
        user_prompt=repair_prompt,
        temperature=0.0,
        max_tokens=3000,
    )

    try:
        section_json = _parse_json_strict(repaired_raw)
        return section_json
    except json.JSONDecodeError as e2:
        try:
            section_json = _parse_json_lenient(repaired_raw)
            logger.info("Section %s: parsed after lenient fix (repaired raw)", section_id)
            return section_json
        except json.JSONDecodeError:
            pass
        try:
            section_json = _parse_json_lenient(raw)
            logger.info("Section %s: parsed after lenient fix (original raw)", section_id)
            return section_json
        except json.JSONDecodeError:
            pass
        debug_path = Path(".") / f"debug_section_{section_id.replace(' ', '_')}.json"
        try:
            debug_path.write_text(repaired_raw, encoding="utf-8")
            logger.error("Wrote raw response to %s for debugging", debug_path)
        except Exception:
            pass
        logger.error("JSON repair failed for section %s: %s", section_id, e2, exc_info=True)
        raise ValueError(f"Failed to parse JSON for section {section_id} after repair: {e2}") from e2


# -----------------------------
# Evidence Guardrails
# -----------------------------


def _apply_evidence_guardrails(resp: dict) -> None:

    status = resp.get("status", "answered")
    answer = resp.get("answer")
    note = str(resp.get("note") or "").strip()

    snippets = resp.get("evidence_snippets")
    if not isinstance(snippets, list):
        snippets = []

    resp["evidence_snippets"] = [str(s) for s in snippets]

    note_lower = note.lower()

    no_info_phrases = [
        "no information",
        "not mentioned",
        "not stated",
        "no evidence",
        "no indication",
        "not discussed",
        "no details",
        "no data available",
        "not available",
    ]

    # ---------------------------
    # SKIP / NOT APPLICABLE
    # ---------------------------
    if status in ["skipped", "not_applicable"]:
        resp["answer"] = None
        resp["evidence_snippets"] = []
        if not note:
            resp["note"] = "Question not discussed or not applicable."
        return

    # ---------------------------
    # CRITICAL FIX: NO INFO DETECTION
    # ---------------------------
    if status == "answered":

        if any(p in note_lower for p in no_info_phrases):
            resp["status"] = "skipped"
            resp["answer"] = None
            resp["evidence_snippets"] = []
            resp["note"] = "Have not been able to discuss with family."
            return

        # ---------------------------
        # NO EVIDENCE → INSUFFICIENT DATA
        # ---------------------------
        if len(resp["evidence_snippets"]) == 0:
            resp["answer"] = "Insufficient data"
            resp["note"] = "Insufficient evidence to determine a rating."
            return

    # ---------------------------
    # NOTE SAFETY
    # ---------------------------
    if not note:
        resp["note"] = "Insufficient data; no explanation provided."

# -----------------------------
# Reducer + Validation
# -----------------------------


def merge_section_outputs(section_outputs: List[dict]) -> dict:

    errors: List[str] = []
    merged_sections: List[dict] = []

    for sec in section_outputs:
        section_id = sec.get("section_id")

        responses = sec.get("responses", [])
        normalized_responses: List[dict] = []

        for r in responses:

            q_id = str(r.get("q_id") or "").strip()
            question_text = str(r.get("question_text") or "").strip()

            # NORMALIZATION APPLIED
            status = normalize_status(r.get("status"))
            answer = normalize_answer(r.get("answer"))

            note = str(r.get("note") or "").strip()
            relevant = bool(r.get("relevant", True))

            # VALIDATION (NO CRASH)
            if status not in ALLOWED_STATUSES:
                logger.warning(f"Invalid status {status}, defaulting to 'answered'")
                status = "answered"

            if status == "answered":
                if answer not in ALLOWED_LABELS:
                    logger.warning(f"Invalid answer '{answer}', converting to Insufficient data")
                    answer = "Insufficient data"

            normalized = {
                "q_id": q_id,
                "question_text": question_text,
                "status": status,
                "answer": answer,
                "note": note,
                "evidence_snippets": r.get("evidence_snippets", []),
                "relevant": relevant,
            }

            _apply_evidence_guardrails(normalized)
            normalized_responses.append(normalized)

        merged_sections.append({
            "section_id": section_id,
            "responses": normalized_responses,
        })

    #  NO CRASH
    if errors:
        logger.warning("Validation warnings:\n" + "\n".join(errors))

    return {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "schema_valid": True,
        },
        "sections": merged_sections,
    }

    metadata = {
        "model": "anthropic.claude-3-haiku-20240307-v1:0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "needs_human_review": True,
        "schema_valid": True,
    }

    return {
        "metadata": metadata,
        "sections": merged_sections,
    }


if __name__ == "__main__":
    import sys

    base = Path(".")
    questions_csv = base / "questions.csv"

    if len(sys.argv) > 1 and sys.argv[1] == "--init":
        # Create placeholder assessment_ai.json from questions.csv (no Bedrock call)
        if not questions_csv.exists():
            raise SystemExit("questions.csv not found.")
        sections = load_questions_from_csv(questions_csv)
        section_outputs = []
        for section_id, qs in sections.items():
            section_outputs.append({
                "section_id": section_id,
                "responses": [
                    {
                        "q_id": q.q_id,
                        "question_text": q.question_text,
                        "answer": "Insufficient data",
                        "note": "Not yet assessed.",
                        "evidence_snippets": [],
                        "relevant": False,
                    }
                    for q in qs
                ],
            })
        merged = merge_section_outputs(section_outputs)
        out_path = base / "assessment_ai.json"
        out_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info("Wrote placeholder %s", out_path)
        raise SystemExit(0)

    """
    Example manual run (without Step Functions):
    - Reads context.txt from current directory
    - Calls Bedrock per section
    - Writes assessment_ai.json
    """
    base = Path(".")
    questions_csv = base / "questions.csv"
    context_path = base / "context.txt"

    if not context_path.exists():
        raise SystemExit("context.txt not found in current directory.")

    context_text = context_path.read_text(encoding="utf-8")
    sections = load_questions_from_csv(questions_csv)

    section_outputs: List[dict] = []
    for sid, qs in sections.items():
        logger.info("Invoking Bedrock for section %s with %d questions", sid, len(qs))
        section_json = invoke_bedrock_section(context_text=context_text, section_id=sid, questions=qs)
        section_outputs.append(section_json)

    merged = merge_section_outputs(section_outputs)
    out_path = base / "assessment_ai.json"
    out_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    logger.info("Wrote %s", out_path)

