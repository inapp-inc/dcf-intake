# DCF AIT — VM operations runbook

Operations guide for running DCF AIT on a **remote Linux VM** using the packaging and deployment scripts in this repo.

**Database:** PostgreSQL only (not SQLite). Default install uses **existing host Postgres** (`foundry` / `appdb`). Optional bundled Postgres container on port **4015**.

---

## 1. Prerequisites (target VM)

| Requirement | Notes |
|-------------|--------|
| OS | Linux x86_64 or arm64 |
| Docker | Engine 24+ |
| Docker Compose | v2 plugin (`docker compose version`) |
| Tools | `unzip`, `curl`, `openssl` (for TLS script) |
| Disk | ≥ 15 GB free (Ollama model + images + MinIO) |
| RAM | ≥ 8 GB recommended (Whisper + Ollama on CPU) |
| Network | Outbound for first-time Ollama model pull |

**Host Postgres (default):**

- Running and reachable, e.g. `postgresql://foundry:foundry@127.0.0.1:5432/appdb`
- `listen_addresses` and `pg_hba.conf` must allow Docker bridge clients (see §9)

**Ports (host):** **4010–4015** block — ensure nothing else binds these:

| Port | Service |
|------|---------|
| 4010 | HTTP → nginx (redirect to HTTPS) |
| 4011 | **HTTPS UI** at `/dcfintake/` (primary URL) |
| 4012 | API direct |
| 4013 | MinIO S3 |
| 4014 | MinIO console |
| 4015 | Bundled Postgres only (`--bundled-db`) |

---

## 2. Scripts inventory (current)

| Script | Where | Purpose |
|--------|-------|---------|
| `scripts/package-docker.sh` | Build machine (repo root) | Create `dist/dcf-ait-docker.zip` |
| `scripts/deploy-docker.sh` | Target VM (in zip or repo) | First-time / full deploy from zip |
| `codebase/deploy/scripts/compose-up.sh` | On VM after extract | Correct compose files (external vs bundled DB) |
| `codebase/deploy/scripts/redeploy.sh` | On VM | **Patch** one or more services without wiping images |
| `codebase/deploy/scripts/smoke.sh` | On VM | Health + auth + RBAC checks |
| `codebase/deploy/scripts/gen-dev-certs.sh` | On VM | Self-signed TLS for nginx |
| `codebase/deploy/scripts/package-demo.sh` | Wrapper → `package-docker.sh` | |
| `codebase/deploy/scripts/deploy-demo.sh` | Wrapper → `deploy-docker.sh` | |

Compose files (under `codebase/deploy/`):

- `docker-compose.yml` — main stack
- `docker-compose.external-db.yml` — host Postgres via `host.docker.internal`
- `docker-compose.prod.yml` — optional restart/TLS overlay

---

## 3. First-time install

### 3.1 On build machine (laptop / CI)

```bash
cd /path/to/DCF-Intake
chmod +x scripts/*.sh codebase/deploy/scripts/*.sh
./scripts/package-docker.sh
# → dist/dcf-ait-docker.zip
```

Copy zip to VM:

```bash
scp dist/dcf-ait-docker.zip user@vm:/tmp/
```

### 3.2 On target VM

```bash
# Optional: install to custom path
export DEPLOY_ROOT=/var/www/dcf-ait

# Default: external Postgres (your foundry/appdb)
DATABASE_URL=postgresql://foundry:foundry@127.0.0.1:5432/appdb \
  ./scripts/deploy-docker.sh /tmp/dcf-ait-docker.zip

# Or bundled Postgres instead of host DB:
# ./scripts/deploy-docker.sh /tmp/dcf-ait-docker.zip --bundled-db
```

Deploy will:

1. Unzip to `$DEPLOY_ROOT/dcf-ait/`
2. Create `codebase/deploy/.env` with generated secrets (if missing)
3. Set ports **4010–4014** (or **4015** with `--bundled-db`)
4. Rewrite `DATABASE_URL` to use `host.docker.internal`
5. Generate dev TLS certs
6. `compose build` + `compose up -d`
7. Run `smoke.sh` (unless `--no-smoke`)

