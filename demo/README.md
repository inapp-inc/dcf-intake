# Child Welfare Intake — Demo stack

Independent copy of the platform under `demo/` for a **simpler deployment**:

| Full `codebase/deploy` | This demo |
|------------------------|-----------|
| PostgreSQL + Redis + MinIO | **SQLite** + **filesystem** artifacts |
| ~9 containers | **PM2:** API + worker; nginx serves static SPA |
| Docker optional | Legacy: **3** containers (`nginx`, `api`, `ai-bundle`) |
| External DB optional | Single volume `/data` |

**Frontend** and **API/worker behavior** match production. All AI (ASR + LLM) runs on **Hugging Face Inference** — zero local model RAM. Storage and queue layers are simplified implementations in the `demo/` copies only — [`codebase/`](../codebase/) is unchanged.

## Quick start (local / already extracted)

```bash
cd demo
cp .env.example .env
cp config/ai.env.example config/ai.env
# Edit .env (JWT_SECRET, INTERNAL_API_KEY) and config/ai.env (HF_API_TOKEN or Ollama)
./scripts/up.sh
```

## Package and deploy (VM — PM2, no Docker)

**Build machine:**

```bash
cd demo
# Edit config/ai.env after first run if needed (HF_API_TOKEN or LLM_PROVIDER=ollama)
./deploy/create-archive.sh
# or: ./scripts/package-pm2.sh
# → ../dist/intake-demo-staging/  (zip manually before transfer)
```

**Target VM:**

```bash
./scripts/deploy-pm2.sh /path/to/intake-demo-pm2.zip
# Or: unzip to /var/www/intake-demo && sudo bash start.sh
pm2 save && pm2 startup
```

Runbook: [`docs/DEPLOY-RUNBOOK.md`](docs/DEPLOY-RUNBOOK.md)

- Loopback API: `http://127.0.0.1:11110/api/v1/health`
- Public: `https://client-demo.inapp.com/intake/` (nginx serves SPA + proxies API)

**Docker (legacy):** `package-docker.sh` / `deploy-docker.sh` — see [`docs/VM-RUNBOOK.md`](docs/VM-RUNBOOK.md).

## Frontend architecture (demo)

| Layer | Path | Role |
|-------|------|------|
| Routes | `frontend/src/routes/` | Lazy-loaded pages (`lazyPages.ts`), role switcher (`RoleViews.tsx`) |
| Hooks | `frontend/src/hooks/` | `useApiQuery` (data), `useAsyncAction` (mutations), `useCaseWebSocket` |
| API | `frontend/src/api/` | `client.ts`, `http.ts` (timeouts), `errors.ts` |
| UI | `frontend/src/components/ui/` | `LoadingSpinner`, `QueryState`, `BackButton`, `PageShell` |

Role pages load on demand via `React.lazy` — only the active role’s bundle is fetched.

### Authentication

The demo UI is **not** a static JSX shell — it uses a real session layer:

| Piece | Location |
|-------|----------|
| Login + session restore | `frontend/src/auth/AuthProvider.tsx`, `RequireAuth.tsx` |
| JWT in `localStorage` | `frontend/src/auth/session.ts` |
| Bearer on every API call | `frontend/src/api/client.ts` (`authRequest`) |
| Role-based nav | `frontend/src/auth/guards.ts` + sidebar |
| API enforcement | `demo/api/src/middleware/auth.ts` (`requireAuth`, `requireRoles`) |

Flow: choose role → username/password form → `POST /auth/login` → JWT → `GET /auth/me`.

Demo accounts (click **Demo credentials** on the login form to fill):

| Role | Username | Password |
|------|----------|----------|
| Screener | `screener.demo` | `ScreenerInit!` |
| Supervisor | `supervisor.demo` | `SupervisorInit!` |
| Worker | `worker.demo` | `WorkerField!` |
| Admin | `admin.demo` | `AdminDemo!` |

## Live demo call (intake screener)

