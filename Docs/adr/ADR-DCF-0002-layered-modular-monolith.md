# ADR-DCF-0002: Layered Modular Monolith with Python AI Worker

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D1** — Application structure

## Context

DCF AIT spans intake UI, REST/WebSocket APIs, domain rules (51A checkpoint, RBAC, audit), and a multi-stage AI pipeline (transcription, NLP, risk, documents). The demo must deploy on a **single VM** with manageable operational complexity while remaining aligned with the PRD’s nine-layer model and the InApp platform **MERN + Python capabilities** pattern (platform ADR-0001).

Teams need clear module boundaries for future extraction without paying the cost of full microservices on day one.

## Decision

1. Adopt a **layered modular monolith** with two primary runtimes:
   - **`api`** (Node.js / Express): L7–L8 application and domain layers, REST, WebSocket, form render, `PolicyEngine`, audit.
   - **`ai-worker`** (Python): L5 orchestration and L4 AI capability stages (pipeline consumers).
2. **`frontend`** (React): L9 presentation only; no business rules in the browser beyond UX validation.
3. **`nginx`**: L8 edge (TLS, routing) — not a fourth application tier.
4. Enforce **bounded contexts** inside `api` (Intake, Form51A, Screening, Investigation, Governance) with explicit use cases and repository interfaces.
5. Defer splitting AI into per-stage microservices; optional Compose profiles remain **deferred** per architecture §7.1.

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| Full microservices per PRD layer | Ops overhead, network chatter, and debugging cost on a single demo VM |
| Pure Node.js for AI pipeline | Weak ML/ASR ecosystem; harder Whisper and structured NLP tooling |
| Monolith without layers | Blurred boundaries; harder OpenSpec traceability and adapter swaps |

## Consequences

### Positive

- Matches platform ADR-0001 and PRD layering conceptually.
- One VM footprint: `nginx`, `frontend`, `api`, `ai-worker`, data stores, `ollama`.
- Clear strangler path (platform ADR-0016) to extract `ai-worker` or integration adapters later.

### Negative

- `api` and `ai-worker` must coordinate via Postgres, Redis, and MinIO contracts.
- Shared deployment unit means coordinated releases for tightly coupled changes.

## Compliance

| Concern | Address |
|---------|---------|
| Platform ADR-0001 | MERN core + Python capabilities |
| Platform ADR-0016 | Extraction path documented |
| OpenSpec | Eight domains map to modules inside `api` + worker |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §8, §9
- `openspec/changes/dcf-ait-platform-init/design.md` — D1
- `codebase/README.md`

## Related decisions

| ID | Relationship |
|----|----------------|
| **D2** | [ADR-DCF-0003](./ADR-DCF-0003-demo-data-plane.md) — shared data plane |
| **D8** | [ADR-DCF-0001](./ADR-DCF-0001-demo-inference-ollama.md) — Python worker hosts ASR |
