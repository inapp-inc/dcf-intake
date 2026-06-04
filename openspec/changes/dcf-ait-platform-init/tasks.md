# Tasks: dcf-ait-platform-init

## Phase 0 — Architecture (this change) ✅

- [x] `Docs/SDD_Assumptions.md`
- [x] `Docs/FSD-DEMO.md`
- [x] `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` (consolidated)
- [x] `Docs/ARCHITECTURE.md` (redirect)
- [x] `openspec/specs/**` (8 domains: incl. `form-51a`, `ai-capabilities`)
- [x] `openspec/changes/dcf-ait-platform-init/*`
- [x] `openapi.yaml`
- [x] `codebase/deploy/docker-compose.yml`
- [x] Codebase skeleton README

## Phase 1 — Platform foundation (SEED-001)

- [x] Postgres migrations for core entities
- [x] **`form_51a_fields` + `form_51a_checkpoint` columns on cases**
- [ ] **51A JSON schema validation (`codebase/api/schemas/51a-form.schema.json`)** — zod on PATCH; full AJV optional
- [x] API scaffold: Express + health + auth middleware
- [x] **Use cases: `CompleteForm51aCheckpoint`, `SubmitCaseToSupervisor` (gate)** — `MergeNlpIntoForm51a` repo helper ready for worker
- [x] **`MapReport51aToOfficialFields` + `RenderOfficial51AHtml` (template + field-map.json)**
- [x] MinIO bucket bootstrap script
- [x] Redis connection + pipeline enqueue helper
- [x] Audit writer module
- [x] **Deploy scripts:** `package-demo.sh`, `deploy-demo.sh`, `gen-dev-certs.sh`, `smoke.sh` — update manifest after each feature build

## Phase 2 — AI pipeline (SEED-002) ✅

- [x] ai-worker: stage handlers with anti-recursion (`should_skip_stage`)
- [x] Transcript cleaning stage (PRD §11.5) — `clean` stage + MinIO artifact
- [x] **faster-whisper** transcription + streaming partials (WS `transcript.line`)
- [x] **Ollama** NLP extraction + confidence threshold merge (API `POST /internal/.../nlp-merge`)
- [x] Keyword engine + **Ollama** triage engine (5 indicators)
- [x] **Ollama** risk scoring with contributing factors + model version audit
- [x] Background parallel mock (5 sources — integration adapters, not AI)
- [x] **Ollama** document generator + JSON repair (`parse_json_object`)
- [x] AIT Assistant via **Ollama** (api sync path) + field-jump messages
- [x] Clinical review flag rule (mock CCWIS history — 4 incidents)
- [x] Hexagonal ports in `worker/ports.py`; adapters: `whisper_asr`, `ollama_client` (no AI stubs)
- [x] Ollama client: health check, retry, `model.unavailable` audit callback
- [x] API: multipart audio upload, intake routes, internal routes, WebSocket `/ws/cases/:id`

## Phase 3 — Frontend (SEED-003) ✅

- [x] Vite + React app from mockup components (`codebase/frontend/src`)
- [x] **Port `FormSection` → driven by `GET /form51a` + PATCH / confirm-section**
- [x] **Checkpoint UX: disable “Submit to Supervisor” until `checkpointStatus=complete`**
- [x] **“Open 51A for printing” → fetch official HTML + new tab**
- [x] **Section confirm-AI + missing-field chips wired to form API**
- [x] Role routing (screener intake live; supervisor/worker/admin placeholders for SEED-004)
- [x] WebSocket client (`useCaseWebSocket`) for pipeline + form events
- [x] `VITE_API_BASE_URL` env (compose build arg + `.env.example`)

## Phase 4 — Workflows (SEED-004) ✅

- [x] Screener intake end-to-end **including 51A form fill → official print preview → checkpoint → submit**
- [x] Supervisor review actions (`/screening/pending`, `/screening/:id/decision`)
- [x] Worker briefing + 51B draft flow (Ollama draft, compliance check, approve)
- [x] Admin health + governance pages (`/admin/health`, `/admin/models`)

## Phase 5 — Deploy & validate (SEED-005) ✅ (demo baseline)

- [x] Production-oriented `docker-compose.prod.yml` (TLS certs volume)
- [x] `.env.example` documented
- [x] Smoke test script (health, case flow, RBAC 403 checks)
- [x] OWASP checklist in `Docs/SEED-005-OWASP-CLOSEOUT.md`
- [x] `Docs/HANDOVER.md` install and validation section
- [x] `Docs/VM-RUNBOOK.md` — VM packaging, deploy, patch, troubleshoot

## Traceability

| Task phase | OpenSpec domains | PRD FR |
|------------|------------------|--------|
| 1–2, 4 | **form-51a**, **ai-capabilities**, ai-pipeline, intake | FR-1–4, FR-1.2–1.3, FR-2 |
| 2 | **ai-capabilities**, ai-pipeline | FR-1, §11, Module 10 (AI stages) |
| 4 | investigation, **ai-capabilities** | FR-5–7 generative, assistant |
| 4 | screening | FR-5 |
| 4 | investigation | FR-6–7 |
| 1, 4 | auth-rbac, audit | Module 9–10 |
