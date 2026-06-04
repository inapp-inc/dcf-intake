# DCF AIT — Docker deployment

**Remote VM runbook:** [Docs/VM-RUNBOOK.md](../../Docs/VM-RUNBOOK.md)

Host ports use the **4010–4015** block by default (see `.env.example`).

| Port | Service |
|------|---------|
| 4010 | nginx HTTP — **upstream for host HTTPS proxy** (`BEHIND_REVERSE_PROXY=1`) |
| 4011 | nginx HTTPS — **UI entry** (`/dcfintake/`) |
| 4012 | API direct |
| 4013 | MinIO S3 |
| 4014 | MinIO console |
| 4015 | Postgres (bundled container only; profile `bundled-db`) |

## External Postgres (existing host database)

If Postgres is already running on the host (e.g. `postgresql://foundry:foundry@127.0.0.1:5432/appdb`):

```bash
cd codebase/deploy
cp .env.example .env
# .env already sets:
#   USE_EXTERNAL_POSTGRES=1
#   DATABASE_URL=postgresql://foundry:foundry@host.docker.internal:5432/appdb
./scripts/gen-dev-certs.sh nginx/certs
./scripts/compose-up.sh up -d --build
./scripts/smoke.sh
```

The API container runs migrations on startup (`node dist/db/migrate.js`). Use `host.docker.internal` in `DATABASE_URL` — not `127.0.0.1` (that points at the container itself).

## Quick start (bundled Postgres)

```bash
cd codebase/deploy
cp .env.example .env
# Comment out USE_EXTERNAL_POSTGRES and DATABASE_URL; set POSTGRES_PASSWORD
./scripts/gen-dev-certs.sh nginx/certs
COMPOSE_PROFILES=bundled-db ./scripts/compose-up.sh up -d --build
./scripts/smoke.sh
```

UI: **https://localhost:4011/dcfintake/** (self-signed cert)  
Foundry: **https://foundry.inapp.com/dcfintake/** — add `nginx/foundry-gateway.example.conf` to **your existing host nginx**; set `BEHIND_REVERSE_PROXY=1` in `.env` (proxy to `http://127.0.0.1:4010`, not :443 on the host).

## Package and deploy (recommended)

**On build machine (repo checkout):**

```bash
chmod +x scripts/*.sh codebase/deploy/scripts/*.sh
./scripts/package-docker.sh
# → dist/dcf-ait-docker.zip
```

**On destination VM:**

```bash
# External Postgres on host (default — e.g. foundry@127.0.0.1:5432/appdb)
./scripts/deploy-docker.sh /path/to/dcf-ait-docker.zip

# Or with explicit URL:
DATABASE_URL=postgresql://foundry:foundry@127.0.0.1:5432/appdb \
  ./scripts/deploy-docker.sh /path/to/dcf-ait-docker.zip

# Bundled Postgres container instead (uses port 4015):
./scripts/deploy-docker.sh /path/to/dcf-ait-docker.zip --bundled-db
```

`deploy-docker.sh` (modeled on presales `deploy-docker.sh`):

- Unzips to `/var/www/dcf-ait` (override with `--install-dir` or `DEPLOY_ROOT`)
- **Default: external Postgres** via `docker-compose.external-db.yml` + `compose-up.sh`
- Rewrites `127.0.0.1` → `host.docker.internal` in `DATABASE_URL`
- Assigns unique ports in **4010–4014** (external) or **4010–4015** (bundled DB)
- Generates `.env` secrets if missing; runs migrations on API startup
- Optional `--no-smoke`, `--skip-build`, `--bundled-db`

Legacy wrappers: `codebase/deploy/scripts/package-demo.sh`, `deploy-demo.sh`.

## Production overlay

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

See [Docs/HANDOVER.md](../../Docs/HANDOVER.md).

## Patching after code changes (no image wipe)

You do **not** need `docker rm` / `docker rmi` / `compose down -v` for normal updates.

| What changed | Command |
|--------------|---------|
| API (TypeScript) | `./scripts/redeploy.sh api` |
| Frontend (React) | `./scripts/redeploy.sh frontend` |
| Worker (Python) | `./scripts/redeploy.sh ai-worker` |
| Several | `./scripts/redeploy.sh api ai-worker` |

`redeploy.sh` runs `compose build` + `up -d --no-deps` for those services only. **Postgres (external), Redis, MinIO, and Ollama volumes stay as-is.**

Manual equivalent:

```bash
./scripts/compose-up.sh build api
./scripts/compose-up.sh up -d --no-deps api
```

### Faster local iteration (no Docker rebuild)

| Layer | Command |
|-------|---------|
| API | `cd codebase/api && npm run dev` (host; set `DATABASE_URL`, `REDIS_URL=redis://127.0.0.1:6379` if Redis port published) |
| Frontend | `cd codebase/frontend && npm run dev` → proxy to API |
| Worker | `cd codebase/worker && pip install -r requirements.txt && python -m worker.main` |

Keep **Redis, MinIO, Ollama** in Docker; run only the service you edit on the host.

### VM / zip deploy patch

On the server (git pull or copy changed files into `/var/www/dcf-ait/...`):

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/redeploy.sh api    # or whichever service changed
```

Full zip redeploy only when the **deploy layout** or **compose files** change.

## Ollama

First startup runs `ollama-init` to pull `${OLLAMA_MODEL:-llama3.2:3b}`. Requires network and ~2–4 GB disk.
