# ADR-DCF-0007: Dual 51A Representation (JSON Working Copy + Official HTML)

## Status

**Accepted**

## Date

2026-05-28

## Architecture decision

**D6** — 51A representation

## Context

DCF intake requires both **interactive screener work** (AI merge, validation, confirm/edit) and the **agency’s official written 51A** for print/PDF. The UI mockup defines four JSON sections (`FORM_FIELDS`); the agency template is `dcf/51A-Report-Form.html` with `fill51A()` / `read51A()`. Storing only UI state or only HTML would break checkpoint validation, AI provenance, or legal print layout.

## Decision

1. **Working copy** — canonical `Form51A` JSON in Postgres (`form_51a_fields`), four sections: `child`, `incident`, `reporter`, `household`.
2. Schema: `codebase/api/schemas/51a-form.schema.json`; field metadata: `value`, `source` (`human`|`ai`|`ccwis`), `confirmedByHuman`, `required`, `missing`.
3. **Official printable** — static HTML template; runtime copy at `codebase/api/templates/51A-Report-Form.html`.
4. **Mapping** — `codebase/api/schemas/51a-official-field-map.json` drives `MapReport51aToOfficialFields` → `fill51A({...})`.
5. **API:** `GET/PATCH /cases/{id}/form51a` for working copy; `GET /cases/{id}/form51a/official` returns `text/html` for `window.open` print flow.
6. **No separate DB table** for official HTML — derived on read from working copy + template.

## Alternatives considered

| Alternative | Why rejected |
|-------------|----------------|
| UI-only fields without server model | No checkpoint, audit, or API contract |
| Official HTML as sole store | Cannot track AI confidence, confirm/edit, or section merge |
| PDF generation only in browser | Loses server-side mapping consistency and audit |

## Consequences

### Positive

- Screener UX matches mockup; print matches agency form.
- NLP merges into JSON; official view is deterministic, not generative.
- Draft preview allowed before checkpoint (DRAFT banner); print emphasized after complete.

### Negative

- Two representations must stay in sync via field-map maintenance.
- Unmapped official fields (e.g. signatures) remain manual in print tab.

## Compliance

| Concern | Address |
|---------|---------|
| OpenSpec `form-51a` | Working copy + official render |
| PRD FR-1.2 | Structured 51A fields |
| `Docs/51A-OFFICIAL-FORM.md` | Mapping detail |

## References

- `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §12–13
- `Docs/51A-OFFICIAL-FORM.md`
- `openapi.yaml` — `/form51a` paths

## Related decisions

| ID | Relationship |
|----|----------------|
| **D7** | [ADR-DCF-0008](./ADR-DCF-0008-51a-checkpoint-gate.md) |
| **D8** | [ADR-DCF-0001](./ADR-DCF-0001-demo-inference-ollama.md) — NLP → working copy |
