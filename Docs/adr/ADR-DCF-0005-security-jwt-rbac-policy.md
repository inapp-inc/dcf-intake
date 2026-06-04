# ADR-DCF-0005: Demo Security Model (JWT, RBAC, PolicyEngine, Audit)

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D4** — Security model

## Context

DCF AIT handles **CONFIDENTIAL** child-welfare PII. The PRD (§9 Module 10, §12) requires human-in-the-loop, RBAC, auditability, and no automated legal determinations—even in demo. Production will use enterprise IdP; the demo must still **enforce** role boundaries and policy gates, not an anonymous or open API.

## Decision

1. **Authentication (demo):** JWT issued after demo role login (`POST /auth/login`), matching mockup role picker (Screener, Supervisor, Social Worker, IT Admin).
2. **Authorization:** RBAC policy module on every protected route; role matrix in architecture §14.3.
3. **Human-in-the-loop:** `PolicyEngine` in `api` blocks automated screen-in, removal, and legal determination actions; risk/triage remain advisory with override + audit.
4. **Audit:** Tamper-evident `audit_events` for reads/writes, checkpoint transitions, AI outputs, overrides; decorator/middleware pattern on use cases.
5. **Privacy:** Log redaction (case IDs, no raw PII in application logs); encryption in transit via nginx TLS.
6. **Production path:** OIDC/SAML adapter replaces JWT demo auth (platform ADR-0006); policy and audit rules unchanged.

### Demo secrets

- `JWT_SECRET`, DB and MinIO passwords via `.env` — never committed.

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| Anonymous / open demo API | Violates PRD security narrative and stakeholder demo realism |
| Auth only in frontend | Bypassable; fails security review |
| Hard-coded role in worker only | API must enforce gates (`FORM_51A_INCOMPLETE`, submit rules) |

## Consequences

### Positive

- Demonstrates Module 10 invariants for presales and architecture approval.
- Same policy hooks for demo and production IdP swap.
- IT Admin role isolated from routine PII where specified.

### Negative

- Demo JWT is not production-grade (accepted risk in `SDD_Assumptions.md`).
- Full ATO, PIA, and pen test remain production scope.

## Compliance

| Concern | Address |
|---------|---------|
| PRD §9, §12 | Human-in-the-loop, RBAC, audit |
| Platform ADR-0006 | Identity and isolation |
| Platform ADR-0013 | Classification §14, retention env |
| OpenSpec `auth-rbac`, `audit` | Behavior specs |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §14
- `openspec/specs/auth-rbac/spec.md`, `openspec/specs/audit/spec.md`
- `Docs/SDD_Assumptions.md`

## Related decisions

| ID | Relationship |
|----|----------------|
| **D7** | [ADR-DCF-0008](./ADR-DCF-0008-51a-checkpoint-gate.md) — PolicyEngine enforces checkpoint |
| **D8** | [ADR-DCF-0001](./ADR-DCF-0001-demo-inference-ollama.md) — audit model versions |
