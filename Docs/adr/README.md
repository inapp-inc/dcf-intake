# DCF AIT — Architecture Decision Records

Project-specific ADRs for the DCF Automated Intake Tool (AIT). These supplement the **platform ADR library** at `system-prompts-skills/architecture-adr/` (ADR-0001–ADR-0018).

Canonical architecture: `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §7 (decisions D1–D8).

| ADR | Arch. ID | Title | Status |
|-----|----------|-------|--------|
| [ADR-DCF-0001](./ADR-DCF-0001-demo-inference-ollama.md) | **D8** | Demo LLM inference with Ollama (dedicated container) | Accepted |
| [ADR-DCF-0002](./ADR-DCF-0002-layered-modular-monolith.md) | **D1** | Layered modular monolith + Python AI worker | Accepted |
| [ADR-DCF-0003](./ADR-DCF-0003-demo-data-plane.md) | **D2** | Demo data plane (PostgreSQL, MinIO, Redis) | Accepted |
| [ADR-DCF-0004](./ADR-DCF-0004-openapi-and-websocket.md) | **D3** | Contract-first OpenAPI REST + WebSocket adjunct | Accepted |
| [ADR-DCF-0005](./ADR-DCF-0005-security-jwt-rbac-policy.md) | **D4** | Demo security (JWT, RBAC, PolicyEngine, audit) | Accepted |
| [ADR-DCF-0006](./ADR-DCF-0006-mock-integration-adapters.md) | **D5** | Hexagonal mock integration adapters (external systems only) | Accepted |
| [ADR-DCF-0007](./ADR-DCF-0007-dual-51a-representation.md) | **D6** | Dual 51A representation (JSON working copy + official HTML) | Accepted |
| [ADR-DCF-0008](./ADR-DCF-0008-51a-checkpoint-gate.md) | **D7** | Mandatory 51A checkpoint gate | Accepted |
| [ADR-DCF-0009](./ADR-DCF-0009-statistical-risk-scoring.md) | **D9** | Statistical (rule-based) risk scoring in packaged demo | Accepted |
