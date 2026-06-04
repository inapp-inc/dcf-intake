# ADR-DCF-0009: Statistical risk scoring (demo)

| Field | Value |
|-------|-------|
| Status | Accepted |
| Date | 2026-05-28 |
| Architecture | AI-8 (demo deviation) |
| Change | `openspec/changes/demo-enhancements-2026-05` |

## Context

PRD FR-3 and architecture §11 describe actuarial-style risk scores with contributing factors. The initial demo used an LLM to emit JSON scores 1–20, which is opaque and effectively probabilistic. Demo stakeholders need **explainable, reproducible** scores for governance demos.

## Decision

In the packaged `demo/` stack:

1. Risk is computed by an **additive rule-based model** (baseline, keyword hits, triage flags with pending multiplier, emergency bonus), capped to scale 1–20.
2. Weights and bands live in `system_config.risk_framework` (`statistical-v1` default).
3. Pipeline runs risk **after** triage so flag rows exist.
4. Screener **recompute** runs synchronously in the API; worker uses the same formula.
5. Screener **override** remains audit-only and does not change the stored score.

Triage reasoning and NLP remain LLM-backed (HF in packaged demo).

## Consequences

- Positive: Transparent factor lines; admin-tunable weights; no LLM hallucination on score.
- Negative: Not calibrated to SACWIS/production actuarial models; equity validation still out of scope.
- Production path: Replace weights with validated coefficients or approved model service; keep human-in-the-loop override.

## References

- `demo/docs/risk-scoring-framework.md`
- `openspec/specs/ai-capabilities/spec.md` (Statistical risk score requirement)
- `openspec/specs/ai-pipeline/spec.md` (Risk after triage)
