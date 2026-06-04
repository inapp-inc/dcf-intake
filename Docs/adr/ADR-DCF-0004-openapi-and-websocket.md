# ADR-DCF-0004: Contract-First OpenAPI REST and WebSocket Adjunct

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D3** — API contracts

## Context

Frontend (React), `api`, and `ai-worker` must evolve in parallel during SEED implementation. The UI mockup and PRD imply both request/response APIs and **real-time** updates (transcript lines, pipeline status, form field changes, triage alerts). Ad-hoc JSON contracts cause drift between OpenSpec, OpenAPI, and code.

## Decision

1. **REST API v1** is defined in repository-root **`openapi.yaml`** — contract-first, all paths under `/api/v1/`.
2. **Breaking changes** require a new major version and parallel support period per platform **ADR-0009**.
3. **WebSocket** endpoints for real-time intake are documented in architecture §15 (adjunct to OpenAPI 3.0, which does not fully specify WS).
4. Implementation generates or hand-maintains types from OpenAPI where the project supports it; any API change **updates OpenAPI first**, then code.
5. Contract tests validate REST against OpenAPI; WebSocket behavior validated via OpenSpec scenarios and integration tests.

### Representative REST surfaces

| Area | Examples |
|------|----------|
| Auth | `POST /auth/login` |
| Intake | `/cases`, `/audio`, `/transcript` |
| Form 51A | `/cases/{id}/form51a`, `/form51a/official` |
| AI | `/risk`, `/assistant-messages` |
| Screening / Investigation | `/screening/*`, `/briefing`, `/report51b/*` |
| Audit | `/audit/*` |

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| Ad-hoc JSON per endpoint | Drift from OpenSpec; blocks parallel FE/BE work |
| GraphQL only | Not in PRD/mockup; higher demo cost |
| WebSocket-only API | Poor fit for CRUD, forms, and printable HTML |

## Consequences

### Positive

- Traceability from PRD → OpenSpec → OpenAPI → implementation.
- Demo role picker and form APIs align with mockup `FORM_FIELDS`.
- Production can add API gateway versioning without changing domain model.

### Negative

- WebSocket contract lives outside OpenAPI file — must keep architecture §15 in sync.
- Two transport patterns (REST + WS) for client implementers.

## Compliance

| Concern | Address |
|---------|---------|
| Platform ADR-0009 | `/api/v1`, versioning rules |
| Platform ADR-0010 | Contract tests |
| OpenSpec | Eight domains reference REST behaviors |

## References

- `openapi.yaml`
- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §15
- `Docs/TRACEABILITY.md`

## Related decisions

| ID | Relationship |
|----|----------------|
| **D4** | [ADR-DCF-0005](./ADR-DCF-0005-security-jwt-rbac-policy.md) — auth on all REST/WS |
| **D6–D7** | Form 51A endpoints in OpenAPI |
