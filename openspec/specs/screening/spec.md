# screening Specification

## Purpose

Supervisor screening team workflows: pending review queue, AI case summaries, and screening decisions (FR-5).

**Related:** AI-generated summaries and clinical review auto-flag in `ai-capabilities`.

## Requirements

### Requirement: Pending review queue

The system MUST provide supervisors a list of cases pending their review with risk score and emergency indicators.

#### Scenario: Supervisor dashboard

- **Given** an authenticated supervisor
- **When** the supervisor opens the pending review view
- **Then** cases with status `pending_review` are listed with child identifier, risk score, and triage flag count

### Requirement: AI case summary

The system MUST attach an AI-generated one-page case summary to each pending review case before supervisor decision.

#### Scenario: Expand case summary

- **Given** a case pending review with a generated summary
- **When** the supervisor expands the case row
- **Then** the AI case summary and advisory recommendation are displayed
- **And** copy states supervisor retains full determination authority

### Requirement: Screening decision recording

The system MUST record supervisor decisions: approve screen-in, screen out, or request clarification with rationale.

#### Scenario: Approve screen-in

- **Given** a pending review case
- **When** the supervisor selects approve screen-in with required fields
- **Then** the case status updates per decision type
- **And** an audit event captures decision, rationale, and supervisor id

### Requirement: Emergency bypass

Emergency-flagged cases MUST route to emergency workflow and MUST NOT remain in standard screening team queue only.

#### Scenario: Emergency case routing

- **Given** a case with `emergency_routing` true
- **When** intake is submitted
- **Then** the case is visible in emergency workflow views
- **And** standard screening queue indicates emergency bypass (demo)

### Requirement: Supervisor case record view

Supervisors MUST open a read-only case record with risk card and triage section for cases in their queue.

#### Scenario: Supervisor views case record

- **Given** a supervisor with access to a pending or assigned case
- **When** the supervisor navigates to the case record page
- **Then** risk score, triage flags, and screening context are visible
- **And** triage confirm/dismiss actions are not available (read-only)
