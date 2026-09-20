# Demo case search, linking, identity, and reset — proposal

## Goal

Improve demo usability for stakeholders:

1. Global case search by case number and child name (all roles).
2. Same-child linking via name + DOB (no merge/delete).
3. Case title = child name; case number = read-only auto-generated ID.
4. Admin-only demo data reset.

## Non-goals

- Production deploy changes outside `demo/`
- Case merge or duplicate removal
- CCWIS integration for duplicate detection

## User-visible outcome

- Header search on every login; operational roles open cases; admin sees metadata only.
- Lists and headers show child name with read-only case number chip.
- Related reports drawer when name+DOB match another case.
- Admin can reset demo data between presentations.