Beside **Upload Call Recording**, the intake page includes **Live Demo Call** for simulating a hotline without telephony:

1. Click **Start live demo call** and allow microphone access.
2. Speak naturally; audio is sent every ~15 seconds (or sooner on a pause).
3. Each chunk is transcribed via HF Whisper; lines appear with a **Live** label.
4. Form 51A fields populate incrementally; the **AIT Assistant** suggests questions for missing required fields.
5. Click **End live call** to run triage and risk scoring on the stitched transcript.

Upload and live session are **mutually exclusive** on the same case. Spec: `openspec/changes/live-intake-demo/`.

## AI configuration (`config/ai.env`)

All LLM and ASR settings live in **`config/ai.env`** (copy from `config/ai.env.example`). Docker Compose loads this file for `api` and `ai-bundle`. Switch providers after deployment without rebuilding images.

| Task | Default (cloud) | Config keys |
|------|-----------------|-------------|
| Transcription (ASR) | HF Whisper | `HF_ASR_MODEL`, `HF_API_TOKEN` |
| NLP, triage, assistant | HF Llama | `LLM_PROVIDER`, `HF_MODEL`, `HF_API_BASE` |
| Local LLM (post-deploy) | Ollama on VM | `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| Risk score | Statistical rules | Not LLM — see `docs/risk-scoring-framework.md` |

**Initial deploy (cloud):** set `HF_API_TOKEN` in `config/ai.env`.  
**Post-deploy (local LLM):** set `LLM_PROVIDER=ollama` and point `OLLAMA_BASE_URL` at host Ollama — see [`docs/VM-RUNBOOK.md`](docs/VM-RUNBOOK.md) §6.

The **ai-bundle** container is a lightweight pipeline worker; it does not load model weights locally when using Hugging Face cloud.

**Privacy note:** cloud mode sends audio/transcripts to Hugging Face. Local Ollama reduces LLM egress; ASR may still use HF until a local ASR path is added.

### Security (Hugging Face + demo stack)

| Risk | Mitigation in this demo |
|------|-------------------------|
| **PII leaves your VM** | Audio + transcripts + form fields go to HF cloud for ASR/LLM. Acceptable for demo only — not for production agency data without a BAA/DPA. |
| **HF token exposure** | Token lives in `demo/.env` (gitignored). Never commit real tokens to `.env.example`. Deploy zip may include `.env` when packaging from a machine that has it. |
| **Token scope** | Use a fine-grained token with **Inference Providers** only — not repo write/admin. |
| **Provider logging** | HF and routed providers (Fal, Together, etc.) may retain request logs per their policies. |
| **JWT / internal key** | User API uses JWT; worker uses `X-Internal-Key` on `/internal/*` only — HF token is never sent to the browser. |
| **HTTPS** | Production assumes host nginx TLS; HF calls are HTTPS from api/worker containers. |

Rotate `HF_API_TOKEN` if it was shared or committed. Defaults for models are in `config/ai-defaults.env` (checked by `check-conflicts.mjs`).

## Demo UX (slow VM / AI)

The demo frontend shows **loading spinners** on all data-heavy pages and uses **long HTTP timeouts** (up to 10 minutes for uploads and AI). Nginx proxy timeouts are **3600s** on API/WebSocket routes. Rebuild/redeploy the frontend container after UI changes.

## Smoke test

```bash
./scripts/smoke.sh
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/package-docker.sh` | Create `dist/intake-demo.zip` (requires `demo/.env` with `HF_API_TOKEN`) |
| `scripts/deploy-docker.sh` | Install from zip on VM (uses packaged `.env` + `config/ai.env`) |
| `scripts/up.sh` | `docker compose up` (requires `demo/.env` with HF token) |
| `scripts/smoke.sh` | Health + auth checks |
| `scripts/redeploy.sh` | Patch `api` / `frontend` / `ai-bundle` |
| `scripts/install-host-nginx.sh` | Host route → `/etc/nginx/routes/` |

## Specifications & docs

| Document | Purpose |
|----------|---------|
| `docs/VM-RUNBOOK.md` | **VM deploy, redeploy, AI provider switch, troubleshooting** |
| `openspec/changes/demo-enhancements-2026-05/` | Change spec for this demo implementation |
| `openspec/specs/` | Normative behavior (8 domains) |
| `docs/risk-scoring-framework.md` | Statistical risk weights and formula |
| `docs/screening-initial-report-process.md` | Mermaid: screening & Initial Report flow |
| `Docs/FSD-DEMO.md` | Functional requirements |
| `Docs/TRACEABILITY.md` | PRD → API → OpenSpec map |
| `openapi.yaml` (repo root) | REST contract |

Migrations **001–009** run on API startup (includes `risk_framework` seed in **007**, case search/linking in **009**).

### Case search, linking, and demo reset

- **Header search** — all roles can search by case number (`IR-YYYY-NNNN`) or child name. Screener/supervisor/worker can open results; admin sees metadata only.
- **Case identity** — child name is the case title; case number is auto-generated and read-only.
- **Related reports** — cases with the same child name + DOB are linked (not merged). Use the drawer on intake and case record pages.
- **Demo reset** — System Admin → System Status → type `RESET` to wipe case data and artifacts (keeps triage/risk config and demo users). Reseeds sample linked cases.

## Architecture

```text
Host nginx (HTTPS) → :11111/docker nginx → frontend + api (legacy Docker)
                                      ↘ ai-bundle (pipeline worker → HF ASR + LLM)
Shared volume: /data/ait.db, /data/artifacts
```

## Sync from main codebase

`demo/api`, `demo/frontend`, and `demo/worker` were copied from `codebase/`. After feature work in `codebase/`, merge selectively into `demo/` or re-copy and re-apply demo adapters (`db/pool.ts`, `redis_bus.py`, etc.).

## SQLite (demo API + worker)

The demo stack shares one DB file (`/data/ait.db`). PostgreSQL-oriented SQL from `codebase/` is adapted in:

| Layer | Role |
|-------|------|
| `api/src/db/sql.ts` | `$n` → `?` with **repeated** `$1` expansion, strip `::int` / `now()`, etc. |
| `api/src/db/pool.ts` | Bind booleans as `0`/`1`, normalize rows (JSON + flags) on read |
| `api/src/db/migrate.ts` | Bootstrap `schema_migrations`, run `migrations/*.sql` via `exec` |
| `worker/worker/sqlite_util.py` | Same boolean binding for worker writes |

Verify locally:

```bash
cd demo/api && npm run build && npm run verify:sqlite
```

On deploy, the API container runs `migrate.js` before `index.js` (see `demo/api/Dockerfile`).

## Avoiding duplicate / conflicting code

Before packaging, `scripts/package-docker.sh` runs:

- `verify-before-package.sh` — builds API + frontend
- `check-conflicts.mjs` — **38 unique API routes** (no duplicate `METHOD path`), no legacy `context/AuthContext`, nav ids wired in `RoleViews`, single `export const api`

**Do not re-add:**

| Removed | Use instead |
|---------|-------------|
| `frontend/src/context/AuthContext.tsx` | `frontend/src/auth/` (`AuthProvider`, `RequireAuth`, `session.ts`) |
| `frontend/src/pages/PlaceholderPage.tsx` | Real pages under `pages/` + `RoleViews.tsx` |
| Passing `token` into `api.*()` | Session in `api/client.ts` via `authRequest()` |

Auth endpoints: `POST /auth/login` (username/password), `POST /auth/demo-login` (smoke/legacy), `GET /auth/me`.

## Limitations

- Single-node SQLite — not for multi-tenant load
- Job queue polls SQLite (no Redis)
- WebSocket events via in-process fan-out + worker HTTP posts
- All AI runs on Hugging Face (requires `HF_API_TOKEN`); no local model RAM
