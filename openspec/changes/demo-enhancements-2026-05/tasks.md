# Tasks — demo-enhancements-2026-05

## Phase A — Risk & pipeline

- [x] Statistical risk domain module + `risk_framework` seed (migration 007)
- [x] Worker `run_risk` uses `risk_scoring.compute_statistical_risk`
- [x] Enqueue risk after triage completes
- [x] API `GET/PUT /admin/risk-framework`
- [x] API `POST /cases/:id/risk/recompute` (synchronous)
- [x] `demo/docs/risk-scoring-framework.md`

## Phase B — Admin & triage

- [x] `GET/PUT /admin/triage-config` + Admin Triage Keywords UI
- [x] Admin Risk Scoring UI + nav entry

## Phase C — Worker 51B

- [x] `POST /cases/:id/briefing/opened` (migration 006)
- [x] `POST /cases/:id/field-memo/audio`, `GET field-notes`, worker `field_memo_transcribe`
- [x] WorkerReport real upload + compliance UI

## Phase D — UX & dashboards

- [x] Light theme, DCF MA branding, InApp logo fix
- [x] Role home pages, intake progress tracker
- [x] Stat cards aligned with list filters
- [x] CaseRecordPage (supervisor/worker)
- [x] Sidebar active-state fix
- [x] `demo/docs/screening-51a-process.md`

## Phase E — Specs & contract

- [x] OpenSpec domain updates
- [x] Change package `demo-enhancements-2026-05`
- [x] FSD, TRACEABILITY, SPEC-ALIGNMENT, openapi.yaml
- [x] ADR-DCF-0009
