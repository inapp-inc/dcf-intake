# ADR-DCF-0001: Demo LLM Inference with Ollama (Dedicated Container)

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D8** — AI runtime

## Context

The DCF AIT **demo platform** must run all AI capabilities with **real models**—no stubs or fixture responses—on a **single VM** via Docker Compose. Child-welfare PII must remain inside the deployment boundary (no external commercial LLM APIs).

Requirements from architecture and OpenSpec:

- **LLM-level** operations (NLP extraction, risk scoring, triage reasoning, generative documents, AIT Assistant) should use a **single small language model (SLM)** where feasible.
- Inference must run in a **separate container** from `api` and `ai-worker`, with an internal-only network endpoint.
- **Speech-to-text** is not an LLM; it uses **faster-whisper** inside `ai-worker`.
- Production north star remains GovCloud (Transcribe, SageMaker, Bedrock); the demo stack must support adapter swap without UI changes.

We evaluated **Hugging Face–aligned** self-hosted alternatives:

| Option | Verdict |
|--------|---------|
| **vLLM / SGLang** | Strong for GPU production; poor fit for CPU-only demo VM |
| **TGI (Text Generation Inference)** | Maintenance mode (late 2025); HF recommends vLLM/SGLang; CPU not intended |
| **llama.cpp server** | CPU-friendly; lower-level than Ollama (manual GGUF lifecycle) |
| **LocalAI** | Viable; more configuration surface |
| **Transformers in-process** | Couples inference to worker; violates separate-container goal |
| **HF Inference Endpoints / API** | Ruled out—PII leaves the VM |

For a **CPU-oriented**, **low-ops** demo VM, **Ollama** provides the best balance: dedicated daemon, simple model pull (`ollama pull`), internal HTTP API, and GGUF models (many originating from Hugging Face Hub).

## Decision

1. **Deploy Ollama** as a dedicated Docker Compose service (`ollama`) on internal network `ait-net` at `http://ollama:11434`. Do **not** publish port 11434 to the host in the default compose file.
2. **Bootstrap models** with a one-shot `ollama-init` service that runs `ollama pull ${OLLAMA_MODEL}` after `ollama` is healthy.
3. **Use one SLM** for all LLM-level pipeline stages and sync assistant chat, configured via `OLLAMA_MODEL` (default: `llama3.2:3b`).
4. **Call Ollama** from `ai-worker` (async pipeline) and `api` (sync AIT Assistant) using `OLLAMA_BASE_URL` and `POST /api/chat` (or equivalent Ollama generate API).
5. **Run ASR** with faster-whisper in `ai-worker` (`WHISPER_MODEL`, `WHISPER_DEVICE`)—not in the Ollama container.
6. **Implement hexagonal adapters** `Ollama*` / `Whisper*` for demo and `Aws*` for production. **No `Stub*` AI adapters.**
7. **Record model version** in audit metadata as `ollama_model` + prompt template version.

### Configuration (demo)

| Variable | Service(s) | Default |
|----------|------------|---------|
| `OLLAMA_BASE_URL` | `api`, `ai-worker` | `http://ollama:11434` |
| `OLLAMA_MODEL` | `api`, `ai-worker`, `ollama-init` | `llama3.2:3b` |
| `WHISPER_MODEL` | `ai-worker` | `base` |
| `WHISPER_DEVICE` | `ai-worker` | `cpu` |
| `NLP_CONFIDENCE_THRESHOLD` | `ai-worker` | `0.65` |

### Startup order

`postgres` / `redis` / `minio` → `ollama` → `ollama-init` → `api` → `ai-worker`.

## Consequences

### Positive

- Real inference on demo hardware without external LLM APIs.
- Minimal operational overhead (pull one model, one inference container).
- CPU-friendly quantized models; suitable for typical presales/demo VMs.
- Clear separation: `api` / `ai-worker` orchestrate; Ollama serves weights.
- Aligns with platform **MERN + Python capabilities** (ADR-0001) and **modular monolith** demo footprint.

### Negative / trade-offs

- Ollama API is not fully identical to OpenAI `/v1/chat/completions`; adapters must target Ollama explicitly (production swap to vLLM/Bedrock uses different clients).
- Throughput and concurrency are limited compared to vLLM/SGLang; acceptable for demo, not for high-concurrency production.
- First deploy requires network access and disk for `ollama-init` model download.
- SLM accuracy and equity are **not** production-validated; demo proves workflows and guardrails, not FR accuracy targets.

### Follow-on (out of scope for this ADR)

- Production migration: GovCloud Transcribe + SageMaker + Bedrock (see architecture §21).
- Optional GPU demo profile: revisit vLLM/SGLang under a future ADR if demo hosts standardize on NVIDIA GPUs.
- Abstract `ILlmInferenceService` behind OpenAI-compatible HTTP when implementing SEED-002 to ease later engine swaps.

## Compliance

| Concern | How this ADR addresses it |
|---------|---------------------------|
| PII sovereignty | Inference on `ait-net` only; no HF/cloud inference APIs |
| Human-in-the-loop | Unchanged—`PolicyEngine` in API; AI is advisory |
| No AI stubs | Mandates real Ollama + Whisper inference |
| Platform ADR-0012 | Model and host configuration via environment variables |
| Platform ADR-0017 | Demo stack documented; production adapters swapped per §21 |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §10 (Docker), §11.2 (model strategy), decision **D8**
- `codebase/deploy/docker-compose.yml`, `codebase/deploy/.env.example`
- `openspec/specs/ai-capabilities/spec.md` — Ollama SLM runtime requirement
- `openspec/changes/dcf-ait-platform-init/design.md` — D6

## Related decisions

| ID | Relationship |
|----|----------------|
| **D8** (architecture §7) | This ADR |
| **D1** | [ADR-DCF-0002](./ADR-DCF-0002-layered-modular-monolith.md) — `ai-worker` hosts ASR |
| **ADR-0001** (platform) | MERN + Python capabilities |
| **ADR-0012** (platform) | Configuration via env |
| **ADR-0016** (platform) | Future extraction of inference to dedicated GovCloud service |
