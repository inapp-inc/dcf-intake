# Screening & 51A Process (DCF AIT Demo)

Mermaid diagram for **screener 51A intake** through **supervisor screening**. Field-worker investigation and 51B are out of scope here.

```mermaid
flowchart TB
  classDef ai fill:#E4F7F6,stroke:#0A8A85,color:#1B3054
  classDef human fill:#FEE9E5,stroke:#D44530,color:#1B3054
  classDef gate fill:#FEF3C7,stroke:#C97500,color:#1B3054
  classDef status fill:#E8EDF8,stroke:#1B3054,color:#1B3054
  classDef decision fill:#1B3054,stroke:#1B3054,color:#FFFFFF

  subgraph SCREENER["① Screener — 51A intake · case status: in_progress"]
    direction TB
    A([New 51A case]) --> B[Upload hotline audio]
    B --> C{AI pipeline worker}

    subgraph PIPE["AI pipeline (after audio)"]
      direction TB
      T1[Transcribe · Whisper] --> T2[Clean transcript]
      T2 --> T3[NLP → populate 51A fields<br/>teal AI fields · checkpoint → ai_populating]
      T3 --> P1[Keywords + LLM triage]
      T3 --> P2[Risk score LLM 1–20 advisory]
      P2 --> P3[Supervisor summary document]
    end

    C --> T1
    P1 --> H1
    P3 --> H1

  H1["Screener review — human"]:::human
  H1 --> H2[Confirm / edit teal AI fields]
  H2 --> H3[Confirm or dismiss triage flags]
  H3 --> H4{≥ 2 confirmed flags?}
  H4 -->|yes| H5[case.emergency = true]:::gate
  H4 -->|no| H6[Continue form]
  H5 --> H6
  H6 --> H7[All required 51A fields filled<br/>sections: child · incident · reporter · household · filing]
  H7 --> H8[Complete 51A checkpoint]:::human
  H8 --> H9[checkpoint → complete<br/>enqueue background checks]:::status
  H9 --> H10[Background checks mock complete]:::ai
  H10 --> H11[Submit to supervisor]:::decision
  end

  H11 --> Q

  subgraph SUPERVISOR["② Supervisor — screening · case status: pending_review"]
    direction TB
    Q[Pending review queue<br/>sorted: emergency first]:::status
    Q --> R[Review 51A · transcript · triage · risk · background]
    R --> S[AI advisory recommendation]:::gate
    S --> S1{Rules}
    S1 -->|emergency| S2[Screen In — Emergency 2hr]
    S1 -->|risk ≥ 13| S3[Screen In — Priority]
    S1 -->|else| S4[Screen In — Non-Emergency]
    S2 --> D
    S3 --> D
    S4 --> D
    D{Supervisor decision — human}:::human
    D -->|approve_screen_in| E[assigned · field investigation]:::status
    D -->|screen_out| F[screened_out]:::status
    D -->|request_clarification| G[needs_clarification → screener]:::status
  end

  subgraph CHECKPOINT["51A checkpoint states"]
    direction LR
    CP0[not_started] --> CP1[ai_populating]
    CP1 --> CP2[ready_for_review / incomplete]
    CP2 --> CP3[complete]
    CP3 --> CP4[locked on submit]
  end

  class T1,T2,T3,P1,P2,P3,H10 ai
  class H1,H2,H3,H8,D human
  class H4,H5,S,S1 gate
  class H9,H11,Q,E,F,G status
  class H11 decision
```

## Parallel paths (reference)

```mermaid
flowchart LR
  NLP[NLP complete] --> TRI[Triage parallel]
  NLP --> RSK[Risk parallel]
  RSK --> DOC[Documents supervisor_summary]
  TRI -.->|flags status pending| REV[Screener confirms/dismisses]
  REV -.->|≥2 confirmed| EM[emergency flag]
```

## Screening decision outcomes

| Decision | Case status | Next step (demo) |
|----------|-------------|------------------|
| `approve_screen_in` | `assigned` | Field worker queue (out of diagram) |
| `screen_out` | `screened_out` | Case closed from screening |
| `request_clarification` | `needs_clarification` | Returns to screener for more 51A work |

## 51A completion gates (before submit)

| Gate | Requirement |
|------|-------------|
| Mandatory fields | All required fields in all sections have values |
| AI fields | Every `source: ai` field has `confirmedByHuman` |
| Checkpoint | `form51a_checkpoint_status === complete` |
| Submit | Sets checkpoint `locked`, case `pending_review` |

## Triage & risk (advisory)

- **Triage:** keyword scan + LLM indicators (DCF Admin config) → `triage_flags` with `pending` → screener `confirm` / `dismiss`
- **Emergency:** API sets `emergency` when **≥ 2** confirmed flags (demo hardcoded; admin `escalationThreshold` in config UI)
- **Risk:** LLM score 1–20 on transcript; default **10** if model fails; not a validated actuarial tool
- **Supervisor AI text:** emergency → Emergency screen-in; else risk **≥ 13** → Priority; else Non-Emergency; triage list appended

## Related files

- SVG (full platform): [screening-process.svg](./screening-process.svg)
- API: `demo/api/src/usecases/form51a/`, `demo/api/src/routes/screening.ts`, `demo/api/src/routes/intake.ts`
- Worker: `demo/worker/worker/pipeline/stages.py`
