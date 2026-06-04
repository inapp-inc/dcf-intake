# Architecture & Spec Alignment Checklist

Use this checklist when editing any architecture or spec file to avoid drift.

**Canonical architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` (v1.2+)  
**Canonical traceability:** `Docs/TRACEABILITY.md` (= architecture §20)  
**OpenSpec domains:** **8** (see `openspec/README.md`)

## Document set

| File | Role | Must align on |
|------|------|----------------|
| `DCF-AIT-PLATFORM-ARCHITECTURE.md` | Master architecture | Layers, §11 AI catalog, 8 domains, checkpoint, official 51A |
| `Docs/adr/ADR-DCF-*.md` | Project ADRs (D1–D8) | One ADR per architecture §7 decision |
| `ARCHITECTURE.md` | Redirect only | Points to master |
| `FSD-DEMO.md` | Demo requirements | Epic → OpenSpec domain mapping |
| `SDD_Assumptions.md` | Demo vs prod | 8 domains, architecture path |
| `51A-OFFICIAL-FORM.md` | Printable 51A | form-51a spec, §13 |
| `TRACEABILITY.md` | S1–S11 + S10a–c | Same rows as architecture §20 |
| `openapi.yaml` | REST contract | Endpoints match intake/form51a/ai flows |
| `openspec/config.yaml` | OpenSpec context | 8 domains listed |
| `openspec/changes/dcf-ait-platform-init/*` | Proposal, design, tasks | 8 domains, master doc path |
| `openspec/changes/demo-enhancements-2026-05/*` | Demo implementation change spec | Statistical risk, HF demo, admin config, 51B memo |
| `demo/docs/risk-scoring-framework.md` | Statistical risk detail | `ai-capabilities`, ADR-DCF-0009 |
| `demo/docs/screening-51a-process.md` | Process diagram (Mermaid) | intake, screening |

## OpenSpec cross-reference rules

| Topic | Owns spec | Others reference only |
|-------|-----------|------------------------|
| Pipeline stages | `ai-pipeline` | `intake`, `ai-capabilities` |
| Transcription, NLP, triage, **statistical risk**, assistant, generative AI | `ai-capabilities` | `intake`, `investigation`, `screening` |
| Statistical risk weights (demo) | `ai-capabilities` + `demo/docs/risk-scoring-framework.md` | ADR-DCF-0009 |
| 51A form & checkpoint | `form-51a` | `intake`, `ai-pipeline` |
| Official HTML print | `form-51a` | `51A-OFFICIAL-FORM.md` (detail) |
| RBAC | `auth-rbac` | — |
| Audit | `audit` | `ai-capabilities` (model version) |

## Counts that must match everywhere

- **OpenSpec domains:** 8 (not 6 or 7)  
- **51A checkpoint:** required before `/submit` and before background checks  
- **AI processing:** full catalog in architecture §11 + `ai-capabilities` spec; packaged `demo/` = HF Inference for LLM/ASR; `codebase/deploy` = Ollama profile per ADR-0001
- **Demo risk:** statistical only (ADR-DCF-0009); not LLM  
- **Assumptions file path:** `Docs/SDD_Assumptions.md`

## Last alignment pass

2026-05-28 — ADR-DCF-0001–0009; `demo-enhancements-2026-05` change spec; OpenSpec updates for statistical risk, triage→risk pipeline, admin config, 51B field memo, briefing progress; openapi demo endpoints.
