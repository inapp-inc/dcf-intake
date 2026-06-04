# ADR-DCF-0008: Mandatory 51A Checkpoint Gate

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D7** — 51A gate

## Context

AI-populated 51A fields must not flow to supervisor submit or parallel background checks without **explicit screener review**. The PRD and demo acceptance criteria require a **mandatory checkpoint** before `SubmitCaseToSupervisor` and before background orchestration. Treating “pipeline complete” as submit-ready would violate human-in-the-loop and FR-1.3 mandatory-field rules.

## Decision

1. Persist `form51a_checkpoint_status` on the case (or equivalent aggregate), with states:
   - `not_started` → `ai_populating` → `ready_for_review` → `incomplete` | `complete` → `locked` (post-submit).
2. **`CompleteForm51aCheckpoint` use case** validates:
   - All mandatory fields present.
   - All AI-sourced fields **confirmed or edited** (`confirmedByHuman` / `source=human`).
3. **`SubmitCaseToSupervisor`** returns **HTTP 409** `FORM_51A_INCOMPLETE` if checkpoint ≠ `complete`.
4. **`AcceptReportForBackgroundChecks`** (or pipeline trigger) fires only when checkpoint = `complete` — not when transcription/NLP alone finishes.
5. UI: disable “Submit to Supervisor” until `checkpointStatus=complete` (mockup acceptance).
6. Audit every checkpoint transition and failed submit attempt.

### Checkpoint vs pipeline

| Event | Does **not** unlock submit |
|-------|---------------------------|
| Transcription complete | ✓ |
| NLP merge complete | ✓ (moves to `ready_for_review`) |
| Risk/triage scored | ✓ |

| Event | Unlocks submit + background |
|-------|----------------------------|
| Screener completes checkpoint | ✓ |

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| Pipeline-complete implies submit-ready | Bypasses human review of AI fields |
| Soft warning only | Fails demo acceptance and PRD Module 10 |
| Checkpoint only in UI | Must enforce in `api` / `PolicyEngine` |

## Consequences

### Positive

- Clear gate for presales: “AI assists, human attests.”
- Background mocks run on legally meaningful milestone.
- OpenSpec and FSD acceptance testable via 409 response.

### Negative

- Extra screener steps in demo scripts.
- Workers must respect checkpoint event, not only `nlp/output/` prefix.

## Compliance

| Concern | Address |
|---------|---------|
| PRD Module 10 | Human-in-the-loop |
| Demo acceptance | Architecture §5, §22.3 |
| OpenSpec `form-51a`, `intake` | Checkpoint scenarios |
| **D4** | [ADR-DCF-0005](./ADR-DCF-0005-security-jwt-rbac-policy.md) — PolicyEngine |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §12.3–12.5
- `openspec/specs/form-51a/spec.md`
- `Docs/FSD-DEMO.md`

## Related decisions

| ID | Relationship |
|----|----------------|
| **D6** | [ADR-DCF-0007](./ADR-DCF-0007-dual-51a-representation.md) |
| **D5** | [ADR-DCF-0006](./ADR-DCF-0006-mock-integration-adapters.md) — background after gate |
| **D8** | [ADR-DCF-0001](./ADR-DCF-0001-demo-inference-ollama.md) — NLP before review |
