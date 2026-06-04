# investigation Specification

## Purpose

51B investigator workflows: pre-visit briefing and AI-assisted report documentation (FR-6, FR-7).

**Related:** Generative document behavior (evidence guardrails, JSON repair, voice memo transcription) is specified in `ai-capabilities`. Pipeline staging in `ai-pipeline`.

## Requirements

### Requirement: Pre-visit briefing generation

The system MUST generate a pre-visit briefing for an assigned worker within 30 minutes of assignment (demo: on-demand with simulated delay cap).

#### Scenario: Worker opens briefing

- **Given** a case assigned to the worker
- **When** the worker opens the 51B briefing page
- **Then** briefing includes family history, risk factors, protective factors, collateral contacts, and community resources
- **And** law enforcement accompaniment flag is shown when applicable

### Requirement: Briefing progress tracking

The system MUST record when a worker first opens the briefing so dashboards can show Pending vs In progress.

#### Scenario: Briefing marked in progress

- **Given** a case with briefing content available
- **When** the worker opens the briefing and the client calls `POST /cases/{caseId}/briefing/opened`
- **Then** `briefing_opened_at` is set
- **And** worker dashboard chips show In progress instead of Pending

### Requirement: Field notes and voice memo input

The system MUST accept field notes text and voice memo uploads for report generation.

#### Scenario: Voice memo transcribed

- **Given** the worker uploads audio via `POST /cases/{caseId}/field-memo/audio`
- **When** the `field_memo_transcribe` worker stage completes
- **Then** transcribed text is appended to `field_notes` (not mock timeout text)
- **And** `GET /cases/{caseId}/field-notes` returns the updated notes for the report UI

### Requirement: AI draft 51B report

The system MUST generate a structured first-draft 51B report from field notes and case data.

#### Scenario: Draft requires worker review

- **Given** field notes are submitted
- **When** draft generation completes
- **Then** the draft is marked `ai_generated` and editable by the worker
- **And** finalization is blocked until worker approval is recorded

### Requirement: Compliance validation before supervisor submit

The system MUST run compliance validation flagging missing mandatory report fields before supervisor sign-off.

#### Scenario: Compliance check

- **Given** a draft 51B report with missing determination
- **When** the worker runs compliance check
- **Then** the response lists missing mandatory fields
- **And** submit to supervisor is blocked until resolved
- **And** the field report UI surfaces compliance results and an explanatory note about validation scope (demo)

### Requirement: No automated determination

The system MUST NOT record Supported, Substantiated Concern, or Unsupported determination without explicit worker selection.

#### Scenario: Determination requires human

- **Given** an AI draft without worker determination
- **When** an automated pipeline attempts to set determination
- **Then** the operation is rejected by policy engine
