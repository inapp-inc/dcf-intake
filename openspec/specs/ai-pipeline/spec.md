# ai-pipeline Specification

## Purpose

Event-driven AI processing pipeline aligned with PRD §11: staged processing, anti-recursion, partial failure tolerance.

**Related:** Per-stage AI behavior (models, SLAs, guardrails) is in `ai-capabilities`. Form merge rules are in `form-51a`. Architecture §11 in `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md`.

## Requirements

### Requirement: Staged object-storage pipeline

The pipeline MUST process artifacts through ordered stages triggered by object storage events (or equivalent message enqueue).

#### Scenario: Transcription follows upload

- **Given** an audio object is written to `audio/input/{caseId}/`
- **When** the capture event is processed
- **Then** a transcription job is enqueued
- **And** case pipeline state records `transcription` as `running`

### Requirement: Anti-recursion guard

Each pipeline worker MUST ignore events for objects under its own output prefix.

#### Scenario: Output file does not retrigger same stage

- **Given** transcription worker writes to `transcribe/output/{caseId}/`
- **When** an object-created event fires for that key
- **Then** the transcription worker does not start a duplicate job for that object

### Requirement: NLP output merges into 51A form

When the NLP stage completes, the API application layer MUST merge extractions into the `Report51A` form and set `form51a.checkpointStatus` to `ready_for_review`. Pipeline success does not imply 51A form completion (see `form-51a` spec).

#### Scenario: Form state updated after NLP

- **Given** NLP worker writes `nlp/output/{caseId}.json`
- **When** the merge handler runs
- **Then** form sections are updated with `source=ai` where confidence allows
- **And** the case is eligible for screener 51A form review

### Requirement: Risk after triage; background after 51A checkpoint

Risk scoring MUST run only after the `keywords_triage` stage completes (or fails over to keyword-only triage flags), so triage flag rows exist for the statistical model. Background check orchestration MUST run only after the 51A form checkpoint is `complete` (report accepted).

#### Scenario: Risk enqueued after triage

- **Given** NLP has enqueued `keywords_triage` with transcript payload
- **When** triage stage completes and triage flags are persisted
- **Then** the risk stage is enqueued with the same transcript context
- **And** risk is not enqueued in parallel at NLP completion

#### Scenario: Background waits for 51A checkpoint

- **Given** NLP and risk stages completed but 51A checkpoint is not `complete`
- **When** the coordinator evaluates background eligibility
- **Then** background checks are not started
- **And** they start automatically when `form51a.checkpoint.completed` event fires

### Requirement: Document generation merge gate

Document generation MUST wait until both risk output and background output exist (or timed partial completion with flags).

#### Scenario: Documents after merge

- **Given** risk and background stages completed
- **When** the merge condition is satisfied
- **Then** document generation stage runs
- **And** produces summary artifacts under `documents/{caseId}/`

### Requirement: Schema validation gate

AI-generated documents MUST pass schema validation before exposure in the caseworker UI.

#### Scenario: Invalid document rejected

- **Given** document generator returns non-conforming JSON
- **When** validation runs
- **Then** the artifact is moved to `failed/validation/`
- **And** the case shows a safe worker notification without raw model output

### Requirement: Evidence guardrail on generative outputs

Generative summaries MUST include evidence snippets traceable to source data or return insufficient-data indicator.

#### Scenario: Summary without evidence

- **Given** document generation for a case summary
- **When** the model cannot cite source evidence for a claim
- **Then** that claim is omitted or replaced with `Insufficient data`
- **And** the output is not marked validated until compliant

### Requirement: Pipeline failure does not block intake UI

Failures in non-critical stages MUST NOT prevent the screener from editing fields and saving drafts.

#### Scenario: Transcription failure

- **Given** transcription fails
- **When** the screener continues intake
- **Then** manual field entry remains available
- **And** case displays transcription-unavailable status

### Requirement: 51B field memo pipeline stage

The worker MUST support a `field_memo_transcribe` stage independent of the 51A intake pipeline, triggered by field memo audio upload.

#### Scenario: Field memo stage does not restart 51A pipeline

- **Given** a case in worker investigation phase
- **When** field memo audio is uploaded
- **Then** only `field_memo_transcribe` runs
- **And** intake stages (transcription through documents) are not re-enqueued
