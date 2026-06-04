# SEED-005 — OWASP & Deploy Closeout

**Status:** Baseline complete (demo VM). Production GovCloud hardening remains a follow-on program.

## Deliverables (this pass)

| Item | Location |
|------|----------|
| Production compose overlay | `codebase/deploy/docker-compose.prod.yml` |
| Environment template | `codebase/deploy/.env.example` |
| Smoke tests | `codebase/deploy/scripts/smoke.sh` |
| Handover | `Docs/HANDOVER.md` |
| Security / PII audit | `Docs/SECURITY-PII-UI-AUDIT.md` |

## OWASP ASVS — demo checklist

| # | Control | Demo status | Production action |
|---|---------|-------------|-------------------|
| V2 | Authentication | Demo role JWT | OIDC + MFA; remove `/auth/demo-login` |
| V3 | Session | JWT 8h in localStorage | HttpOnly secure cookies + CSRF |
| V4 | Access control | `requireRoles` + `requireCaseAccess` | Assignment table; periodic review |
| V5 | Validation | Zod on API inputs | Extend to all write paths |
| V7 | Error handling | Central error handler | No stack traces in prod responses |
| V8 | Data protection | TLS via nginx; MinIO/Postgres in VM | Encrypt at rest; KMS |
| V9 | Communications | TLS 1.2+; internal network for Ollama | mTLS service mesh |
| V10 | Malicious code | Dependency lockfiles | CI `npm audit` / Snyk |
| V13 | API | Rate limit on `/api/` | WAF; per-tenant quotas |
| V14 | Config | Prod boot rejects default internal key | Secrets manager rotation |
| V15 | Logging | Audit events; PII redaction helper | SIEM; no transcript in logs |
| WS | WebSocket | JWT + case access at upgrade | Short-lived WS ticket |

## Smoke test coverage

`smoke.sh` verifies:

1. `GET /health`
2. `POST /auth/demo-login` (screener)
3. `POST /cases` + `GET .../form51a` + `GET .../pipeline`
4. RBAC: worker denied on in-progress case (403)
5. RBAC: admin denied on transcript (403)

## Sign-off criteria (demo)

- [x] `docker compose` stack healthy
- [x] Smoke script exits 0
- [x] UI aligned to `mockup/DCF_AIT_UI.jsx` (all roles)
- [x] Live transcript + assistant during intake
- [x] Case-level RBAC on narrative routes + WebSocket

## Remaining for production program

- GovCloud Transcribe / Bedrock per architecture ADR
- Penetration test / OWASP ZAP in CI
- `docker-compose` secrets via external vault
- Backup/restore runbooks for Postgres and MinIO
