# Child Welfare Intake Demo — VM operations runbook

Operations guide for running the **demo stack** (`demo/`) on a remote Linux VM.

**Primary deploy path:** PM2 + host nginx (no Docker). See **[DEPLOY-RUNBOOK.md](DEPLOY-RUNBOOK.md)**.

**Legacy path:** Docker Compose — `scripts/package-docker.sh` / `scripts/deploy-docker.sh`.

**Stack (PM2):** Node API + Python pipeline worker under PM2; host nginx serves SPA and proxies API/WS.  
**Data:** `data/ait.db` + `data/artifacts/` under install root.  
**AI:** `config/ai.env` — Hugging Face cloud by default; Ollama local post-deploy.

---

## 1. Prerequisites (target VM)

| Requirement | Notes |
|-------------|--------|
| OS | Ubuntu x86_64 (or compatible Linux) |
| Node | 20+ LTS |
| Python | 3.10+ with `venv` |
| PM2 | `npm install -g pm2` (or `start.sh --install-system-deps`) |
| Tools | `unzip`, `curl`, `openssl` |
| nginx | Shared host (`client-demo.inapp.com`) with `/etc/nginx/routes/` includes |
| Disk | ≥ 5 GB free |
| RAM | ≥ 4 GB (8 GB if local Ollama on same VM) |
| Network | Outbound HTTPS for npm + Hugging Face |

**Ports (loopback):**

| Port | Service |
|------|---------|
| 11110 | API (`intake-api`) |
| 11111 | Docker nginx (legacy only) |

Public URL: `https://client-demo.inapp.com/intake/` via host nginx.

---

## 2. Scripts inventory

| Script | Where | Purpose |
|--------|-------|---------|
| `deploy/create-archive.sh` | Build machine | Stage `dist/intake-demo-staging/` (zip manually) |
| `scripts/deploy-pm2.sh` | Target VM | Unzip + `start.sh` |
| `start.sh` | Install root | Build, PM2, nginx |
| `run-production.sh` | Install root | Build only or build + PM2 |
| `deploy/configure-nginx.sh` | Install root | Host route → static + API proxy |
| `scripts/smoke.sh` | Install root | Health + auth (`DEPLOY_MODE=pm2`) |

**Docker (legacy):**

| Script | Purpose |
|--------|---------|
| `scripts/package-docker.sh` | Docker zip |
| `scripts/deploy-docker.sh` | Docker deploy |
| `scripts/install-host-nginx.sh` | Proxy to Docker nginx :11111 |

---

## 3. First-time install (PM2)

### 3.1 On build machine

```bash
cd demo
# package-pm2.sh creates .env + config/ai.env from examples when missing
# Edit config/ai.env — HF_API_TOKEN for cloud AI (required before packaging)

chmod +x scripts/*.sh start.sh run-production.sh deploy/*.sh
./deploy/create-archive.sh
# → ../dist/intake-demo-staging/  then zip manually for transfer
```

```bash
cd ../dist/intake-demo-staging && zip -r ../intake-demo.zip .
scp ../dist/intake-demo.zip user@vm:/tmp/
```

### 3.2 On target VM

```bash
export INSTALL_ROOT=/var/www/intake-demo
./scripts/deploy-pm2.sh /tmp/intake-demo-pm2.zip --install-system-deps
# Or manually:
# sudo unzip -o /tmp/intake-demo-pm2.zip -d $INSTALL_ROOT
# cd $INSTALL_ROOT && sudo bash start.sh --install-system-deps

pm2 save
pm2 startup   # run printed sudo command once
```

---

## 4. Updates

```bash
pm2 delete intake-api intake-worker
sudo unzip -o /tmp/intake-demo-pm2.zip -d /var/www/intake-demo
cd /var/www/intake-demo
sudo bash start.sh --no-nginx --no-seed
pm2 save
```

---

## 5. Smoke test

```bash
cd /var/www/intake-demo
DEPLOY_MODE=pm2 ./scripts/smoke.sh
```

---

## 6. AI provider switch

Edit `config/ai.env` on the VM:

```bash
# Cloud
LLM_PROVIDER=huggingface
HF_API_TOKEN=hf_...

# Local
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

```bash
pm2 restart all
```

---

## 7. Troubleshooting

| Symptom | Check |
|---------|--------|
| 502 on `/intake/` | `pm2 status`; `curl http://127.0.0.1:11110/api/v1/health` |
| SPA 404 on refresh | nginx `try_files` in `deploy/configure-nginx.sh` |
| Worker idle | `pm2 logs intake-worker`; HF token in `config/ai.env` |
| JWT errors | `.env` JWT_SECRET matches after redeploy |
| `./start.sh: not found` | CRLF — repackage with LF or `sed -i 's/\r$//' start.sh` |

Full detail: **[DEPLOY-RUNBOOK.md](DEPLOY-RUNBOOK.md)**.
