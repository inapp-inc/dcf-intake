# Design: demo-enhancements-2026-05

## D9 — Statistical risk scoring (replaces LLM risk for demo)

| Aspect | Decision |
|--------|----------|
| Model | Additive point weights from baseline, keyword hits, triage flags, emergency |
| Scale | 1–20 integer, capped; bands configurable (default High ≥15, Moderate ≥10) |
| Config | `system_config.risk_framework` JSON; admin UI `GET/PUT /admin/risk-framework` |
| Version | `model_version` = `statistical-v1` (or framework `version` field) |
| Override | Audit-only; does not recalculate stored score |
| Recompute | `POST /cases/:id/risk/recompute` runs **synchronously** in API (no queue) |
| Worker | Same formula in `demo/worker/worker/risk_scoring.py` for pipeline stage |
| Detail doc | `demo/docs/risk-scoring-framework.md` |

**Rationale:** Explainable, reproducible scores for demo governance conversations; avoids treating LLM JSON as actuarial output.

## D10 — Pipeline ordering: triage → risk

| Before | After |
|--------|-------|
| NLP enqueued `keywords_triage` and `risk` in parallel | NLP enqueues triage only |
| Risk could run before triage flags exist | `keywords_triage` completion enqueues `risk` |

## D11 — Packaged demo data plane & inference

| Layer | `codebase/deploy` | `demo/` |
|-------|-------------------|---------|
| DB | PostgreSQL | SQLite (`/data/ait.db`) |
| Queue | Redis | SQLite job poll |
| Artifacts | MinIO | Filesystem `ARTIFACT_DIR` (module name `minio_store` is legacy) |
| LLM/ASR | Ollama + local whisper (ADR-0001) | Hugging Face Inference (`HF_API_TOKEN`) |

Triage **reasoning** remains LLM; risk does **not**.

## D12 — Admin configurability

| Key | Admin UI | Purpose |
|-----|----------|---------|
| `triage_config` | Triage Keywords | Regex patterns + LLM indicator list |
| `risk_framework` | Risk Scoring | Point weights and bands |

## D13 — Worker 51B enhancements

- `POST /cases/:id/briefing/opened` — sets `briefing_opened_at`; UI shows Pending → In progress
- `POST /cases/:id/field-memo/audio` — upload; worker stage `field_memo_transcribe` (HF ASR) appends to `field_notes`
- `GET /cases/:id/field-notes` — read merged notes
- 51B report UI: stepper, compliance check, existing draft/approve APIs only

## D14 — UX / branding (demo)

- Light theme; title **Department of Children and Families, Commonwealth of Massachusetts**; header **DCF, MA**
- InApp logo via bundled asset + `VITE_BASE_PATH`
- Sidebar: single org line; only **active** nav route highlighted
- Role home dashboards; intake progress tracker; shared stat-card filters (`caseStats` / `navOptions`)
- Process diagram: `demo/docs/screening-51a-process.md` (Mermaid)

## D15 — Supervisor / screener surfaces

- `CaseRecordPage` for supervisor/worker read-only case view
- Supervisor screening status, field screening queue filters aligned with stat cards
- Emergency routing + risk ≥ 13 unchanged for supervisor rules

## Internal-only (not in public OpenAPI)

- Worker `POST /internal/*` callbacks with `X-Internal-Key`
- Pipeline artifact paths under `ARTIFACT_DIR`