**Open UI:** `https://<vm-host>:4011/dcfintake/` (accept self-signed certificate).  
**Foundry:** `https://foundry.inapp.com/dcfintake/` — configure edge proxy using `codebase/deploy/nginx/foundry-gateway.example.conf`.

Install path after deploy:

```text
/var/www/dcf-ait/dcf-ait/codebase/deploy/    # compose + .env
```

---

## 4. When code edits happen

Normal updates **do not** require `docker rmi`, `docker system prune`, or `compose down -v`. Sync new source onto the VM, rebuild only the services that changed, then smoke-test.

### 4.1 What to run (by area)

| You changed | Redeploy | Notes |
|-------------|----------|--------|
| `codebase/api/**` | `./scripts/redeploy.sh api` | Migrations run on API container start |
| `codebase/frontend/**` | `./scripts/redeploy.sh frontend` | Also recreates **nginx** (static UI) |
| `codebase/worker/**` | `./scripts/redeploy.sh ai-worker` | |
| API + worker | `./scripts/redeploy.sh api ai-worker` | |
| All three app layers | `./scripts/redeploy.sh all` | api + frontend + ai-worker (not redis/minio/ollama) |
| `codebase/deploy/.env` only | `./scripts/compose-up.sh up -d` | No rebuild unless vars affect build args |
| `docker-compose*.yml`, nginx config, new deploy scripts | Full zip deploy (§4.4) | Backup `.env` first |
| `package.json` / `requirements.txt` | Same redeploy as that service | Rebuild picks up new deps |

**Leave running:** external Postgres, Redis, MinIO, Ollama (and bundled Postgres if used). Queues and uploaded artifacts stay in volumes.

### 4.2 Workflow — edit on laptop, run on VM (typical)

**On your machine** (repo root):

```bash
# Optional: only ship what changed (faster than a full zip)
rsync -avz --delete \
  --exclude node_modules --exclude dist --exclude __pycache__ \
  codebase/api codebase/worker codebase/frontend codebase/deploy \
  user@vm:/var/www/dcf-ait/dcf-ait/codebase/

# Or ship a fresh package when deploy/compose changed:
./scripts/package-docker.sh
scp dist/dcf-ait-docker.zip user@vm:/tmp/
```

**On the VM:**

```bash
export DCF_DEPLOY=/var/www/dcf-ait/dcf-ait/codebase/deploy
cd "$DCF_DEPLOY"

# Pick one (or more):
./scripts/redeploy.sh api
./scripts/redeploy.sh frontend
./scripts/redeploy.sh ai-worker

./scripts/smoke.sh
```

Hard-refresh the browser after **frontend** changes (`Ctrl+Shift+R` / cache bypass).

### 4.3 Workflow — edit directly on the VM

```bash
cd /var/www/dcf-ait/dcf-ait
git pull   # if the tree is a git clone

cd codebase/deploy
./scripts/redeploy.sh <service>
./scripts/smoke.sh
```

### 4.4 Workflow — new zip (deploy / compose layout changed)

Use when `codebase/deploy/docker-compose*.yml`, `nginx/`, or `scripts/deploy-docker.sh` changed — not for everyday API/UI/worker edits.

```bash
cp /var/www/dcf-ait/dcf-ait/codebase/deploy/.env ~/dcf-ait.env.bak

./scripts/deploy-docker.sh /tmp/dcf-ait-docker.zip --install-dir /var/www/dcf-ait

# If deploy regenerated .env, restore your secrets and ports:
cp ~/dcf-ait.env.bak /var/www/dcf-ait/dcf-ait/codebase/deploy/.env
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/compose-up.sh up -d
./scripts/smoke.sh
```

Use `--skip-build` only if images are already current and you only refreshed compose files.

### 4.5 What `redeploy.sh` does

```bash
./scripts/compose-up.sh build <services…>
./scripts/compose-up.sh up -d --no-deps <services…>
```

- Rebuilds the image for that service from the **current files on disk**
- Recreates only those containers; does not restart Redis/MinIO/Ollama unless you name them
- Does **not** delete other images or volumes

