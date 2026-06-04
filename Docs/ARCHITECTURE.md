# DCF AIT — Architecture (redirect)

The consolidated platform architecture has moved to:

**[DCF-AIT-PLATFORM-ARCHITECTURE.md](./DCF-AIT-PLATFORM-ARCHITECTURE.md)**

That document is the **canonical** reference. It merges:

- Layered system design and Docker deployment  
- **§11 AI-enabled capabilities (full)** — transcription, NLP, triage, risk, assistant, generative docs  
- 51A form checkpoint and official printable HTML  
- Security, API contracts, and data model  
- Platform ADR alignment and project ADRs ([`Docs/adr/`](./adr/README.md) — ADR-DCF-0001–0008 for decisions D1–D8)  
- **8 OpenSpec domains** (including `ai-capabilities`), implementation tasks, and traceability  

Supporting detail remains in:

| Document | Topic |
|----------|--------|
| `FSD-DEMO.md` | Demo functional requirements |
| `SDD_Assumptions.md` | Demo vs production assumptions |
| `51A-OFFICIAL-FORM.md` | Official HTML mapping & print flow |
| `TRACEABILITY.md` | Requirements trace matrix (sync with §20) |
| `openspec/specs/*/spec.md` | Behavior specs (source of truth) |
| `openspec/changes/dcf-ait-platform-init/` | Proposal, design, tasks |
| `openapi.yaml` | REST API v1 contract |
