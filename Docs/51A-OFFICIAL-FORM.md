# Official 51A Printable Form

**Architecture:** `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` §13 · **OpenSpec:** `openspec/specs/form-51a/spec.md`

## Source template

The Massachusetts DCF **official fillable 51A report** is maintained as:

| Location | Role |
|----------|------|
| `dcf/51A-Report-Form.html` | Authoritative copy in repo (agency layout) |
| `codebase/api/templates/51A-Report-Form.html` | Runtime copy served by API (keep in sync on template updates) |

The template is a two-page, print-ready HTML form with:

- Toolbar: **Print / Save PDF**, **Clear** (hidden when printing via `@media print`)
- Programmatic API: `window.fill51A({ child1_name: "...", ... })` and `window.read51A()`
- Field `name` attributes (e.g. `child1_name`, `pg1_first`, `q_nature`) used for mapping

## Dual representation model

| Representation | Purpose | Consumer |
|----------------|---------|----------|
| **Working copy** (`Form51A` JSON, four sections) | Screener intake UI, AI merge, checkpoint validation | React mockup panels, API `GET/PATCH /form51a` |
| **Official printable** (HTML template) | Written 51A within 48 hours (PRD), print/PDF for area office | New browser tab, `GET /form51a/official` |

Data flow:

```
Transcript / NLP / screener edits
        ↓
   Form51A (JSON sections)  ← checkpoint & validation
        ↓
 MapReport51aToOfficialFields (51a-official-field-map.json)
        ↓
 fill51A({ ... }) injected into HTML template
        ↓
 Browser tab → Print / Save PDF
```

## Mapping

Field mapping rules live in `codebase/api/schemas/51a-official-field-map.json`.

Examples:

- `child.child_name` → `child1_name`
- `child.child_gender` → `child1_male` / `child1_female` checkboxes
- `household.caregiver` → `pg1_first`, `pg1_last` (name split)
- `child.child_addr` → `child1_address` + parsed `pg1_street`, `pg1_city`, `pg1_state`, `pg1_zip`
- `incident.allegation` + `incident.description` → `q_nature`
- `household.alleged` → `q_responsible`
- `reporter.rep_type` → `mandatory` / `voluntary` checkboxes

Unmapped official fields (e.g. `q_dv`, `signature`) remain editable in the printable tab for the screener before printing.

## API

- `GET /api/v1/cases/{caseId}/form51a/official` — returns `text/html` with template + auto-fill script on load
- `GET /api/v1/cases/{caseId}/form51a/official/preview` — same, allowed before checkpoint complete (watermark “DRAFT” in demo)
- Optional: `POST` body from `read51A()` to sync printable edits back to working copy (phase 2)

## UI (intake page)

After transcription / form data exists:

- **“Preview official 51A (print)”** — opens `/api/v1/cases/{id}/form51a/official` in `target=_blank`
- Enabled when at least one child name or incident description is present; full checkpoint still required for supervisor submit
- After checkpoint `complete`, toolbar shows **“Open 51A for printing”** (no DRAFT watermark)

## Security

- Official HTML route requires screener/supervisor role (same as case read).
- Response `Content-Security-Policy` restricts scripts to inline fill only.
- Audit event: `form51a.official.opened` with case id and user id (no full PII in log).

## Sync policy

When the screener updates the working copy (`PATCH /form51a`), the printable view reflects latest mapped values on next open. The platform does **not** auto-sync from printable tab to JSON unless screener explicitly saves (future enhancement).
