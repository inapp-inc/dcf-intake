# Technical Design: dcf-ait-platform-init

## Context

Initial platform design for DCF AIT demo. See `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` for consolidated architecture.

Project ADRs (accepted): `Docs/adr/README.md`.

## Decisions

### D1: Layered modular monolith + Python AI worker

**ADR:** [ADR-DCF-0002](../../Docs/adr/ADR-DCF-0002-layered-modular-monolith.md)

- **Choice:** Node.js `api` service hosts application/domain layers; `ai-worker` runs pipeline stages (Python).
- **Rationale:** Matches platform ADR preference (MERN core + Python capabilities); minimizes VM containers for demo.
- **Alternatives rejected:** Full microservice split (ops cost); pure Node AI (weak ML ecosystem).

### D2: MinIO + Redis + PostgreSQL

**ADR:** [ADR-DCF-0003](../../Docs/adr/ADR-DCF-0003-demo-data-plane.md)

- **Choice:** S3-compatible object store, Redis streams/pub-sub, Postgres SoR for demo.
- **Rationale:** Portable Docker stack; mirrors PRD S3/Lambda/Dynamo patterns conceptually.
- **Alternatives rejected:** Embedded SQLite (weak concurrency); direct host filesystem (no prefix triggers).

### D3: Contract-first OpenAPI + WebSocket adjunct

**ADR:** [ADR-DCF-0004](../../Docs/adr/ADR-DCF-0004-openapi-and-websocket.md)

- **Choice:** REST in `openapi.yaml`; real-time via WebSocket not fully specified in OpenAPI 3.0 (documented in architecture).
- **Rationale:** Frontend/backend parallel development; contract tests for REST.

### D4: Security cross-cutting layer

**ADR:** [ADR-DCF-0005](../../Docs/adr/ADR-DCF-0005-security-jwt-rbac-policy.md)

- **Choice:** JWT demo auth, RBAC policy module, audit decorator, `PolicyEngine` for human-in-the-loop invariants.
- **Rationale:** PRD §12 and §9 non-negotiables.

### D5: Integration adapters (mock)

**ADR:** [ADR-DCF-0006](../../Docs/adr/ADR-DCF-0006-mock-integration-adapters.md)

- **Choice:** Hexagonal ports `ICcwisGateway`, `IBackgroundCheckProvider` with mock implementations.
- **Rationale:** Demo without SACWIS sandbox; production swaps adapters only.
- **Note:** Mock adapters cover **external systems only** — not AI. All AI uses real models (Ollama SLM + faster-whisper).

### D6: Dual 51A representation

**ADR:** [ADR-DCF-0007](../../Docs/adr/ADR-DCF-0007-dual-51a-representation.md)

- **Choice:** JSON working copy (`Form51A`) + official HTML via `fill51A()` mapping.
- **Rationale:** Screener UX + agency printable form; NLP merges into JSON only.

### D7: Mandatory 51A checkpoint gate

**ADR:** [ADR-DCF-0008](../../Docs/adr/ADR-DCF-0008-51a-checkpoint-gate.md)

- **Choice:** Checkpoint `complete` required before supervisor submit and background checks (`409 FORM_51A_INCOMPLETE`).
- **Rationale:** Human-in-the-loop; AI fields confirmed before legal workflow steps.

### D8: Ollama SLM container (AI runtime)

**ADR:** [ADR-DCF-0001](../../Docs/adr/ADR-DCF-0001-demo-inference-ollama.md)

- **Choice:** Dedicated `ollama` Docker service; default model `llama3.2:3b` for all LLM-level operations. faster-whisper in `ai-worker` for ASR.
- **Rationale:** No stubs; minimal VM footprint; PII on `ait-net` only.

## Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Unauthorized case access | RBAC + audit |
| PII in logs | Redaction middleware |
| Prompt injection | Schema validation + evidence guardrails |
| Automation bias | No auto-determination APIs |
| Container escape | Non-root users, read-only root FS where possible |

## Data model (high level)

- `cases` (includes `form51a_checkpoint_status`), `form_51a_fields` (section, field_id, value, source, confirmed), `transcript_segments`, `triage_flags`, `risk_assessments`, `background_check_runs`, `screening_decisions`, `briefings`, `report_51b_versions`, `audit_events`, `pipeline_state`
- **Official printable:** static template `templates/51A-Report-Form.html`; runtime render via `MapReport51aToOfficialFields` + `fill51A()` injection (no separate DB table; derived on read)

## Patterns considered

See `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §7.1 (patterns) and §11 (AI capabilities).

## OpenSpec alignment

Behavior specs live in `openspec/specs/` (not duplicated in this change folder). Domains: `auth-rbac`, `intake`, `form-51a`, `ai-pipeline`, `ai-capabilities`, `screening`, `investigation`, `audit`.

## Residual risks

- Demo JWT is not suitable for production.
- Single-node Postgres is not HA.
- Local SLM quality may not meet PRD accuracy thresholds (models are real; benchmarks are production targets).
- First `docker compose up` downloads the Ollama model via `ollama-init` (network + disk required).
