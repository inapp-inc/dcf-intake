# ai-capabilities Specification

## Purpose

Enumerate every AI-enabled capability in the DCF AIT platform beyond raw pipeline staging. Complements `ai-pipeline` (orchestration) and domain specs (`intake`, `form-51a`, `investigation`, `screening`).

**Canonical architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §11 (capability catalog AI-1–AI-16). Demo inference: [ADR-DCF-0001](../../Docs/adr/ADR-DCF-0001-demo-inference-ollama.md). Aligned with PRD FR-1–7, §11–12, Module 10, and UI mockup AIT Assistant.

## Requirements

### Requirement: Transcription with speaker diarization

The system MUST transcribe 51A call audio and attribute segments to screener (S) and caller (C).

#### Scenario: Transcript displayed during intake

- **Given** audio processing completes
- **When** the screener views the transcript panel
- **Then** each segment shows speaker attribution
- **And** demo uses faster-whisper ASR (real inference; production WER target validated pre go-live)

### Requirement: Transcript cleaning before NLP

The system MUST clean raw ASR output before NLP extraction (whitespace normalization, duplicate word removal, speaker segment normalization).

#### Scenario: Clean text passed to NLP

- **Given** raw transcribe JSON exists
- **When** the clean stage runs
- **Then** downstream NLP receives cleaned text preserving intentional repeated names/addresses

### Requirement: NLP extraction with confidence thresholds

The NLP engine MUST extract 51A structured fields with per-field confidence; fields below threshold MUST NOT auto-populate without screener review.

#### Scenario: Low confidence field omitted

- **Given** NLP confidence for date of birth is below threshold
- **When** fields merge into Form51A
- **Then** the field remains empty with missing flag
- **And** the assistant alerts the screener

### Requirement: Real-time keyword and triage detection

The system MUST evaluate high-risk keywords and five emergency triage indicators with target latency ≤5 seconds from qualifying speech (production SLA).

#### Scenario: Weapon keyword highlighted

- **Given** transcript contains a weapon-related phrase
- **When** keyword detection runs
- **Then** the transcript line is highlighted in the UI
- **And** a triage flag is created with evidence text

### Requirement: Five emergency triage indicators

The triage engine MUST evaluate: (1) child under 5, (2) weapon present, (3) prior removal, (4) perpetrator in home, (5) reporter imminent fear.

#### Scenario: Multi-indicator escalation

- **Given** two or more indicators are confirmed by the screener
- **When** confirmations are saved
- **Then** emergency routing is applied per FR-4.4

### Requirement: Statistical risk score as advisory

The system MUST produce risk score 1–20 using a **rule-based additive** model (baseline points, keyword hits, triage flag severity with pending multiplier, emergency bonus), capped to the configured scale. The score MUST be **statistical and explainable** (per-factor point lines), not a probabilistic or LLM-inferred probability. Score MUST NOT auto-trigger screen-in, removal, or legal action.

**Demo implementation:** `statistical-v1` framework in `system_config.risk_framework`; detail in `demo/docs/risk-scoring-framework.md` and [ADR-DCF-0009](../../../Docs/adr/ADR-DCF-0009-statistical-risk-scoring.md).

#### Scenario: Contributing factors list point additions

- **Given** triage flags and keyword hits exist for a case
- **When** risk scoring completes
- **Then** `contributingFactors` entries describe each component with explicit point values (e.g. `Keyword: weapon (+4)`)
- **And** `modelVersion` identifies the statistical framework version (e.g. `statistical-v1`)

#### Scenario: Risk override audited

- **Given** a risk score is displayed
- **When** the screener overrides with reason
- **Then** audit records prior score, reason, and model version
- **And** the stored statistical score is unchanged unless recompute is invoked

#### Scenario: Admin adjusts risk weights

- **Given** an authenticated admin
- **When** the admin saves an updated `risk_framework` via `PUT /admin/risk-framework`
- **Then** subsequent risk scoring and recompute use the new weights

### Requirement: Generative documents with evidence guardrails

