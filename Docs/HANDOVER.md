# DCF AIT — Demo Handover

**VM operations:** see **[VM-RUNBOOK.md](VM-RUNBOOK.md)** (packaging, deploy, patch, troubleshoot on a remote server).

**Simplified demo stack (SQLite, 3 containers):** see **[../demo/README.md](../demo/README.md)** — independent copies under `demo/`; full production deploy unchanged in `codebase/deploy`.

## Quick start (external Postgres on host)

Default `.env.example` targets an existing database:

```bash
cd codebase/deploy
cp .env.example .env
# DATABASE_URL=postgresql://foundry:foundry@host.docker.internal:5432/appdb
./scripts/gen-dev-certs.sh nginx/certs
./scripts/compose-up.sh up -d --build
./scripts/smoke.sh
```

Your host URL `postgresql://foundry:foundry@127.0.0.1:5432/appdb` is equivalent with `host.docker.internal` instead of `127.0.0.1` for containers.

## Quick start (bundled Postgres)

```bash
# In .env: unset USE_EXTERNAL_POSTGRES / DATABASE_URL; set POSTGRES_PASSWORD
COMPOSE_PROFILES=bundled-db ./scripts/compose-up.sh up -d --build
```

Open **https://localhost:4011/dcfintake/** (accept self-signed cert) or **https://foundry.inapp.com/dcfintake/** via the Foundry gateway. Select a role on the login screen.

## Package and deploy (VM)

```bash
./scripts/package-docker.sh
# copy dist/dcf-ait-docker.zip to target host, then:
./scripts/deploy-docker.sh /path/to/dcf-ait-docker.zip
```

Packaging includes `docker-compose.external-db.yml` and `compose-up.sh`. Deploy defaults to **external Postgres** (`foundry` / `appdb` on the host). Use `--bundled-db` only if you want the compose Postgres container on port **4015**.

Default host ports **4010–4014** with external DB (UI on **4011**).

## When code edits happen (VM)

1. Copy changed source to the VM (`rsync` `codebase/api|worker|frontend`, or a new zip only if deploy/compose changed).
2. On the VM:

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/redeploy.sh api          # or frontend, ai-worker, all
./scripts/smoke.sh
```

Do **not** run `down -v` or delete images for routine patches. Details: **[VM-RUNBOOK.md §4](VM-RUNBOOK.md#4-when-code-edits-happen)**.

**Common VM errors:** Postgres `host.docker.internal:5432` warning, ai-worker Redis `TimeoutError` on `brpop` — see **[VM-RUNBOOK.md §9](VM-RUNBOOK.md#9-known-errors-and-fixes)**.

## Production-oriented deploy

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Requirements:

- TLS certificates in `nginx/certs/` (`cert.pem`, `key.pem`) or set `NGINX_CERTS_DIR`
- Strong secrets in `.env` (no `dev-internal-key-change-me`)
- `NODE_ENV=production` (API validates `INTERNAL_API_KEY` and `JWT_SECRET`)

## Demo workflows

| Role | Flow |
|------|------|
| Screener | Dashboard → New 51A Intake → upload audio → live transcript + assistant → review form → submit |
| Supervisor | Pending Review → expand case → screen in/out |
| Worker | Assigned case → Briefing → 51B Field Report |
| IT Admin | System Status / AI Governance (no case PII) |

## Architecture pointers

- **API:** `codebase/api` — Express, JWT demo auth, case RBAC, WebSocket on `/ws/cases/:id`
- **Worker:** `codebase/worker` — Whisper + Ollama pipeline
- **UI:** `codebase/frontend` — React; mockup reference `mockup/DCF_AIT_UI.jsx`
- **Docs:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md`, `Docs/SECURITY-PII-UI-AUDIT.md`

## Validation

- `./scripts/smoke.sh` — health, auth, case create, form/pipeline
- Manual UI test plan: `Docs/SECURITY-PII-UI-AUDIT.md` §7
- OWASP checklist: `Docs/SEED-005-OWASP-CLOSEOUT.md`

## Known demo limitations

- Role-picker login (not OIDC/MFA)
- JWT in browser `localStorage`; WebSocket token in query string
- Ollama/Whisper on internal Docker network only (not GovCloud Transcribe/Bedrock)
