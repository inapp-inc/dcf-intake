# OpenSpec — DCF AIT

**Source of truth** for behavior requirements. Architecture: `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md`.

## Domains (8)

| Domain | Spec file | Primary concern |
|--------|-----------|-----------------|
| auth-rbac | `specs/auth-rbac/spec.md` | Login, roles, access denial |
| intake | `specs/intake/spec.md` | Case lifecycle, submit gates, workflow |
| form-51a | `specs/form-51a/spec.md` | 51A sections, checkpoint, official HTML |
| ai-pipeline | `specs/ai-pipeline/spec.md` | Stage orchestration, anti-recursion |
| ai-capabilities | `specs/ai-capabilities/spec.md` | Transcription, NLP, triage, risk, docs, assistant |
| screening | `specs/screening/spec.md` | Supervisor queue, decisions |
| investigation | `specs/investigation/spec.md` | Briefing, 51B draft, approval |
| audit | `specs/audit/spec.md` | Append-only events, retention |

## Change packages

| Package | Status | Notes |
|---------|--------|-------|
| `changes/dcf-ait-platform-init/` | Design-time init | Proposal, design, tasks — 8 domains |
| `changes/demo-enhancements-2026-05/` | **Implemented** | Packaged `demo/` stack: statistical risk, HF inference, admin config, UX |

Spec bodies live in `specs/`; deltas are summarized in each change package’s `spec-deltas.md`.

## Config

`config.yaml` — project context, PRD/UI paths, domain list.