Document generation for summaries, briefings, and 51B drafts MUST include evidence citations or use "Insufficient data" for unsupported claims.

#### Scenario: Unsupported claim omitted

- **Given** document generation for a briefing section
- **When** no source evidence exists for a claim
- **Then** the claim is omitted or replaced with insufficient-data text
- **And** validation rejects documents without required evidence structure

### Requirement: JSON repair and schema validation for LLM outputs

Malformed generative JSON MUST trigger a repair attempt (max 3 retries) before failing safe without exposing raw model output.

#### Scenario: Malformed JSON repaired

- **Given** Ollama returns malformed JSON
- **When** repair loop runs
- **Then** a valid document is produced or the stage fails with user-safe notification

### Requirement: AIT Assistant contextual messages

The system MUST provide an intake assistant that surfaces completion status, missing fields, and triage alerts with optional navigation to form fields.

#### Scenario: Assistant warns missing DOB

- **Given** date of birth is missing after NLP
- **When** the screener opens the assistant panel
- **Then** a warning message references the missing field with jump link

### Requirement: Clinical review auto-flag

The system MUST flag cases meeting clinical review threshold (3+ qualifying incidents in 12 months for same child/family) when CCWIS history is available.

#### Scenario: Clinical flag on supervisor queue

- **Given** CCWIS history shows 3+ incidents in 12 months
- **When** screening summary is prepared
- **Then** clinical review flag is visible to supervisor

### Requirement: Model version provenance

Every AI output MUST record the model or prompt template version that produced it in audit metadata.

#### Scenario: Risk score audit includes version

- **Given** a risk score is generated
- **When** audit event is written
- **Then** payload includes model version identifier

### Requirement: Admin triage and risk configuration

The IT admin role MUST configure triage keyword patterns, LLM triage indicators, and statistical risk weights without access to case narrative content.

#### Scenario: Admin updates triage keywords

- **Given** an authenticated admin
- **When** the admin saves triage config via `PUT /admin/triage-config`
- **Then** the next intake pipeline triage stage loads indicators and regex patterns from the database

#### Scenario: Admin updates risk framework

- **Given** an authenticated admin
- **When** the admin saves risk framework via `PUT /admin/risk-framework`
- **Then** the worker and API statistical risk functions use the normalized framework JSON

### Requirement: 51B field memo transcription

The system MUST transcribe worker-uploaded 51B field voice memos and append text to case field notes for draft generation.

#### Scenario: Voice memo appended to field notes

- **Given** a worker uploads audio to `POST /cases/{caseId}/field-memo/audio`
- **When** the `field_memo_transcribe` pipeline stage completes
- **Then** transcribed text is appended to `field_notes`
- **And** the worker report UI can poll or receive WebSocket completion

### Requirement: Demo LLM runtime (packaged `demo/` stack)

The packaged demo under `demo/` MUST use Hugging Face Inference for LLM stages (NLP, triage reasoning, documents, assistant) and ASR (intake audio, field memos), per `demo/README.md`. **Risk scoring MUST NOT use the LLM** (see statistical risk requirement).

The `codebase/deploy` stack MAY use Ollama per [ADR-DCF-0001](../../../Docs/adr/ADR-DCF-0001-demo-inference-ollama.md) when that compose profile is deployed.

#### Scenario: Demo worker calls Hugging Face for NLP

- **Given** the packaged demo `ai-bundle` worker processes NLP
- **When** structured extraction is requested
- **Then** the worker uses the configured HF chat/completions endpoint with `HF_API_TOKEN`
- **And** risk stage uses only the statistical scoring module

### Requirement: AI processing boundary

Production deployments MUST NOT send child welfare PII to external commercial cloud AI platforms outside the authorized government boundary.

#### Scenario: Packaged demo sends PII to HF (accepted demo deviation)

- **Given** the packaged demo on a single VM with `HF_API_TOKEN` set
- **When** LLM or ASR stages run with case PII
- **Then** requests go to Hugging Face Inference over HTTPS
- **And** the UI and README document this as a demo-only privacy tradeoff