### 4.6 What not to do

| Avoid | Why |
|-------|-----|
| `docker compose down -v` | Wipes Redis/MinIO/Ollama data |
| `docker rmi` / `docker system prune -a` before patch | Unnecessary; slows next build (re-pull Ollama base) |
| Full zip deploy for every typo fix | Use `redeploy.sh` instead |
| Editing only inside a running container | Changes lost on recreate; edit source under `/var/www/dcf-ait/dcf-ait/codebase/` |

### 4.7 Runtime bugs (Postgres / Redis) — not fixed by restart alone

If you see **`cannot reach host.docker.internal:5432`** or the **ai-worker `TimeoutError` on `brpop`**, follow **[§9 Known errors](#9-known-errors-and-fixes)**. Those need config/Postgres changes or **`redeploy.sh ai-worker`** with current source — not `docker restart` on an old image.

### 4.8 If something looks stale after redeploy

```bash
./scripts/compose-up.sh logs -f api          # migration or startup errors
./scripts/compose-up.sh build --no-cache api # rare: bust a bad layer
./scripts/redeploy.sh api
```

---

## 5. Day-to-day operations

### 5.1 Status

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/compose-up.sh ps
```

### 5.2 Logs

```bash
./scripts/compose-up.sh logs -f api ai-worker redis
./scripts/compose-up.sh logs -f ollama   # model load / inference
```

### 5.3 Restart entire stack (keep data)

```bash
./scripts/compose-up.sh restart
# or
./scripts/compose-up.sh down
./scripts/compose-up.sh up -d
```

Do **not** use `down -v` unless you intend to wipe Redis/MinIO/Ollama volumes.

### 5.4 Smoke test

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/smoke.sh
```

Uses `AIT_HTTPS_PORT` from `.env` (default **4011**).

### 5.5 Stop application

```bash
./scripts/compose-up.sh down
```

---

## 6. Configuration (`.env`)

File: `codebase/deploy/.env` (created on first deploy).

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | `postgresql://foundry:foundry@host.docker.internal:5432/appdb` |
| `USE_EXTERNAL_POSTGRES` | `1` = no bundled Postgres container |
| `AIT_HTTPS_PORT` | UI port (default **4011**) |
| `JWT_SECRET` | API auth (≥32 chars in production) |
| `INTERNAL_API_KEY` | Worker ↔ API (must match on api + ai-worker) |
| `MINIO_ROOT_PASSWORD` | Artifact storage |
| `CORS_ORIGIN` | `https://foundry.inapp.com` (no path) |
| `APP_BASE_PATH` | `/dcfintake` |
| `VITE_BASE_PATH` | `/dcfintake/` |
| `VITE_API_BASE_URL` | `/dcfintake/api/v1` |
| `OLLAMA_MODEL` | e.g. `llama3.2:3b` |

After editing `.env`:

```bash
./scripts/compose-up.sh up -d
```

---

## 7. Demo user flows (smoke test in browser)

| Role | URL path | Action |
|------|----------|--------|
| Screener | Login → Intake | Upload audio → watch transcript → submit 51A |
| Supervisor | Pending Review | Expand case → Screen in |
| Worker | My Cases | Briefing → 51B report |
| Admin | System Status | Health / models (no case PII) |

Demo login: role picker on login screen (not production IdP).

---

## 8. Existing nginx on the VM (Foundry)

If **host nginx already owns ports 80/443** (typical for `foundry.inapp.com`), do **not** put DCF AIT on those ports. Use the split below.

| Layer | Role | Port |
|-------|------|------|
| **Host nginx** | TLS + public URL | `:443` → `https://foundry.inapp.com/dcfintake/` |
| **Docker nginx** | App routing only (HTTP) | `127.0.0.1:4010` → `/dcfintake/`, `/dcfintake/api/`, `/dcfintake/ws/` |

### 8.1 `.env` on the VM

```bash
BEHIND_REVERSE_PROXY=1
AIT_HTTP_PORT=4010
APP_BASE_PATH=/dcfintake
CORS_ORIGIN=https://foundry.inapp.com
```

`deploy-docker.sh` sets `BEHIND_REVERSE_PROXY=1` by default and skips generating container TLS certs.

Recreate the app nginx after changing this:

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/compose-up.sh up -d --force-recreate nginx
```

### 8.2 Snippet for your host nginx

Copy from **`codebase/deploy/nginx/foundry-gateway.example.conf`** into the existing `server { server_name foundry.inapp.com; ... }` block:

```nginx
location /dcfintake/ {
  proxy_pass http://127.0.0.1:4010/dcfintake/;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
}
```

Then:

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -sk https://foundry.inapp.com/dcfintake/api/v1/health
```

### 8.3 What not to do

- Do **not** proxy to `https://127.0.0.1:4011` unless you intentionally use container TLS (double TLS, self-signed).
- Do **not** bind Docker to host `:80` / `:443` — only **4010–4015**.
- Do **not** use `docker compose` host network mode for the whole stack.

### 8.4 Direct check (bypass host nginx)

```bash
curl -s http://127.0.0.1:4010/dcfintake/api/v1/health
```

---

## 9. Known errors (and fixes)

These are the deployment issues seen on the VM — including the Postgres warning and the **ai-worker Redis traceback** you hit.

### 9.1 `WARN: cannot reach host.docker.internal:5432 from Docker`

**What it means:** `deploy-docker.sh` ran a probe from a throwaway container. Your host Postgres is either not listening where Docker can reach it, or `pg_hba.conf` blocks the Docker bridge.

**What works on the host does *not* work in a container:**

| URL in `.env` | Result |
|---------------|--------|
| `...@127.0.0.1:5432/...` | Points at the **container itself**, not the VM |
| `...@host.docker.internal:5432/...` | Correct for containers (deploy rewrites `127.0.0.1` → this) |

**Fix (keep external Postgres):**

1. Confirm Postgres on the VM:

```bash
psql "postgresql://foundry:foundry@127.0.0.1:5432/appdb" -c "SELECT 1"
```

2. Allow Docker clients in `pg_hba.conf` (adjust subnet to match `docker network inspect` bridge):

```conf
host  appdb  foundry  172.16.0.0/12  scram-sha-256
```

3. In `postgresql.conf`, ensure Postgres listens (e.g. `listen_addresses = 'localhost,127.0.0.1'` or `'*'`).

4. Reload Postgres; in `codebase/deploy/.env`:

```bash
DATABASE_URL=postgresql://foundry:foundry@host.docker.internal:5432/appdb
USE_EXTERNAL_POSTGRES=1
```

5. Re-test from Docker:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway alpine:3.20 \
  sh -c "nc -zv host.docker.internal 5432"
```

6. Bounce API/worker:

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
./scripts/compose-up.sh up -d api ai-worker
```

**Does `--network host` help?**  
**Not for the full stack.** Host networking makes `127.0.0.1:5432` reachable, but nginx/API/worker lose Docker DNS names (`api`, `redis`, `minio`, `ollama`). You would have to rewire every service URL to `127.0.0.1` and published ports. **Prefer `host.docker.internal` + `pg_hba`, or bundled Postgres.**

**Fast workaround:** `./scripts/deploy-docker.sh ... --bundled-db` (Postgres container on port **4015**, no host `pg_hba` changes).

---

### 9.2 ai-worker crashes: `TimeoutError: timed out` on `redis/.../socket.py` → `brpop`

**Typical log (worker exits after “started — consuming …”):**

```text
TimeoutError: timed out
  ...
  File "/app/worker/redis_bus.py", line 22, in blocking_pop
    item = self.client.brpop(config.PIPELINE_QUEUE, timeout=timeout)
```

**Cause:** `redis-py` default `socket_timeout` is shorter than `BRPOP`’s wait (5s). An idle queue looks like a socket timeout and the process crashed.

**Fix in repo:** `codebase/worker/worker/redis_bus.py` sets `socket_timeout=None` for blocking reads; `main.py` reconnects on transient Redis errors instead of exiting.

**On the VM you must rebuild the worker image** (a plain `compose restart` is not enough if the image is old):

```bash
cd /var/www/dcf-ait/dcf-ait/codebase/deploy
# sync latest codebase/worker from laptop first, then:
./scripts/redeploy.sh ai-worker
./scripts/compose-up.sh logs -f ai-worker
```

**Verify the running image has the fix:**

```bash
./scripts/compose-up.sh exec ai-worker python -c \
  "from worker.redis_bus import _REDIS_CLIENT_KWARGS; print(_REDIS_CLIENT_KWARGS.get('socket_timeout'))"
# Expected: None
```

After the fix, an **empty queue is normal** — the worker should stay up and idle (no crash loop). When you upload audio, you should see `Running stage transcribe for case …` in logs.

If it still fails: check Redis is healthy (`./scripts/compose-up.sh ps`, `logs redis`) and that `.env` has `REDIS_URL=redis://redis:6379` (default in compose).

---

### 9.3 Other symptoms (short)

| Symptom | Likely cause | Action |
|---------|----------------|--------|
| API exits on startup, “migration” / connection errors | §9.1 Postgres unreachable | Fix DB URL / `pg_hba` or `--bundled-db` |
| UI loads, intake never progresses | §9.2 worker down or old image | `redeploy.sh ai-worker`, check logs |
| `ollama-init` / model pull slow | First deploy | `logs -f ollama ollama-init`; needs network + disk |
| Port bind errors | 4010–4015 in use | `ss -ltn \| grep 401`; set ports in `.env` |
| Changes not visible after edit | Old container/image | §4 `redeploy.sh`, hard-refresh browser for UI |

---

## 10. Troubleshooting (general)

### Postgres (summary)

See **§9.1**. API runs migrations on start — if Postgres is down, `logs api` shows connection/migration errors.

### Redis (summary)

See **§9.2**. Routine code updates: `./scripts/redeploy.sh ai-worker`.

### Ollama slow / first start (general)

First deploy runs `ollama-init` to pull the model (minutes, needs network). Watch:

```bash
./scripts/compose-up.sh logs -f ollama ollama-init
```

### Port already in use

Deploy picks next free port in **4010–4015** or fails. Check:

```bash
ss -ltn | grep -E '401[0-5]'
```

Set explicit ports in `.env` before `compose-up.sh up -d`.

### Migrations failed

API runs migrations on container start. Check:

```bash
./scripts/compose-up.sh logs api | tail -50
```

Ensure `DATABASE_URL` user can `CREATE TABLE` on `appdb`.

### Health check

```bash
curl -sk https://localhost:4011/dcfintake/api/v1/health
curl -sf http://127.0.0.1:4012/api/v1/health   # direct API port (no path prefix)
```

---

## 11. Backup (operator responsibility)

| Data | Location |
|------|----------|
| Postgres | Host DB `appdb` — use `pg_dump` |
| MinIO | Docker volume `miniodata` |
| Redis | Docker volume `redisdata` (queue ephemeral) |
| Ollama models | Docker volume `ollamadata` |

```bash
pg_dump "postgresql://foundry:foundry@127.0.0.1:5432/appdb" -Fc -f appdb-$(date +%F).dump
```

---

## 12. Security reminders (demo)

- Replace demo JWT / internal keys in production
- Do not commit `.env`
- IT Admin role cannot read case narrative (by design)
- See `Docs/SECURITY-PII-UI-AUDIT.md` and `Docs/SEED-005-OWASP-CLOSEOUT.md`

---

## 13. Quick reference card

```bash
export DCF_DEPLOY=/var/www/dcf-ait/dcf-ait/codebase/deploy
cd $DCF_DEPLOY

# After code edit on VM (rsync/git pull first)
./scripts/redeploy.sh api          # or frontend | ai-worker | all
./scripts/smoke.sh

# Status / logs
./scripts/compose-up.sh ps
./scripts/compose-up.sh logs -f api ai-worker

# Full stack bounce (keep volumes)
./scripts/compose-up.sh down && ./scripts/compose-up.sh up -d

# UI — hard-refresh after frontend redeploy
https://<host>:4011/dcfintake/
https://foundry.inapp.com/dcfintake/
```
