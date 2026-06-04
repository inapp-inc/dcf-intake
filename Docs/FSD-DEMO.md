# Functional Specification: DCF Automated Intake Tool (Demo)

**Version:** 1.1  
**Date:** 2026-05-28  
**Status:** Demo scope — aligned with packaged `demo/` implementation  
**Change spec:** `openspec/changes/demo-enhancements-2026-05/`  
**Source:** `DCF_AIT_PRD.md`, `mockup/DCF_AIT_UI.jsx`  
**Assumptions:** `Docs/SDD_Assumptions.md`  
**Architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` (§11 AI capabilities)

---

## 1. Executive Summary

The DCF AIT demo modernizes 51A intake and 51B investigation workflows with AI as **decision support only**. Screeners upload call audio, review AI-populated 51A fields, parallel background checks, risk scores, and emergency triage flags. Supervisors review AI summaries; workers receive pre-visit briefings and AI-drafted 51B reports. All human overrides are logged.

---

## 2. Goals & Success Criteria (Demo)

| Goal | Success metric |
|------|----------------|
| End-to-end screener intake | Upload audio → transcript → fields → risk/triage → submit within one session |
| Role separation | Four roles (screener, supervisor, worker, admin) see only permitted views |
| Human-in-the-loop | API rejects automated screen-in, removal, or final determination without human actor |
| Docker deploy | `docker compose up` on a single VM exposes UI + API + pipeline |
| Spec traceability | Each epic maps to OpenSpec requirements and architecture layers |

**Out of scope (demo):** Live CCWIS, production IdP, real CJIS queries, video processing, statewide rollout.

---

## 3. Personas

| Persona | Primary workflows |
|---------|-------------------|
| **Screener** | Queue, new 51A intake, audio upload, form review, triage confirm/dismiss |
| **Supervisor** | Pending review, AI case summaries, approve/screen out/clarify |
| **Social Worker** | Assigned cases, pre-visit briefing, 51B draft from field notes |
| **IT Admin** | System status, triage keyword config, statistical risk weights, AI model governance (read-only metrics) |

---

## 4. Functional Requirements (Demo epics)

### Epic 1: Authentication & RBAC (FR-adjacent, Module 9)

- **US-1.1** User selects role at login (demo) or authenticates via IdP (future).
- **AC:** Each API call carries role; unauthorized case access returns 403; access logged.

### Epic 2: 51A Intake (FR-1, FR-4, partial FR-2)

**OpenSpec:** `intake`, `form-51a`, `ai-pipeline`, `ai-capabilities`

- **US-2.1** Upload call recording (MP3/WAV/M4A); pipeline produces transcript with speaker labels (see `ai-capabilities`: transcription, diarization).
- **US-2.2** NLP auto-populates 51A sections (child, incident, reporter, household); missing required fields flagged; confidence thresholds per `ai-capabilities`.
- **US-2.3** **51A form completion checkpoint (mandatory):** Screener reviews all four sections, confirms or edits AI fields, fills mandatory gaps, and explicitly completes the 51A checkpoint before submit.
- **US-2.3a** **Official 51A printable:** Platform maps gathered data into `dcf/51A-Report-Form.html`; screener opens filled form in a new tab and prints/saves PDF (48-hour written report support).
- **US-2.4** Real-time triage flags (five emergency indicators) with evidence snippets; confirm/dismiss with mandatory dismissal reason (`ai-capabilities`).
- **US-2.5** Parallel background checks start **after** 51A checkpoint complete; status panel shows per-source progress (`ai-pipeline`).
- **US-2.6** **Statistical** risk score 1–20 (additive point model) with contributing factors; recompute from transcript; override with reason (audit only) (`ai-capabilities`, ADR-DCF-0009).
- **US-2.7** AIT Assistant surfaces missing fields, triage alerts, and pipeline status (`ai-capabilities`).
- **AC:** Matches mockup intake layout; AI fields visually distinct; submit disabled until 51A checkpoint `complete`; escalation when ≥2 triage flags confirmed.

### Epic 3: Supervisor review (FR-5)

**OpenSpec:** `screening`, `ai-capabilities` (summary generation, clinical review flag)

- **US-3.1** Queue of pending cases with AI one-page summary and recommendation (advisory).
- **AC:** Approve / screen out / request clarification actions persisted with auditor identity.

### Epic 4: 51B worker (FR-6, FR-7)

**OpenSpec:** `investigation`, `ai-capabilities` (generative docs, evidence guardrails)

- **US-4.1** Pre-visit briefing within 30 minutes of assignment (demo: on-demand generation); briefing **opened** marks in-progress on worker dashboards.
- **US-4.2** Field notes + **real** voice memo transcription (HF ASR) → AI draft 51B report; compliance check before submit; report stepper UI.
- **AC:** Draft marked AI-generated; worker approval required before supervisor routing.

### Epic 5: Audit & governance (Module 9–10)

- **US-5.1** Tamper-evident audit events for AI outputs, overrides, and record access.
- **US-5.2** Admin views model versions and system health (no case PII for IT admin role).
- **US-5.3** Admin configures triage keywords/indicators and statistical risk framework weights.
- **AC:** Audit query API returns events for a case ID; admin role cannot read case narrative content; config changes apply on next pipeline run or risk recompute.

---

## 5. Non-functional requirements (Demo)

| Category | Target |
|----------|--------|
| Availability | Single-instance demo; health endpoints for all services |
| Security | TLS at edge; secrets via env; RBAC; no PII in application logs |
| Privacy | Data minimization; encryption at rest for object store and DB |
| Usability | Light theme demo UI; DCF MA branding; role home dashboards; stat cards match list filters |
| Performance | Background check mock completes ≤30s; transcript demo ≤10s |

---

## 6. Acceptance criteria (release gate for demo)

1. All four roles complete primary happy path on Docker deployment.
2. **51A form:** Screener cannot submit to supervisor until checkpoint `complete`; API returns `FORM_51A_INCOMPLETE` otherwise.
3. **51A form:** AI-populated fields require confirmation or human edit before checkpoint completion.
4. **Official 51A:** `GET /form51a/official` returns HTML with child, guardian, reporter, and narrative fields filled from case data; opens in new tab for print.
5. Triage dismissal without reason is rejected by API.
6. Risk override and triage decisions appear in audit log.
7. Background checks do not start before 51A checkpoint completion.
8. **AI capabilities:** Transcript, NLP merge, triage indicators, **statistical** risk score, and assistant behaviors match `openspec/specs/ai-capabilities/spec.md`.
9. OpenAPI contract validates for documented endpoints (including `/form51a`, `/assistant-messages`, `/admin/risk-framework`, `/cases/{id}/risk/recompute`, field memo routes).
10. Architecture `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` and **8** OpenSpec domain specs under `openspec/specs/`.
11. Risk runs after triage in pipeline; migration **007** seeds `risk_framework` on fresh deploy.
12. Worker 51B voice memo produces real transcription in `field_notes` (not mock delay text).
