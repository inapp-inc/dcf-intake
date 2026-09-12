# Child Welfare Intake — Demo stack

Independent copy of the platform under `demo/` for a **simpler deployment**:

| Full `codebase/deploy` | This demo |
|------------------------|-----------|
| PostgreSQL + Redis + MinIO | **SQLite** + **filesystem** artifacts |
| ~9 containers | **3** (`nginx`, `api`, `ai-bundle` pipeline worker) |
| External DB optional | Single volume `/data` |

**Frontend** and **API/worker behavior** match production. All AI (ASR + LLM) runs on **Hugging Face Inference** — zero local model RAM. Storage and queue layers are simplified implementations in the `demo/` copies only — [`codebase/`](../codebase/) is unchanged.

## Quick start (local / already extracted)

```bash
cd demo
cp .env.example .env
# Edit JWT_SECRET, INTERNAL_API_KEY, HF_API_TOKEN
./scripts/up.sh
```

## Package and deploy (VM — like production flow)

**Build machine:**

```bash
cd demo
cp .env.example .env   # only if .env missing; set HF_API_TOKEN
./scripts/package-docker.sh
# → ../dist/intake-demo.zip (includes demo/.env with secrets)
```

**Target VM:**

```bash
./scripts/deploy-docker.sh /path/to/intake-demo.zip
# Uses packaged .env — no manual HF token setup when built from a machine with demo/.env
```

Wrappers: `package-demo.sh` → `package-docker.sh`, `deploy-demo.sh` → `deploy-docker.sh`.

- Local UI: `http://127.0.0.1:4010/intake/`
- Foundry: `deploy-docker.sh` installs `/etc/nginx/routes/intake.conf` (same as `create-nginx-site.sh intake 4010`). Use `--skip-nginx` or `INSTALL_HOST_NGINX=0` to skip. Manual: `./scripts/install-host-nginx.sh`.

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

## AI (Hugging Face — all cloud, zero local model RAM)

The demo stack uses **Hugging Face Inference** for **all** AI work:

| Task | Model (default) | Where it runs |
|------|-----------------|---------------|
| Transcription (ASR) | `openai/whisper-large-v3` | HF Inference API |
| NLP, triage, documents, assistant | `meta-llama/Llama-3.1-8B-Instruct` | HF chat completions |
| Risk score | **Statistical rules** (`statistical-v1`) | Not LLM — see `docs/risk-scoring-framework.md` |

| Variable | Default | Purpose |
|----------|---------|---------|
| `HF_API_TOKEN` | *(required)* | Token from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) with Inference Providers permission |
| `HF_ASR_MODEL` | `openai/whisper-large-v3` | Cloud Whisper model |
| `HF_ASR_API_URL` | *(auto)* | Override with a dedicated Inference Endpoint URL if needed |
| `ASR_REQUEST_TIMEOUT_MS` | `600000` | Long timeout for large audio files |
| `LLM_PROVIDER` | `huggingface` | Set `ollama` only if you run a local Ollama elsewhere |
| `HF_MODEL` | `meta-llama/Llama-3.1-8B-Instruct` | Chat model for NLP/assistant |
| `HF_API_BASE` | `https://router.huggingface.co/v1` | OpenAI-compatible LLM endpoint |
| `LLM_REQUEST_TIMEOUT_MS` | `600000` | Long timeout for slow/cold models |

The **ai-bundle** container is now a lightweight pipeline worker (SQLite job poll + HTTP callbacks). It does **not** load Whisper or any LLM weights locally.

**Privacy note:** intake audio, transcripts, and form data are sent to Hugging Face. For air-gapped use you would need local models (not supported in this RAM-constrained demo config).

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
| `scripts/deploy-docker.sh` | Install from zip on VM (uses packaged `.env`) |
| `scripts/up.sh` | `docker compose up` (requires `demo/.env` with HF token) |
| `scripts/smoke.sh` | Health + auth checks |
| `scripts/redeploy.sh` | Patch `api` / `frontend` / `ai-bundle` |
| `scripts/install-host-nginx.sh` | Foundry route → `/etc/nginx/routes/` |

## Specifications & docs

| Document | Purpose |
|----------|---------|
| `openspec/changes/demo-enhancements-2026-05/` | Change spec for this demo implementation |
| `openspec/specs/` | Normative behavior (8 domains) |
| `docs/risk-scoring-framework.md` | Statistical risk weights and formula |
| `docs/screening-initial-report-process.md` | Mermaid: screening & Initial Report flow |
| `Docs/FSD-DEMO.md` | Functional requirements |
| `Docs/TRACEABILITY.md` | PRD → API → OpenSpec map |
| `openapi.yaml` (repo root) | REST contract |

Migrations **001–007** run on API startup (includes `risk_framework` seed in **007**).

## Architecture

```text
Host nginx (HTTPS) → :4010/demo nginx → frontend + api
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
