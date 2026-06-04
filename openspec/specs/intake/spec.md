# intake Specification

## Purpose

51A hotline intake: audio capture, submission gates, and orchestration of AI outputs into the caseworker workflow (FR-1, FR-2, FR-3, FR-4).

**Related specs (avoid duplicating AI detail here):**

- `form-51a` — structured 51A form filling, checkpoint, official printable HTML  
- `ai-pipeline` — stage orchestration, anti-recursion, background gating  
- `ai-capabilities` — transcription, NLP, keywords, triage indicators, risk scoring, assistant messages

## Requirements

### Requirement: Case creation

The system MUST allow a screener to create a new 51A case record before or during audio upload.

#### Scenario: New intake case

- **Given** an authenticated screener
- **When** the user starts a new 51A intake
- **Then** the system creates a case with status `in_progress` and a unique case identifier

### Requirement: Secure audio upload

The system MUST accept encrypted upload of call recordings in MP3, WAV, or M4A format.

#### Scenario: Audio stored and pipeline started

- **Given** an in-progress case
- **When** the screener uploads a valid audio file
- **Then** the file is stored in object storage under `audio/input/`
- **And** the AI pipeline stage `transcription` is enqueued

### Requirement: Transcript with speaker attribution

The system MUST produce a transcript with segments attributed to screener (S) and caller (C).

#### Scenario: Transcript available in UI

- **Given** transcription stage completed
- **When** the screener views the intake page
- **Then** the transcript panel displays speaker-attributed lines
- **And** high-risk keyword segments MAY be highlighted

### Requirement: NLP feeds 51A form (see form-51a)

NLP extraction MUST merge into the `Report51A` aggregate; population, confirmation, and checkpoint completion are defined in `openspec/specs/form-51a/spec.md`.

#### Scenario: NLP triggers form review state

- **Given** NLP extraction completed
- **When** values are merged into the 51A form
- **Then** `form51a.checkpointStatus` becomes `ready_for_review`
- **And** the screener is prompted to review all four form sections

### Requirement: Risk score as decision support

The system MUST display a risk score from 1 to 20 with contributing factors and MUST NOT auto-determine screen-in/out from the score alone.

#### Scenario: Risk displayed with advisory label

- **Given** risk scoring completed
- **When** the intake page loads the risk card
- **Then** the score and contributing factors are shown
- **And** UI indicates the score is statistical, rule-based, and decision support only
- **And** the label is derived from configured risk bands when available

### Requirement: Risk recompute

The system MUST allow a screener to recalculate the statistical risk score from the current transcript and triage state without rerunning the full pipeline.

#### Scenario: Screener recomputes risk

- **Given** a case with transcript segments
- **When** the screener calls `POST /cases/{caseId}/risk/recompute`
- **Then** a new `risk_assessments` row is persisted with updated score and factors
- **And** the response includes the new score and band label

### Requirement: Triage flag human decision

The system MUST allow the screener to confirm or dismiss each AI triage flag; dismissal MUST require a documented reason.

#### Scenario: Dismiss without reason rejected

- **Given** a triage flag is shown
- **When** the screener dismisses the flag with an empty reason
- **Then** the API returns HTTP 400 Bad Request
- **And** the flag remains pending

#### Scenario: Multi-indicator escalation

- **Given** two or more triage flags are confirmed by the screener
- **When** the confirmations are saved
- **Then** the case is marked `emergency_routing`
- **And** the UI shows an escalation alert per DCF policy (demo)

### Requirement: Parallel background checks after 51A acceptance

Parallel background checks MUST start only after the screener completes the **51A form checkpoint** (`form-51a` spec: report accepted).

#### Scenario: Background status grid

- **Given** 51A form checkpoint is `complete`
- **When** background orchestration runs
- **Then** each source (Central Registry, CORI, SORI, FBI/NCIC, 911 CAD) shows status running, complete, or failed

### Requirement: Human-in-the-loop submission

The system MUST require explicit screener submission; AI pipeline completion alone SHALL NOT finalize the case. Submission MUST require 51A form checkpoint `complete`.

#### Scenario: Submit to supervisor

- **Given** 51A form checkpoint is `complete` and triage decisions are recorded
- **When** the screener submits to supervisor
- **Then** case status becomes `pending_review`
- **And** `form51a.checkpointStatus` becomes `locked`
- **And** audit records the submitting user

#### Scenario: Submit blocked when 51A incomplete

- **Given** 51A form checkpoint is not `complete`
- **When** the screener submits to supervisor
- **Then** the API returns HTTP 409 with code `FORM_51A_INCOMPLETE`
