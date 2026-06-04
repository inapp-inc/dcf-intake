# Change Proposal: demo-enhancements-2026-05

## Summary

Record and normative-update OpenSpec for the **implemented demo stack** under `demo/`: statistical risk scoring, admin-configurable triage/risk weights, worker briefing progress, real 51B field-memo transcription, role dashboards, light UI branding, and API/worker alignment with SQLite + filesystem artifacts.

## Motivation

- Initial OpenSpec (`dcf-ait-platform-init`) assumed Ollama-on-VM LLM risk and production data plane (Postgres/MinIO/Redis).
- The shipped demo uses **Hugging Face Inference** for LLM/ASR and a **3-container** layout; risk must be **transparent and statistical**, not probabilistic LLM output.
- Stakeholders need traceable specs for demo-only endpoints and UX behaviors added during implementation.

## Scope

**In scope**

- OpenSpec delta + updates to `ai-capabilities`, `ai-pipeline`, `intake`, `investigation`, `auth-rbac`
- `Docs/FSD-DEMO.md`, `Docs/TRACEABILITY.md`, `Docs/SPEC-ALIGNMENT.md`
- `openapi.yaml` — demo-critical endpoints added
- `demo/README.md` feature index
- ADR-DCF-0009 (statistical risk)

**Out of scope**

- Rewriting full `DCF-AIT-PLATFORM-ARCHITECTURE.md` production AI-8 (SageMaker) targets
- `codebase/` production stack changes

## Success criteria

1. Every implemented demo API route in `demo/api` is documented in `openapi.yaml` or explicitly listed as internal-only in `design.md`.
2. Risk scoring requirement states **rule-based additive** model; pipeline requires **triage before risk**.
3. `spec-deltas.md` maps each feature to an OpenSpec domain and file path under `demo/`.
4. Fresh deploy applies migrations **001–007** including `risk_framework` seed.

## Status

**Implemented** — specs updated to match code as of 2026-05-28.
