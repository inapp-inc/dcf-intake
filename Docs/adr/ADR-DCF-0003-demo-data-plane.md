# ADR-DCF-0003: Demo Data Plane (PostgreSQL, MinIO, Redis)

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D2** — Demo data plane

## Context

The demo must persist cases, 51A working-copy fields, audit events, and pipeline state while storing large artifacts (audio, transcripts, AI stage outputs). The PRD production stack uses S3, DynamoDB/streams, and CCWIS as system of record. The demo needs a **portable, Docker-native** stack that mirrors those roles without cloud dependencies.

Object-prefix triggers drive the event-driven AI pipeline (PRD §11); a plain filesystem on the host does not provide the same contract.

## Decision

1. **PostgreSQL 16** — system of record for demo transactional data: cases, `form_51a_fields`, transcripts metadata, triage, risk, screening, audit, `pipeline_state`.
2. **MinIO** — S3-compatible artifact store: `audio/input/`, `transcribe/output/`, `nlp/output/`, etc., with prefix-based stage handoff.
3. **Redis 7** — job queue, pub/sub (`case:{id}:events`), pipeline notifications, WebSocket fan-out support from `api`.
4. **No shared database** across future extracted services (platform ADR-0004): only `api` and `ai-worker` connect to Postgres today, via defined schemas.
5. Configure via environment: `DATABASE_URL`, `MINIO_*`, `REDIS_URL` in `codebase/deploy/.env.example`.

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| SQLite | Weak concurrent writers; poor fit for worker + API |
| Host filesystem only | No S3 API; harder prefix-event pattern and portability |
| MongoDB for everything | PRD/demo alignment uses relational case + form model; Postgres fits checkpoint queries |

## Consequences

### Positive

- Single `docker compose` brings up full data plane.
- MinIO maps cleanly to production S3 + Object Lock (audit) migration.
- Redis sufficient for demo; outbox pattern optional per architecture §7.1.

### Negative

- Single-node Postgres is not HA (accepted demo risk).
- MinIO bucket lifecycle and anti-recursion rules must be implemented in worker code.
- Demo retention (90 days) differs from production 7-year WORM.

## Compliance

| Concern | Address |
|---------|---------|
| Platform ADR-0004 | Clear ownership: Postgres vs MinIO vs Redis |
| Platform ADR-0005 | Redis + object events for async pipeline |
| PRD §11 | Stage prefixes on MinIO |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §10, §11.3, §17
- `codebase/deploy/docker-compose.yml`
- `openspec/specs/ai-pipeline/spec.md`

## Related decisions

| ID | Relationship |
|----|----------------|
| **D1** | [ADR-DCF-0002](./ADR-DCF-0002-layered-modular-monolith.md) |
| **D5** | [ADR-DCF-0006](./ADR-DCF-0006-mock-integration-adapters.md) — CCWIS mock does not replace Postgres SoR |
