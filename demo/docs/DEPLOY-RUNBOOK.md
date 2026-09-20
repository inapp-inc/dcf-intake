# Child Welfare Intake Demo — PM2 deploy runbook

Ubuntu + PM2 + host nginx. **No Docker.** Nginx terminates TLS and serves the SPA; the API and pipeline worker run on loopback under PM2.

Adapted from the shared [PM2 Ubuntu deploy runbook](https://github.com/cursor/skills/blob/main/pm2-ubuntu-deploy/RUNBOOK.md).

---

## 0. Config

| Key | Value | Notes |
|---|---|---|
| `<APP_NAME>` | `intake-demo` | Process prefix, logs, nginx route |
| `<INSTALL_ROOT>` | `/var/www/intake-demo` | Flat zip extract path |
| `<ARCHIVE_NAME>` | `intake-demo-pm2.zip` | From `scripts/package-pm2.sh` |
| `<STAGING_DIR>` | `../dist/intake-pm2-staging` | Local stage (optional) |
| `<PUBLIC_HOST>` | `client-demo.inapp.com` | Shared demo hostname |
| `<PUBLIC_SCHEME>` | `https` | |
| `<NODE_MAJOR>` | `20` | API build + runtime |
| `<BIND_HOST>` | `127.0.0.1` | API loopback only |
| `<ENV_FILE>` | `.env` | At install root; template: `deploy/.env.example` |
| `<SECRETS>` | `JWT_SECRET`, `INTERNAL_API_KEY`, `HF_API_TOKEN` | Generated on first start if placeholders |
| `<DB>` | `data/ait.db` (SQLite) | **Fork, 1 instance** — do not cluster API |
| `<SSL_CERTIFICATE>` | Host shared cert | e.g. `/etc/ssl/inapp/SSL/inapp.com.pem` |
| `<SSL_CERTIFICATE_KEY>` | Host shared key | e.g. `/etc/ssl/inapp/SSL/inapp.com.key` |
| `<NGINX_STRATEGY>` | `snippet` | `/etc/nginx/routes/intake.conf` |
| `<NGINX_SNIPPET>` | `/etc/nginx/routes/intake.conf` | Written by `deploy/configure-nginx.sh` |
| `<START_SCRIPT>` | `start.sh` | At install root |
| `<ECOSYSTEM>` | `deploy/ecosystem.config.cjs` | PM2 app list |

### Processes

| PM2 name | Script | Port | URL prefix | Memory cap |
|---|---|---|---|---|
| `intake-api` | `api/dist/index.js` | `11110` | `/intake/api/` (via nginx) | `512M` |
| `intake-worker` | `worker/worker/main.py` | — | — | `768M` |

| URL | Path |
|---|---|
| Public UI | `https://client-demo.inapp.com/intake/` |
| Health (loopback) | `http://127.0.0.1:11110/api/v1/health` |
| Public API (via nginx) | `https://client-demo.inapp.com/intake/api/v1/...` |

Frontend static files are served by **host nginx** from `frontend/dist/` (not a PM2 process).

---

## 1. Architecture

```text
Internet → nginx (:443, TLS)
              ├─ /intake/           → frontend/dist (static SPA)
              ├─ /intake/api/       → 127.0.0.1:11110/api/  (PM2 intake-api)
              └─ /intake/ws/        → 127.0.0.1:11110/ws/  (PM2 intake-api)

PM2 intake-worker → SQLite queue + Hugging Face / Ollama (config/ai.env)
```

- API binds `127.0.0.1:11110` only (`HOST` + `PORT` in `.env`).
- PM2 **fork** mode, **one instance** per process (SQLite single-writer).
- AI config lives in `config/ai.env` — switch HF ↔ Ollama without rebuild.

---

## 2. Repo contract

| Path | Role |
|---|---|
| `start.sh` | First-run: env, secrets, build, PM2, nginx |
| `run-production.sh` | Build API + frontend + worker venv; `--pm2` to start |
| `deploy/ecosystem.config.cjs` | PM2 process list |
| `deploy/.env.example` | Production env template |
| `deploy/configure-nginx.sh` | Write `/etc/nginx/routes/intake.conf` |
| `deploy/load-pm2-env.cjs` | Merge `.env` + `config/ai.env`; resolve host paths |
| `README-SERVER.txt` | Short copy/unzip/run for SSH |
| `.gitattributes` | LF for `*.sh`, `*.cjs` |

`start.sh` flags:

| Flag | Meaning |
|---|---|
| `--no-nginx` | Skip nginx route (updates) |
| `--no-seed` | No-op (migrations seed via SQL) |
| `--no-build` | Skip npm/vite/python build |
| `--install-system-deps` | First machine: apt Node 20, python3-venv, pm2 |

---

## 3. Package on build machine

```bash
cd demo
# package-pm2.sh creates .env + config/ai.env from examples when missing
# Edit config/ai.env (HF_API_TOKEN) before packaging if not already set

chmod +x scripts/*.sh scripts/lib/*.sh start.sh run-production.sh deploy/*.sh
./scripts/package-pm2.sh
# → ../dist/intake-demo-pm2.zip
```

Copy to VM:

```bash
scp ../dist/intake-demo-pm2.zip user@vm:/tmp/
```

**Do not** commit the zip. Package includes `.env` + `config/ai.env` when present on the build machine (same as Docker packaging).

---

## 4. First install on Ubuntu

Prereqs: `sudo`, `unzip`, Node 20+, `python3-venv`, outbound HTTPS (npm + Hugging Face).

```bash
sudo mkdir -p /var/www/intake-demo
sudo unzip -o /tmp/intake-demo-pm2.zip -d /var/www/intake-demo
cd /var/www/intake-demo
sudo bash start.sh --install-system-deps   # first machine only
pm2 save
pm2 startup          # run the printed sudo command as deploy user
```

Or use the wrapper:

```bash
./scripts/deploy-pm2.sh /tmp/intake-demo-pm2.zip --install-system-deps
```

Verify:

```bash
pm2 status
curl -sf http://127.0.0.1:11110/api/v1/health
DEPLOY_MODE=pm2 ./scripts/smoke.sh
```

Public: `https://client-demo.inapp.com/intake/`

---

## 5. Nginx (shared host — existing configs preserved)

Deploy **never** edits `nginx.conf`, `sites-available/`, `sites-enabled/`, or other apps’ route files.

It writes **one snippet only**: `/etc/nginx/routes/intake.conf` (name from `NGINX_ROUTE`). If that file already exists, it is backed up to `intake.conf.bak.<timestamp>` before overwrite. `nginx -t` runs on the **full** config; if validation fails, the previous `intake.conf` is restored.

All locations are scoped to `/intake/` — no server-wide `/login` or `/api` redirects that could break other apps on `client-demo.inapp.com`.

Set `NGINX_MANAGED=0` in `.env` (or pass `--no-nginx` to `start.sh`) if ops will add the snippet manually.

`deploy/configure-nginx.sh` writes `/etc/nginx/routes/intake.conf`:

- Static SPA at `/intake/` from `$INSTALL_ROOT/frontend/dist/`
- Proxy `/intake/api/` → `http://127.0.0.1:11110/api/`
- Proxy `/intake/ws/` → WebSocket upgrade to API

Requires the existing `client-demo.inapp.com` 443 vhost to `include /etc/nginx/routes/*.conf;`.

Manual re-run:

```bash
cd /var/www/intake-demo
sudo bash deploy/configure-nginx.sh
```

---

## 6. Updates

```bash
pm2 delete intake-api intake-worker
sudo unzip -o /tmp/intake-demo-pm2.zip -d /var/www/intake-demo
cd /var/www/intake-demo
sudo bash start.sh --no-nginx --no-seed
pm2 save
```

| Situation | Command |
|---|---|
| Code only, keep DB + nginx | `start.sh --no-nginx --no-seed` |
| Skip rebuild | `start.sh --no-nginx --no-build` |
| Change AI provider | Edit `config/ai.env`, `pm2 restart all` |
| Cert / path / port change | Full `start.sh` without `--no-nginx` |
| Restart only | `pm2 restart all` |

---

## 7. Day-to-day

```bash
cd /var/www/intake-demo
pm2 status
pm2 logs intake-api --lines 200
pm2 logs intake-worker --lines 200
pm2 restart all
```

Logs: `logs/intake-api-*.log`, `logs/intake-worker-*.log`

Data: `data/ait.db`, `data/artifacts/`

---

## 8. AI configuration (`config/ai.env`)

| Mode | Settings |
|---|---|
| Cloud (default) | `LLM_PROVIDER=huggingface`, `HF_API_TOKEN=hf_…` |
| Local LLM | `LLM_PROVIDER=ollama`, `OLLAMA_BASE_URL=http://127.0.0.1:11434` |

After edit: `pm2 restart all`

ASR uses Hugging Face unless `HF_ASR_API_URL` points elsewhere.

---

## 9. Gotchas

1. **`vite: not found`** — build uses `npm ci --include=dev`; do not set `NODE_ENV=production` before install.
2. **CRLF on `start.sh`** — use `.gitattributes`; package script normalizes LF.
3. **SQLite + cluster** — ecosystem uses `instances: 1`, `exec_mode: fork`.
4. **`0.0.0.0` binding** — set `HOST=127.0.0.1` in `.env` for PM2.
5. **`--no-nginx` on updates** — avoids clobbering shared vhost during code-only deploys.
6. **Placeholder secrets** — `start.sh` generates JWT/internal key; HF token must be set in `config/ai.env`.
7. **Zip layout** — flat extract (`start.sh` at install root, not nested folder).
8. **`pm2 startup` user** — run as the same user that owns the PM2 processes.

---

## 10. Docker (legacy)

Docker Compose packaging remains available via `scripts/package-docker.sh` and `scripts/deploy-docker.sh`. Prefer this PM2 runbook for VM hosting without Docker.

See also: [`VM-RUNBOOK.md`](VM-RUNBOOK.md) (operations index).
