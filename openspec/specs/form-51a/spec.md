# form-51a Specification

## Purpose

Define the **51A report form** as a first-class workflow artifact and **mandatory intake checkpoint**. AI auto-population supports the screener; completing and attesting the 51A form is required before supervisor submission, background-check acceptance, or screening routing (FR-1.2, FR-1.3, PRD written 51A within 48 hours).

This spec complements `intake` (workflow), `ai-capabilities` (NLP extraction into fields), and `ai-pipeline` (NLP stage trigger) by governing structured field sections, completion state, human attestation, and **generation of the official DCF printable 51A HTML form** (`dcf/51A-Report-Form.html`).

**Architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §12–§13.

## Requirements

### Requirement: Canonical 51A form sections

The system MUST model the 51A intake form as four sections aligned with DCF intake practice and the UI mockup:

| Section ID | Title | Examples of fields |
|------------|-------|-------------------|
| `child` | Child Information | name, DOB, age, gender, address, school |
| `incident` | Incident Details | allegation type, incident date, description |
| `reporter` | Reporter Information | reporter type, name, callback number |
| `household` | Household Members | caregiver, alleged responsible party, other children |

Each field MUST declare: `required` (boolean), `source` (`human` \| `ai` \| `ccwis`), `value`, `aiConfidence` (optional), `confirmedByHuman` (boolean).

#### Scenario: Form structure returned to UI

- **Given** an in-progress intake case
- **When** the screener opens the 51A form view
- **Then** the API returns all four sections with field metadata
- **And** the response includes overall checkpoint status

### Requirement: AI population feeds the form checkpoint

When NLP extraction completes, the system MUST merge extracted values into the 51A form with `source=ai` and `confirmedByHuman=false`.

#### Scenario: NLP updates form after transcript

- **Given** transcription and NLP stages completed
- **When** the screener loads the form
- **Then** AI-filled fields are visually distinguishable in the UI (teal highlight per mockup)
- **And** fields below confidence threshold remain empty with `missing` flag

### Requirement: Screener may edit any field

The screener MUST be able to enter or correct any 51A field at any time while the case is `in_progress`.

#### Scenario: Manual correction of AI field

- **Given** an AI-populated child name
- **When** the screener edits the value
- **Then** the field `source` becomes `human`
- **And** `confirmedByHuman` is true
- **And** an audit event records the change

### Requirement: AI field human confirmation

For fields populated by AI with sufficient confidence, the screener MUST confirm or edit them before the 51A checkpoint can complete.

#### Scenario: Batch confirm AI fields in section

- **Given** the child section has unconfirmed AI fields
- **When** the screener confirms all fields in the section
- **Then** each confirmed field has `confirmedByHuman=true`
- **And** section completion status updates

#### Scenario: Cannot complete checkpoint with unconfirmed AI fields

- **Given** at least one AI field remains unconfirmed
- **When** the screener attempts to complete the 51A checkpoint
- **Then** the API returns HTTP 400 with a list of fields requiring confirmation or edit

### Requirement: Mandatory field validation

The system MUST enforce the 51A mandatory field set before checkpoint completion and before submit-to-supervisor.

#### Scenario: Missing DOB blocks checkpoint

- **Given** date of birth is required and empty
- **When** the screener attempts `POST .../form51a/complete-checkpoint`
- **Then** the API returns HTTP 400 listing `child.child_dob` (or equivalent field id)
- **And** checkpoint status remains `incomplete`

#### Scenario: Real-time missing field alert during call

- **Given** the screener is on the intake page before call end (demo: before submit)
- **When** a mandatory field is still empty
- **Then** the AI assistant surfaces an alert (FR-1.3)
- **And** the form section shows a missing-field chip count per mockup

### Requirement: 51A form completion checkpoint

The system MUST expose an explicit **51A Form Completion** checkpoint distinct from AI pipeline completion.

Checkpoint states:

| State | Meaning |
|-------|---------|
| `not_started` | Case created; no form data |
| `ai_populating` | NLP merge in progress |
| `ready_for_review` | AI merge done; screener must review sections |
| `incomplete` | Screener editing; mandatory or confirmation gaps remain |
| `complete` | All mandatory fields filled; AI fields confirmed or overridden |
| `locked` | Submitted to supervisor; form read-only except supervisor-authorized correction |

#### Scenario: Complete checkpoint success

- **Given** all mandatory fields have values
- **And** all AI-sourced fields are confirmed or replaced by human entry
- **When** the screener completes the 51A checkpoint
- **Then** checkpoint status becomes `complete`
- **And** audit event `form51a.checkpoint.completed` is recorded
- **And** parallel background checks MAY be initiated (report accepted)

#### Scenario: Submit to supervisor requires completed 51A

- **Given** checkpoint status is not `complete`
- **When** the screener calls submit to supervisor
- **Then** the API returns HTTP 409 Conflict with code `FORM_51A_INCOMPLETE`
- **And** response includes checkpoint summary and missing items

### Requirement: Form checkpoint visible in case status

Case summary and pipeline UI MUST show 51A form checkpoint separately from transcription/risk pipeline stages.

#### Scenario: Dashboard shows form status

- **Given** a case in the screener queue
- **When** the dashboard loads
- **Then** each row indicates 51A form status (e.g. `Form: Incomplete` or `Form: Complete`)

### Requirement: Written 51A readiness (demo)

Upon checkpoint completion, the system SHOULD generate a structured call summary artifact for supervisor review (FR-1.5 demo: async document job).

#### Scenario: Summary queued after form complete

- **Given** 51A checkpoint just completed
- **When** document generation is enabled
- **Then** a supervisor call summary job is enqueued
- **And** case metadata records `callSummaryStatus=pending`

### Requirement: Official printable 51A HTML form

The system MUST populate the official DCF **51A Report Form** HTML template from the current `Form51A` working copy (and system fields such as report date) using the field mapping defined in `codebase/api/schemas/51a-official-field-map.json`.

#### Scenario: Auto-fill from gathered intake data

- **Given** a case with child name, address, and incident description in the working copy
- **When** the official form is rendered
- **Then** corresponding HTML fields (e.g. `child1_name`, `child1_address`, `q_nature`) are set via `fill51A()`
- **And** unmapped fields remain empty for screener completion in the printable view

#### Scenario: Open printable form in new tab

- **Given** an authenticated screener on the intake page
- **When** the screener chooses “Open 51A for printing”
- **Then** the browser opens `GET /api/v1/cases/{caseId}/form51a/official` in a new tab
- **And** the page displays the official layout with toolbar **Print / Save PDF**
- **And** audit event `form51a.official.opened` is recorded

#### Scenario: Printable form reflects latest working copy

- **Given** the screener updates a field in the intake UI working copy
- **When** the screener re-opens the official printable form
- **Then** mapped HTML fields reflect the updated values

#### Scenario: Draft preview before checkpoint complete

- **Given** 51A checkpoint is not yet `complete`
- **When** the screener opens official form preview
- **Then** the HTML is still generated from available data
- **And** a visible DRAFT indicator is shown (demo)
- **And** supervisor submit remains blocked until checkpoint completes

#### Scenario: Print hides toolbar

- **Given** the official form is open in the browser
- **When** the screener uses Print or Save as PDF
- **Then** the sticky toolbar is not printed (`@media print` in template)
- **And** only the two-page 51A content appears on the output
