# Discovery and Design

Requirements elicitation via Gap Manager Portal was **bypassed** for this demo (see `Docs/SDD_Assumptions.md`).

## Inputs used instead

| Artifact | Path |
|----------|------|
| Product Requirements Document | `DCF_AIT_PRD.md` |
| UI mockup (React) | `mockup/DCF_AIT_UI.jsx` |
| Official printable 51A form | `dcf/51A-Report-Form.html` → `Docs/51A-OFFICIAL-FORM.md` |
| Platform architecture | `Docs/DCF-AIT-PLATFORM-ARCHITECTURE.md` |
| Spec alignment | `Docs/SPEC-ALIGNMENT.md` |
| Demo FSD | `Docs/FSD-DEMO.md` |

## UI reference

The interactive mockup at `mockup/DCF_AIT_UI.jsx` is the visual source of truth for:

- Design tokens (navy, teal, coral palette)
- Role-based navigation (screener, supervisor, worker, admin)
- 51A intake layout: transcript, **four-section 51A form (mandatory checkpoint)**, risk, triage, AI assistant panel
- Supervisor, worker, and admin dashboards

Figma Make prompt generation is deferred until post-architecture approval per SDD workflow.
