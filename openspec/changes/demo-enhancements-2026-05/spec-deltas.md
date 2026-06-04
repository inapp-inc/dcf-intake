# Spec deltas — demo-enhancements-2026-05

Normative changes merged into `openspec/specs/`. Use this file for review diffs; domain specs are source of truth.

## ai-capabilities

| Change | Requirement |
|--------|-------------|
| **MODIFIED** | Actuarial/LLM risk → **Statistical risk score** (additive points, `statistical-v1`) |
| **MODIFIED** | Demo inference: packaged demo uses HF for LLM/ASR; Ollama requirement applies to `codebase/deploy` only |
| **ADDED** | Admin-configurable risk framework weights |
| **ADDED** | Admin-configurable triage keywords and LLM indicators |
| **ADDED** | 51B field memo transcription via HF ASR (worker stage) |

## ai-pipeline

| Change | Requirement |
|--------|-------------|
| **MODIFIED** | Risk stage runs **after** `keywords_triage` completes, not in parallel with NLP |
| **ADDED** | `field_memo_transcribe` stage for 51B voice memos (outside 51A intake pipeline) |

## intake

| Change | Requirement |
|--------|-------------|
| **ADDED** | `POST /cases/:id/risk/recompute` — synchronous statistical recalc |
| **MODIFIED** | Risk label from configured bands, not hardcoded thresholds only |

## investigation

| Change | Requirement |
|--------|-------------|
| **ADDED** | Briefing opened timestamp and in-progress UI state |
| **ADDED** | Field memo audio upload + poll/WS until transcription appended |
| **MODIFIED** | Compliance validation surfaced in 51B report UI before supervisor routing |

## auth-rbac

| Change | Requirement |
|--------|-------------|
| **ADDED** | Admin role may read/write `triage_config` and `risk_framework` without case narrative access |

## screening

| Change | Requirement |
|--------|-------------|
| **ADDED** | Supervisor case record view (read-only) with triage and risk cards |

## Non-normative (documented only)

- Light UI theme and DCF MA branding (`demo/frontend`)
- Stat card counts use shared filter helpers
- Username/password login (`POST /auth/login`) in addition to role picker

## Code references

| Feature | Primary paths |
|---------|----------------|
| Risk framework | `demo/api/src/domain/risk/framework.ts`, `demo/worker/worker/risk_scoring.py` |
| Migrations | `demo/api/migrations/004_system_config.sql` … `007_risk_framework_seed.sql` |
| Admin routes | `demo/api/src/routes/admin.ts` |
| Pipeline | `demo/worker/worker/pipeline/stages.py` |
