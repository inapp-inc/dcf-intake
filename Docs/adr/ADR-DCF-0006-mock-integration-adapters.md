# ADR-DCF-0006: Hexagonal Mock Integration Adapters (External Systems Only)

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D5** — Integrations

## Context

The PRD requires parallel background checks (CORI, SORI, NCIC, Central Registry, 911), CCWIS read/write, and agency gateways. The demo cannot connect to live SACWIS/CCWIS or criminal justice systems. The architecture still needs **realistic workflows** (latency, partial failure, per-source status) without coupling domain logic to mock HTTP details.

**AI inference is not an integration mock** — transcription and LLM use real models per [ADR-DCF-0001](./ADR-DCF-0001-demo-inference-ollama.md).

## Decision

1. Define **hexagonal ports** for external systems, including at minimum:
   - `ICcwisGateway`
   - `IBackgroundCheckProvider` (or per-source ports behind a facade)
2. Ship **mock adapters** in demo that return plausible structured responses and configurable latency.
3. Keep use cases dependent on **interfaces only** — production replaces adapters with PrivateLink/gateway implementations (architecture §21).
4. Background orchestration (AI-7) runs **after** 51A checkpoint complete; mocks simulate parallel fan-out, not ML.
5. Clinical review flag and CCWIS history rules consume **mock CCWIS** data with deterministic thresholds (e.g. 3+ incidents / 12 months).

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| Direct CCWIS HTTP calls in use cases | No sandbox; tight coupling |
| Skip background/CCWIS entirely | Breaks FR-2 and screening demo flows |
| Stub AI as “integration” | Conflates ML with agency systems; ruled out by ADR-DCF-0001 |

## Consequences

### Positive

- End-to-end demo without agency DUAs or VPNs.
- Strangler pattern (architecture §7.1) for real CCWIS later.
- OpenSpec scenarios can assert per-source grid states.

### Negative

- Mock data is not legally authoritative.
- Equity/accuracy of cross-agency data not validated in demo.

## Compliance

| Concern | Address |
|---------|---------|
| Platform ADR-0002 | Plugins/adapters |
| PRD FR-2 | Parallel background pattern |
| ADR-DCF-0001 | AI remains real; mocks are external only |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §8 L3, §11.3 stage 5
- `openspec/changes/dcf-ait-platform-init/design.md` — D5
- `Docs/SDD_Assumptions.md` — integrations row

## Related decisions

| ID | Relationship |
|----|----------------|
| **D7** | [ADR-DCF-0008](./ADR-DCF-0008-51a-checkpoint-gate.md) — background after checkpoint |
| **D2** | [ADR-DCF-0003](./ADR-DCF-0003-demo-data-plane.md) |
