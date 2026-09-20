# Design — case search, linking, identity, reset

## Data model

- `cases.external_id` — sequential `IR-{year}-{seq}` (read-only).
- `cases.child_display` — denormalized child name for lists/search.
- `cases.child_match_key` — `{normalized_name}|{YYYY-MM-DD}` when both name and DOB present.

Indexes: `external_id`, `child_display`, `child_match_key`.

## Search

`GET /cases/search?q=` — case-insensitive match on `external_id`, `child_display`, and joined `form_51a_fields.child_name`. Limit 20. All roles; admin metadata only in UI.

## Related cases

Same `child_match_key` on other rows. `GET /cases/:caseId/related` and embedded `relatedCases` on case detail.

## RBAC

Workers: read any case; writes remain assigned-only. Admin: search metadata only; no narrative endpoints.

## Demo reset

`POST /admin/demo-reset` with `{ confirm: "RESET" }`. Wipe jobs, audit, cases (cascade), artifact dirs. Preserve migrations, system_config, demo users. Optional seed pair with same match key.
