# Change Proposal: dcf-ait-platform-init

## Summary

Establish the DCF Automated Intake Tool **demo platform** architecture, API contract, Docker deployment topology, and OpenSpec behavior library—bypassing formal requirements elicitation per stakeholder direction.

## Motivation

- PRD v2.0 defines a nine-layer secure architecture and event-driven AI pipeline.
- UI mockup (`mockup/DCF_AIT_UI.jsx`) defines role-based workflows and visual design.
- Target deployment: single VM via Docker containers.

## Scope

**In scope**

- Architecture document (`Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md`)
- Demo FSD and assumptions
- OpenSpec domain specifications (**8 domains**: auth-rbac, intake, form-51a, ai-pipeline, **ai-capabilities**, screening, investigation, audit)
- OpenAPI v1 contract
- Docker Compose skeleton and service boundaries
- Codebase directory layout (no full implementation in this change)

**Out of scope**

- Gap questionnaire / portal workflow
- Production GovCloud IaC
- Live agency integrations
- Full frontend/backend implementation (follow-on SEED units)

## Success criteria

1. Reviewer can understand layers, containers, and security controls from `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md`.
2. OpenAPI documents all demo-critical endpoints.
3. `docker compose config` validates without errors.
4. OpenSpec requirements (8 domains) trace to PRD FR modules including full AI capability catalog (architecture §11).

## Risks

| Risk | Mitigation |
|------|------------|
| Demo stack diverges from PRD AWS design | Migration table in architecture §9 |
| Over-scoping first implementation slice | `tasks.md` sequences SEED-sized work |
| Mock AI perceived as production-ready | Labeling in UI + assumptions doc |

## Approval

**Status:** Awaiting stakeholder review (SDD architecture checkpoint).
