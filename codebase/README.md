# DCF AIT — Codebase

Implementation root for the Automated Intake Tool demo platform.

## Layout

| Path | Layer | Description |
|------|-------|-------------|
| `frontend/` | L9 Presentation | React SPA (from `mockup/DCF_AIT_UI.jsx`) |
| `api/` | L7–L8 Application + BFF | Node.js Express, domain, RBAC, REST + WS, **51A HTML template** |
| `api/templates/` | Official printable | `51A-Report-Form.html` (from `dcf/`) |
| `worker/` | L5 AI orchestration | Python pipeline consumer; faster-whisper ASR; Ollama client |
| `deploy/` | Infrastructure | Docker Compose (`ollama`, `ollama-init`), nginx, env templates |

## Documentation

- Architecture: `../Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md`
- Project ADRs: `../Docs/adr/README.md` (ADR-DCF-0001–0008 — architecture decisions D1–D8)
- API contract: `../openapi.yaml`
- OpenSpec: `../openspec/specs/` (8 domains — see `../openspec/README.md`)
- Alignment: `../Docs/SPEC-ALIGNMENT.md`

## Quick start (after implementation)

```bash
cd deploy
cp .env.example .env
# Edit secrets; set OLLAMA_MODEL if needed; place TLS certs in deploy/nginx/certs/
# First boot pulls the SLM via ollama-init (requires network)
docker compose up -d --build
```

## Implementation status

| Component | Status |
|-----------|--------|
| Architecture & OpenAPI | ✅ Defined |
| Docker Compose skeleton | ✅ Defined |
| frontend / api / worker | 🔲 Phase 1+ (see `openspec/changes/dcf-ait-platform-init/tasks.md`) |
