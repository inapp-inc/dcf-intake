# DCF AIT — Security, PII, RBAC & UI Audit

**Date:** 2026-05-28  
**Scope:** Post SEED-004 demo platform vs `mockup/DCF_AIT_UI.jsx`, OpenAPI, `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §14

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| UI vs mockup | **Mostly aligned** | Screener intake matches mockup flow (pipeline strip, live transcript, assistant chrome, legend, emergency badge). Supervisor/worker/admin functional; not pixel-perfect |
| Conversational transcript | **Implemented** | Worker streams `transcript.line` per Whisper segment; UI shows `TranscriptPanel` during processing; `assistant.refresh` on pipeline narration |
| RBAC (role + case) | **Implemented (demo)** | `requireRoles` + `requireCaseAccess` on all case-scoped narrative routes; worker status gate; admin blocked from narrative |
| PII controls | **Partial (demo)** | In-VM AI boundary; audit on sensitive reads; log redaction helper; production needs cookies, WS ticket, encryption |
| Demo auth | **By design** | Role picker JWT — not production IdP |

---

## 1. UI fidelity vs mockup (`DCF_AIT_UI.jsx`)

### Aligned

- Design tokens (navy, teal, coral, cards, chips, form field AI/miss styles)
- Intake layout: main column + 308px AIT Assistant panel
- Audio upload states (idle / processing / complete)
- Form sections (4 blocks), risk gauge, triage flags, submit bar
- Role login screen and sidebar navigation

### Gaps (addressed or tracked)

| Mockup element | Implementation | Action |
|----------------|----------------|--------|
| Case header `EmergBadge` + `RiskBadge` + time chip | Risk only after pipeline | Add emergency from case + initiated time |
| Assistant header gradient icon + “Active · Monitoring” | Simplified header | Restore mockup chrome |
| Assistant message type icons (circle + label) | Label only | Restore icon row |
| Legend (teal/amber squares) before form | Shown after complete | Show when form visible |
| Transcript during processing | Hidden until `txState===complete` | **Live transcript panel** on WS lines |
| Supervisor / worker / admin pages | Implemented SEED-004 | Continue polish |

---

## 2. Conversational transcript flow (mockup intent)

The mockup simulates **progressive disclosure**: upload → processing UI → transcript appears → assistant narrates → form populates.

### Required behavior

1. On audio upload, show processing state immediately.
2. **Stream transcript lines** into the transcript panel as ASR produces them (`transcript.line` over WebSocket).
3. Assistant panel receives **pipeline + assistant messages** during processing (not only after completion).
4. Form sections appear after transcription/NLP stages (checkpoint `ai_populating` → `ready_for_review`).

### Implementation (this pass)

- Worker: publish `transcript.line` per segment during Whisper loop.
- Worker: assistant narration at transcription start/complete and NLP start.
- Frontend: show `TranscriptPanel` when `processing` or lines exist; append on WS.
- Frontend: refetch assistant messages on `pipeline.stage` / `transcript.line`.

---

## 3. RBAC audit

### 3.1 Role enforcement (route level) — **Present**

Routes use `requireAuth` + `requireRoles(...)`. IT Admin blocked from case narrative endpoints via role lists.

### 3.2 Case-level authorization — **Was missing**

**Risk:** Any authenticated screener/supervisor/worker could access any `caseId` UUID (IDOR).

**Mitigation added:** `assertCaseAccess(caseId, role)` middleware:

| Role | Access rule |
|------|-------------|
| Screener | All cases except denied statuses (none for demo) |
| Supervisor | All cases (review queue) |
| Worker | Only `assigned`, `report_submitted` |
| Admin | **Deny** all case-scoped narrative endpoints |

### 3.3 Policy engine — **Underused**

`PolicyEngine` exists but screening decisions did not call `assertHumanAction`. Wired for supervisor decisions.

### 3.4 RBAC matrix compliance (architecture §14.3)

| Permission | Expected | Actual |
|------------|----------|--------|
| Intake / 51A write | Screener | ✓ |
| Official print | Screener, Supervisor, Worker | ✓ (worker read) |
| Case narrative | Screener, Supervisor, Worker | ✓ with case access |
| Supervisor decision | Supervisor | ✓ |
| 51B briefing/report | Worker | ✓ |
| Audit (case) | Supervisor, Admin | ✓ |
| System / models | Admin | ✓ |
| Admin case PII | **Deny** | ✓ (blocked) |

---

## 4. PII analysis

### 4.1 PII inventory

| Data | Location | Classification |
|------|----------|----------------|
| Call audio | MinIO `audio/input/` | CONFIDENTIAL |
| Transcript text | Postgres `transcript_segments` | CONFIDENTIAL |
| 51A fields | Postgres `form_51a_fields` | CONFIDENTIAL |
| Official HTML | API response (ephemeral) | CONFIDENTIAL |
| Risk / triage | Postgres | SENSITIVE |
| JWT claims | Client localStorage | displayName only (low) |
| Audit payloads | Postgres `audit_events` | May contain field counts, not full transcript |

### 4.2 PII flows

```
Caller audio → MinIO → ai-worker (Whisper) → Postgres transcript
                              ↓
                         Ollama (in-VM) ← transcript + form fields
                              ↓
                         NLP merge → form_51a_fields
