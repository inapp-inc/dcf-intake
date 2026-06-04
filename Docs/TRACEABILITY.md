# Spec Traceability — DCF AIT Demo

**Keep in sync with:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §20 · **OpenSpec:** 8 domains in `openspec/specs/`

| Spec ID | PRD / UI source | OpenSpec | API | Architecture layer |
|---------|-----------------|----------|-----|------------------|
| S1 | FR-1, Mockup intake | `intake` | `POST /cases/{id}/audio`, `/transcript` | L1–L5, L9 |
| **S1a** | **FR-1.2–1.3, Mockup `FORM_FIELDS`** | **`form-51a`** | **`GET/PATCH /form51a`, `/complete-checkpoint`** | **L6 Report51A, L7 checkpoint** |
| **S1b** | **Written 51A 48hr, `dcf/51A-Report-Form.html`** | **`form-51a`** | **`GET /form51a/official`** | **L7 mapper, `templates/51A-Report-Form.html`** |
| S2 | FR-1.3–1.4 | `intake`, `form-51a` | `/submit` (gated) | L7 PolicyEngine |
| S3 | FR-2 | `intake` | `/background-checks` | L4 background, L5 orchestration |
| S4 | FR-3 | `intake`, `ai-capabilities` | `/risk`, `/risk/recompute`, `/risk/override` | L4 statistical risk (ADR-0009) |
| S5 | FR-4 | `intake` | `/triage-decisions` | L4 + L7 PolicyEngine |
| S6 | FR-5, Supervisor UI | `screening` | `/screening/*` | L7 screening context |
| S7 | FR-6, Briefing UI | `investigation` | `/briefing`, `/briefing/opened` | L6 document service |
| S8 | FR-7, Report UI | `investigation` | `/report51b/*`, `/field-memo/audio`, `/field-notes` | L6 + human approval + ASR memo |
| S9 | Module 9–10 | `auth-rbac`, `audit` | `/auth/*`, `/audit/*` | L1 security |
| S10 | §11 Pipeline | `ai-pipeline` | Pipeline status on case | L5 worker |
| S10a | FR-1.4–1.6, §13 L2–4 | `ai-capabilities` | WS transcript/triage, `/risk` | L4–L5 |
| S10b | FR-5–7 generative | `ai-capabilities`, `investigation` | `/briefing`, `/report51b/draft` | L4 document gen |
| S10c | Mockup AIT Assistant | `ai-capabilities` | `/assistant-messages`, WS | L7, L9 |
| S11 | §12 Security | `audit`, architecture §14 | All endpoints | L1 cross-cutting |
| S12 | Mockup login | `auth-rbac` | `POST /auth/login`, `POST /auth/demo-login` | L8 BFF |
| S13 | Admin triage config | `auth-rbac`, `ai-capabilities` | `GET/PUT /admin/triage-config` | `system_config.triage_config` |
| S14 | Admin risk framework | `auth-rbac`, `ai-capabilities` | `GET/PUT /admin/risk-framework` | `system_config.risk_framework` |
| S15 | Demo UX / dashboards | FSD §4 | `demo/frontend` role homes, `caseStats` | L9 presentation |
| S16 | Screening process doc | FSD, screening | `demo/docs/screening-51a-process.md` | Reference diagram |

**Change spec:** `openspec/changes/demo-enhancements-2026-05/`
