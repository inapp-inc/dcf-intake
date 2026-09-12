# Statistical risk scoring framework

Child welfare intake uses a **rule-based, additive** risk score on a 1–20 scale. It is **statistical** (transparent point weights), not **probabilistic** (no LLM inference or calibrated probabilities).

## When scoring runs

1. Transcript is available after ASR.
2. **Triage** completes (LLM or keyword fallback) and persists `triage_flags`.
3. **Risk** stage runs once, reading transcript + flags + emergency flag.

Recompute (screener) recalculates immediately from the current transcript and database state.

## Formula

```
raw = baseline
    + Σ(keyword hits from triage keyword patterns)
    + Σ(triage flag points, excluding dismissed)
    + emergency bonus (if case.emergency)

score = clamp(round(raw), scaleMin, scaleMax)
label = highest band where score >= band.min
```

### Triage flag points

| Severity  | Base points | If status = pending |
|-----------|-------------|---------------------|
| critical  | configurable (default 4) | × pending multiplier (default 0.5) |
| high      | configurable (default 2) | × pending multiplier |

Confirmed flags use full base points. Dismissed flags contribute **0**.

### Keyword hits

Labels come from **Admin → Triage Keywords** (`keywordPatterns`). Each distinct label match adds points from `keywordPoints[label]` or `defaultKeywordPoints`.

### Emergency

If the case is in emergency escalation, add `emergencyPoints` (default 5).

## Default weights (`statistical-v1`)

| Component | Points |
|-----------|--------|
| Baseline  | 2 |
| Keyword: weapon | 4 |
| Keyword: injury | 3 |
| Keyword: removal | 2 |
| Triage critical (confirmed) | 4 |
| Triage high (confirmed) | 2 |
| Triage pending | 50% of above |
| Emergency active | 5 |

### Display bands (default)

| Score | Label |
|-------|-------|
| ≥ 15 | High |
| ≥ 10 | Moderate |
| ≥ 1 | Lower |

Supervisor routing still uses **emergency** and **risk ≥ 13** (see API supervisor rules). UI accent colors use ≥ 13 / ≥ 8 in the frontend theme.

## Configuration

- Stored in `system_config` key `risk_framework`.
- **Admin → Risk Scoring** (`GET/PUT /admin/risk-framework`).
- Worker loads the same JSON from SQLite when the pipeline risk stage runs.

## Auditability

Each assessment stores:

- `score`, `contributing_factors` (human-readable lines like `Keyword: weapon (+4)`), `model_version` (e.g. `statistical-v1`).

Artifact: `risk/output/{caseId}.json` includes full `breakdown` array.

## Override

Screener override is **audit-only**; it does not change the stored statistical score unless the case is recomputed.