```

**Positive:** Ollama on `ait-net` only; not published to host in default compose (ADR-DCF-0001).

**Risks:**

| Risk | Severity | Mitigation |
|------|----------|------------|
| JWT in `localStorage` | Medium (XSS) | HttpOnly cookie + CSP in production |
| WS `?token=` in URL | Medium (logs, Referer) | Subprotocol auth or short-lived WS ticket |
| Demo login (no password) | High for prod | IdP only in production |
| Default `INTERNAL_API_KEY` | High if exposed | Require env in production; network isolate |
| Application logs | Medium | PII redaction helper; no transcript in logs |
| Audit export | Medium | Supervisor-only; retention 90d config |
| Backup of Postgres/MinIO | High | Encrypt at rest; DCF key management |

### 4.3 Ollama / Whisper

- **Whisper:** Audio processed in worker; no external API.
- **Ollama:** Prompts include transcript excerpts and field values — **PII stays in VM** for demo; production must use GovCloud boundary per architecture.

### 4.4 Recommendations (production)

1. OIDC + MFA; remove demo role picker.
2. Case assignment table + `assertCaseAccess` enforced on every case route.
3. Encrypt MinIO and Postgres at rest; TLS everywhere.
4. WS auth via `Sec-WebSocket-Protocol` or one-time ticket from REST.
5. Structured audit on `GET .../transcript`, `GET .../form51a`, `GET .../official`.
6. DLP scan on exports; mask reporter phone in logs.

---

## 5. Security hardening audit

### 5.1 Implemented / improved (this pass)

| Control | Status |
|---------|--------|
| Security headers (API) | `X-Content-Type-Options`, `X-Frame-Options`, etc. |
| Case-level access middleware | `assertCaseAccess` |
| Production internal key guard | Fail boot if default key in `NODE_ENV=production` |
| Policy on screening decisions | `assertHumanAction` |
| PII-safe logging helper | Redact patterns in log payloads |
| Audit on sensitive reads | Transcript + official form open |

### 5.2 Existing

| Control | Status |
|---------|--------|
| TLS (nginx) | ✓ |
| nginx rate limit | ✓ `/api/` zone |
| CORS configured | ✓ `CORS_ORIGIN` |
| JWT expiry | ✓ 8h |
| Internal routes `X-Internal-Key` | ✓ |
| Human-in-the-loop submit gate | ✓ checkpoint complete |
| Form lock on submit | ✓ `locked` |

### 5.3 Remaining (production backlog)

| Item | Priority |
|------|----------|
| Replace demo login | P0 |
| HttpOnly session cookie | P0 |
| CSRF for cookie auth | P0 |
| `helmet` + strict CSP | P1 |
| Request size limits (除 audio) | P1 |
| Secrets rotation | P1 |
| Pen test / OWASP ZAP in SEED-005 | P1 |
| Dependency scanning in CI | P2 |

---

## 6. WebSocket security

- **Auth:** JWT in query string — functional for demo; log/referrer leakage risk.
- **Authorization:** No case access check on WS — **fixed:** verify case access at connection time.
- **Events:** No PII in event envelope beyond transcript lines (expected for subscribed clients).

---

## 7. Test plan (manual)

1. **Live transcript:** Screener uploads audio → transcript lines appear during processing without refresh.
2. **Assistant:** Messages appear after transcription and NLP (reload on WS).
3. **RBAC worker:** Worker token cannot `GET` `in_progress` case (403).
4. **RBAC admin:** Admin cannot `GET /cases/{id}/transcript` (403).
5. **IDOR:** Random UUID returns 404/403.
6. **Production key:** Set `NODE_ENV=production` without `INTERNAL_API_KEY` → API refuses start.

---

## 8. Sign-off

This audit is the baseline for **SEED-005** (OWASP checklist, `docker-compose.prod.yml`, extended smoke tests). UI and conversational flow fixes are applied in the same change set as this document.
