# SDD Assumptions — DCF Automated Intake Tool (Demo)

**Version:** 1.2  
**Date:** 2026-05-28  
**Status:** Approved for architecture (requirements elicitation bypassed per stakeholder request)  
**Demo implementation:** `openspec/changes/demo-enhancements-2026-05/`

---

## Context

This project delivers a **demonstration platform** for the DCF Automated Intake Tool (AIT), derived from `DCF_AIT_PRD.md` and `mockup/DCF_AIT_UI.jsx`. Full stakeholder gap analysis and Gap Manager Portal questionnaire are **intentionally skipped** for Phase 0 to accelerate a deployable demo on a single VM via Docker.

---

## Assumptions (Demo vs Production PRD)

| Area | Demo assumption | Production target (PRD) |
|------|-----------------|-------------------------|
| Cloud | Single VM, Docker Compose | AWS GovCloud within EOHHS boundary |
| AI processing | **Packaged `demo/`:** Hugging Face Inference for LLM + ASR; **risk = statistical rules** ([ADR-DCF-0009](./adr/ADR-DCF-0009-statistical-risk-scoring.md)). **`codebase/deploy`:** Ollama + faster-whisper ([ADR-DCF-0001](./adr/ADR-DCF-0001-demo-inference-ollama.md)) | On-prem / GovCloud SageMaker + Bedrock |
| Integrations | Mock adapters (CCWIS, CORI, SORI, NCIC, 911) with realistic latency | Live agency systems via approved gateways |
| Identity | Demo JWT; username/password login + role-based nav | Enterprise IdP (SAML/OIDC) + application RBAC |
| Data store | **Packaged `demo/`:** SQLite + filesystem artifacts (`ARTIFACT_DIR`). **`codebase/deploy`:** PostgreSQL + MinIO + Redis | S3, DynamoDB, CCWIS as system of record |
| Audit retention | 90-day demo retention; schema supports 7-year export | S3 Object Lock WORM, 7-year retention |
| Telephony | Audio file upload only (mockup pattern) | SIP/VoIP + Kinesis streaming |
| Human-in-the-loop | Enforced in API (no auto screen-in/removal) | Same — hard system invariant |
| Compliance | Privacy-by-design patterns documented and implemented in demo scope | Full ATO, PIA, penetration test |

---

## Resolved without questionnaire

- **Scope:** FR-1 through FR-7 as demo capabilities; LLM/ASR stages use real models (HF in packaged demo); **risk uses statistical framework**, not LLM; external integrations remain mocked adapters.
- **Personas:** Screener, Supervisor, Social Worker (51B), IT Admin — aligned with UI mockup roles.
- **Non-goals:** Production CCWIS replacement, court filings, foster care case management.
- **Success (demo):** Role-based workflows runnable end-to-end on Docker; architecture traceable to PRD layers.

---

## Open risks (accepted for demo)

- Statistical risk weights are not equity-validated or calibrated to SACWIS (transparent demo only; production requires approved model).
- HF cloud inference for packaged demo sends PII off-VM (documented tradeoff; not production-acceptable without DPA).
- Encryption keys in demo use development KMS substitute (Docker secrets / env), not HSM.
- Cross-agency DUAs (EOHHS, MassHealth, DYS) are not executed.

---

## Traceability

**Architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` (canonical, v1.2+).

**OpenSpec (8 domains):** `auth-rbac`, `intake`, `form-51a`, `ai-pipeline`, `ai-capabilities`, `screening`, `investigation`, `audit` under `openspec/specs/`.

Architecture and OpenSpec artifacts reference PRD sections 5 (FR-1–7), 11 (pipeline + AI capabilities), 12 (security), and 13 (layered recommendation).
