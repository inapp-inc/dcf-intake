# Product Requirements Document
## DCF Automated Intake Tool (AIT)
### Commonwealth of Massachusetts — Department of Children and Families

| Field | Detail |
|---|---|
| **Document Version** | 2.0 — DRAFT |
| **Prepared By** | InApp · HHS Practice · Child Welfare IT & Program Consulting |
| **Prepared For** | Massachusetts Department of Children and Families |
| **Date** | May 2026 |
| **Classification** | CONFIDENTIAL |
| **Legal Authority** | M.G.L. Chapter 119, Sections 51A and 51B |

---

## Table of Contents

1. Executive Summary
2. Problem Statement
   - 2.1 Current State — AS-IS Workflow
   - 2.2 TO-BE Workflow — AI-Enhanced Process
   - 2.3 Response Timeframes
   - 2.4 Scale and Stakes
3. Project Objectives & Scope
4. Stakeholders
5. Functional Requirements
   - FR-1: 51A Hotline Call Transcription & NLP
   - FR-2: Automated Background & History Checks
   - FR-3: Predictive Risk Scoring
   - FR-4: Emergency / Non-Emergency Triage Flagging
   - FR-5: Screening Team Pre-Meeting Case Summaries
   - FR-6: 51B Pre-Visit Worker Briefing
   - FR-7: AI-Assisted 51B Report Documentation
6. Feature Inventory (41 Features)
7. Non-Functional Requirements
8. System Integration Requirements
9. AI Governance & Ethical Guardrails
10. Acceptance Criteria
11. AI Pipeline Orchestration
12. Security Architecture for AI-Augmented Intake
13. Architectural Recommendation
14. Constraints & Assumptions
15. Document Control

---

## 1. Executive Summary

The Massachusetts Department of Children and Families (DCF) operates a 24/7 protective intake system to receive, screen, and respond to reports of child abuse, neglect, sexual exploitation, and human trafficking — collectively known as 51A reports. In FY2024, DCF received tens of thousands of such reports. The existing process relies entirely on manual data entry, sequential background checks, and paper-based documentation, creating structural conditions for error, inconsistency, and compliance risk.

This Product Requirements Document (PRD) defines the complete requirements for the **DCF Automated Intake Tool (AIT)** — an AI-assisted digital platform designed to modernize every stage of the intake and response lifecycle while preserving human judgment as the ultimate decision authority.

The AIT draws on two proven foundations:

- The **DCF Business Requirements Document (BRD)** authored by InApp HHS Practice, which defines seven functional requirement modules, 41 discrete features, system integration requirements, and non-functional constraints for the Massachusetts context.
- The **Miracle Foundation Thrivewell AI Caseworker Assessment System**, a production-deployed proof of concept that validated a cloud-native, event-driven AI pipeline for transcribing, translating, and assessing social welfare case notes — including a live Claude 3 Haiku assessment engine, evidence guardrail patterns, and a modular AWS architecture that has been accepted and handed over by the client.

Together, these inputs define a system that is operationally grounded, architecturally sound, and ethically governed.

---

## 2. Problem Statement

### 2.1 Current State — The AS-IS Workflow

DCF operates under M.G.L. Chapter 119, §51A and §51B, establishing mandatory reporting and investigation obligations. Intake comprises two phases:

- **Phase 1 — Screening:** Gathering sufficient information to determine whether a DCF response is necessary. Screeners must complete this within one business day; emergency cases require a two-hour response.
- **Phase 2 — 51B Response (Investigation):** A formal investigation determining whether reasonable cause exists to believe a child has been abused or neglected.

The current workflow creates seven structural bottlenecks:

| Stage | Current Failure Mode |
|---|---|
| **Hotline Call Intake** | Screeners must type notes while actively listening to emotionally charged calls, leading to omissions and inconsistent data quality. |
| **Background Checks** | Screeners manually query the Central Registry, CORI/SORI, law enforcement, and prior case history — sequentially — under extreme time pressure. |
| **Risk Scoring** | Decisions rely solely on individual screener judgment, with no actuarial support or consistency check across cases. |
| **Triage** | Triage relies entirely on the screener's real-time judgment during the call, with no AI safety net for high-stakes routing errors. |
| **Screening Team Review** | Team members review multiple cases from memory or paper notes, synthesizing complex history on the spot without structured summaries. |
| **51B Preparation** | Workers prepare for field visits using only screening notes, lacking immediate access to collateral sources, prior cases, or related family context. |
| **Documentation** | Writing the formal 51B response report is one of the most time-consuming parts of a worker's job — time taken away from families. |

### 2.2 TO-BE Workflow — AI-Enhanced Process

The AIT transforms all seven workflow stages by introducing AI as a decision-support layer running in parallel with — not replacing — the human screener or worker.

| Stage | AI Enhancement | Human Role Shifts To... | Time Impact | Key Outcome |
|---|---|---|---|---|
| **1. Hotline Call Intake** | Real-time transcription + NLP auto-populates all 51A fields in the background | Screener focuses entirely on the caller — asking better questions, building trust | None (runs behind the call) | Consistent, complete, objective case records |
| **2. Background Checks** | Step Functions orchestrates simultaneous queries across Central Registry, CORI, SORI, FBI/NCIC, and LE 911 CAD the moment the report is accepted | Screener reviews unified Background Summary; queries run automatically | Hours → minutes | Complete background picture available before screening decision |
| **3. Risk Scoring** | Actuarial model (trained on MA SACWIS/CCWIS + EOHHS + MassHealth + DYS) generates 1–20 risk score with contributing factors | Screener retains full override authority; score is decision support, never determinative | Instant | Consistent, explainable, auditable risk signal across all cases |
| **4. Emergency Triage** | Real-time engine detects 5 emergency indicators in ≤5 seconds; multi-indicator escalation alert triggers when 2+ indicators detected | Screener can accept or dismiss any flag with a documented reason | Real-time, no delay | No-miss safety net beneath screener judgment for highest-stakes routing decisions |
| **5. Screening Team Review** | AI-generated one-page case summary distributed ≥1 hour before the daily meeting | Team shifts from information-gathering to structured deliberation | Preparation time eliminated | Higher-quality decisions; more consistent determinations across cases |
| **6. 51B Preparation** | Auto-generated pre-visit briefing: family history, prior 51A/51B history, risk factors, collateral contacts, community resources, law enforcement accompaniment flag | Worker arrives fully briefed; can focus on safety and engagement planning | 30 minutes after assignment | Complete family picture before every field visit; safer, better-informed workers |
| **7. 51B Documentation** | Generative AI produces structured first-draft report from field notes, voice memos, and system inputs; pre-submission compliance validation flags missing fields | Worker reviews, edits, and approves — does not write from scratch | 2–3 hours saved per report | More time with families; complete, consistent, policy-compliant documentation |

### 2.3 Response Timeframes

Massachusetts M.G.L. Chapter 119 §51A/§51B establishes mandatory response deadlines. The AIT is designed to support compliance with all timeframes.

| Response Type | Initiation Deadline | Completion Deadline | AIT Support |
|---|---|---|---|
| **Emergency Screening** | Immediate | Within 2 hours of report | Real-time transcription and triage flagging enable faster screening initiation |
| **Non-Emergency Screening** | Within 2 business days | Within 15 business days | Automated background checks and pre-meeting summaries reduce screening time |
| **Emergency 51B Response** | Within 2 hours | Within 5 business days | Pre-visit briefing generated within 30 minutes of assignment |
| **Non-Emergency 51B Response** | Within 2 business days | Within 15 business days | AI-assisted documentation reduces time-to-completion |
| **Written 51A Report** | With oral report | Within 48 hours of oral report | NLP auto-population and compliance validation support timely written submission |
| **Family Assessment** | Post 51B | Within 60 business days | Service history surfaced in worker briefing supports faster assessment |

### 2.4 Scale and Stakes

- DCF receives **75,000+ 51A reports per year** — over 200 per day on average.
- Screeners operate under a **1-business-day deadline** for non-emergency screening decisions and a **2-hour window** for emergency responses.
- Critical information is routinely missed due to structural limitations — not negligence.
- Every missed data point is a potential child safety risk.

---

## 3. Project Objectives & Scope

### 3.1 Objectives

- Reduce administrative burden on screeners so they can focus on the caller and the child's safety.
- Replace sequential manual background check workflows with simultaneous automated parallel queries.
- Provide AI-powered decision support (risk scoring, triage flagging) while preserving complete human authority over all determinations.
- Ensure complete, consistent documentation for every intake record, reducing compliance exposure.
- Establish an equity-aware, explainable AI framework compliant with DCF data governance policies.
- Deliver a system informed by production-proven AI patterns from the Miracle Foundation Thrivewell POC.

### 3.2 Scope

| **In Scope** | **Out of Scope** |
|---|---|
| 51A Hotline call transcription and NLP field auto-population | Post-investigation case management (Foster Care, Reunification) |
| Automated background checks (Central Registry, CORI, SORI, 911 history, FBI/NCIC) | Court filing or legal documentation generation |
| Predictive risk scoring for screen-in/screen-out support | Replacement of the existing SACWIS/CCWIS platform |
| Emergency/non-emergency triage flagging | Automated removal decisions or court petitions |
| Screening Team pre-meeting case summaries | Third-party commercial cloud AI processing outside DCF secure environment |
| 51B pre-visit worker briefing documents | Video processing |
| AI-assisted 51B report drafting | Full CI/CD pipeline hardening (Phase 1) |
| CCWIS/SACWIS integration layer | Production integration with external mobile apps |

---

## 4. Stakeholders

| Stakeholder | Role | Key Interest / Concern |
|---|---|---|
| **DCF Area Office Screeners** | Primary users; conduct 51A intake calls | Ease of use; reduced documentation burden; reliable triage support |
| **DCF Supervisors & Area Managers** | Approve screening decisions; review Screening Team cases | Consistent decision quality; compliance monitoring; audit trail |
| **51B Investigators / Social Workers** | Conduct field investigations after screen-in | Accurate pre-visit briefings; up-to-date collateral summaries |
| **DCF IT & Data Governance** | Own SACWIS/CCWIS infrastructure and data security policy | Secure integration; data privacy compliance; system uptime |
| **EOHHS Office of Analytics** | Cross-agency data sharing for risk model enrichment | Data use agreements; equity metrics; model governance |
| **Families Served by DCF** | Subject of intake and investigation decisions | Fairness; explainability; protection from automated bias |
| **Massachusetts Legislature / OIG** | Oversight of DCF compliance and outcomes | Audit capability; bias monitoring; legal compliance |
| **InApp HHS Practice** | System implementer and AI model developer | Requirements clarity; agency buy-in; technical feasibility |

---

## 5. Functional Requirements

### FR-1: 51A Hotline Call Transcription and NLP Field Auto-Population

The AIT shall provide real-time voice-to-text transcription of all inbound 51A hotline calls, integrated directly into the DCF case management system.

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-1.1 | System shall transcribe 51A hotline calls in real time with accuracy ≥ 95%. | Validated against ground truth on a 100-call test set; ≥95% accuracy required. |
| FR-1.2 | NLP engine shall auto-populate all required 51A structured fields from the call transcript, including child name/age/address, reporter type, nature of allegation, and alleged responsible party. | 100% of mandatory 51A fields populated or flagged for manual entry before call ends. |
| FR-1.3 | System shall alert the screener in real time if a mandatory field remains empty before the call is terminated. | Alert fires reliably for all mandatory fields; tested against 50 simulated incomplete-call scenarios. |
| FR-1.4 | System shall detect and flag high-risk keywords in real time (weapons, prior removals, domestic violence, very young children, perpetrator in home). | Flagging triggers within 5 seconds of keyword occurrence; ≥90% precision and recall on labeled test set. |
| FR-1.5 | System shall auto-generate a structured call summary upon call completion for immediate supervisor review. | Summary generated within 30 seconds of call end; contains all required data elements. |
| FR-1.6 | System shall differentiate between screener and caller voices in the transcript, correctly attributing each spoken segment. | Speaker diarization validated on a 50-call test set; attribution accuracy ≥90%. |

### FR-2: Automated Background and History Checks

The AIT shall trigger simultaneous automated queries across all required background check systems upon acceptance of a new 51A report.

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-2.1 | System shall automatically query DCF's Central Registry for prior 51A/51B history on the child and all identified caregivers. | Query initiated within 60 seconds; results returned within the screener's session. |
| FR-2.2 | System shall automatically initiate parallel CORI and SORI checks for all identified adults in the household. | Parallel queries initiated simultaneously; results compiled into a unified summary. |
| FR-2.3 | System shall query the national criminal background database (FBI/NCIC) for all adults identified in the report. | National query completed and results available to screener prior to screening decision. |
| FR-2.4 | System shall retrieve prior 911 service history at the reported address from the relevant law enforcement agency. | Prior 911 data retrieved and displayed; integration validated by area office. |
| FR-2.5 | System shall compile all background check results into a single, structured Background Summary document available to the screener. | Summary generated and available within 5 minutes of report acceptance; all data sources reflected. |
| FR-2.6 | System shall initiate automated inquiry with other state CPS agencies when the report involves individuals with known out-of-state history. | Out-of-state inquiry initiated; results surfaced prior to screening decision. |
| FR-2.7 | System shall allow an assigned 51B worker to trigger a supplemental background check on any newly identified adult during a field visit, without re-initiating the full intake workflow. | Supplemental check available from the worker's case view; results returned within 5 minutes. |

### FR-3: Predictive Risk Scoring

The AIT shall include an actuarial-based risk scoring model to support — but not replace — screener judgment in screen-in/screen-out decisions.

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-3.1 | System shall generate a risk score (1–20) for each screened-in report using a model trained on Massachusetts SACWIS/CCWIS, EOHHS, MassHealth, and DYS data. | Risk score produced for 100% of reports; model validated against historical outcomes on a hold-out dataset. |
| FR-3.2 | Risk score shall be displayed as a decision support input only. Screeners shall retain full authority to override the model on any report. | Override capability confirmed present and functional in all UAT scenarios. |
| FR-3.3 | System shall display the top contributing factors to the risk score alongside the score itself. | Contributing factors displayed for every score; reviewed by child welfare SMEs for accuracy. |
| FR-3.4 | Risk model shall generate quarterly bias audit reports measuring score distribution by race, ethnicity, income, and geography. | Quarterly reports produced automatically; reviewed by equity stakeholder panel. |
| FR-3.5 | System shall retain a full audit trail of risk scores and screener override decisions for each report. | Score and override history accessible in case record; retained for minimum 7 years. |
| FR-3.6 | System shall support periodic model retraining on updated Massachusetts data with version tracking. | Each model version is logged; system records which version produced each score. |

### FR-4: Emergency / Non-Emergency Triage Flagging

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-4.1 | System shall analyze the call transcript and flag potential emergency indicators in real time before the screener ends the call. | Triage flags appear within 5 seconds of qualifying indicator detection. |
| FR-4.2 | System shall detect: very young child (under 5), weapon present, prior removal history, perpetrator currently in the home, reporter expressing imminent fear. | All defined indicators detected with ≥90% recall on labeled test set. |
| FR-4.3 | System shall display a visible on-screen escalation alert when two or more emergency indicators are detected. | Alert visible and distinct from standard notifications; confirmed in usability testing with screeners. |
| FR-4.4 | System shall enforce DCF policy that emergency-flagged reports bypass the Screening Team queue and route immediately to the emergency response workflow. | Emergency bypass confirmed in integration testing; no emergency reports routed through standard queue. |
| FR-4.5 | Screeners shall be able to accept or dismiss any AI-generated triage flag; dismissals shall require a brief documented reason. | Override requires entry of dismissal reason; flag and final decision logged in case record. |

### FR-5: Screening Team Pre-Meeting Case Summaries

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-5.1 | System shall auto-generate a structured one-page case summary for each case pending Screening Team review, available at least 1 hour before the daily meeting. | Summaries generated and distributed ≥1 hour before scheduled meeting time. |
| FR-5.2 | Each summary shall include: timeline of prior contacts, current risk score, key protective and risk factors, collateral contact status, and recommended response type. | Summary content verified against a defined template; reviewed and approved by DCF program leads prior to go-live. |
| FR-5.3 | System shall automatically flag cases that meet the Clinical Review threshold (3+ incidents in 12 months involving the same child or family). | Clinical Review flags tested against historical cases; 100% detection of qualifying cases required. |
| FR-5.4 | System shall provide a structured form for recording the Screening Team's decision, rationale, and assigned response type, stored in the case record. | Decision form linked to pre-meeting summary; confirmed in integration testing. |

### FR-6: 51B Pre-Visit Worker Briefing

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-6.1 | System shall generate a pre-visit briefing document for each assigned 51B worker within 30 minutes of case assignment, containing: full family history, prior 51A/51B records, prior worker notes, known risk factors, and relevant collateral contacts. | Briefing document available to assigned worker within 30 minutes; all required data elements present. |
| FR-6.2 | System shall identify other children in related households and flag for worker review. | Related children identified via shared address/caregiver linkage logic; confirmed accurate in UAT. |
| FR-6.3 | System shall surface nearby community resources relevant to identified family needs. | Resource list generated for each case; tied to current EOHHS resource directory. |
| FR-6.4 | System shall auto-generate a suggested collateral contact list and flag cases where law enforcement accompaniment should be considered. | Collateral contact list generated; LE accompaniment flag triggers on qualifying allegation types and prior history indicators. |

### FR-7: AI-Assisted 51B Report Documentation

| Req ID | Requirement | Acceptance Criteria |
|---|---|---|
| FR-7.1 | System shall produce a structured first draft of the 51B response report from the worker's field notes, voice memos, and structured system inputs. Worker review and approval are required before finalization. | Draft generated upon submission of field notes; worker must explicitly approve before finalization. |
| FR-7.2 | System shall flag missing required fields and check for policy compliance before supervisor sign-off. | Compliance check catches 100% of missing mandatory fields on a test set of 50 report scenarios. |
| FR-7.3 | System shall maintain a full version history of all report drafts, worker edits, and supervisor approvals. | Version history accessible in case record; confirmed in integration testing. |
| FR-7.4 | System shall provide a structured form for recording the formal 51B determination (Supported, Substantiated Concern, or Unsupported) and automatically initiate the case opening workflow for supported findings. | Determination form confirmed present; case opening triggered automatically for Supported and Substantiated Concern findings. |

---

## 6. Feature Inventory

The following 41 features are organized by the module they belong to. Priority: **H = High (must-have for go-live)**, **M = Medium (high-value enhancement)**.

### Module 1: 51A Hotline Call Transcription & NLP

| # | Feature | Priority |
|---|---|---|
| 1 | Real-Time Voice Transcription (≥95% accuracy, encrypted storage) | H |
| 2 | Multi-Speaker Diarization (screener vs. caller attribution) | M |
| 3 | NLP Field Auto-Population (all required 51A fields) | H |
| 4 | Missing Mandatory Field Alert (real-time, pre-call-termination) | H |
| 5 | High-Risk Keyword Detection (≤5 second latency, ≥90% recall) | H |
| 6 | Supervisor Call Summary Generation (within 30 seconds of call end) | M |

### Module 2: Automated Background & History Checks

| # | Feature | Priority |
|---|---|---|
| 7 | Simultaneous Multi-System Background Queries (Central Registry, CORI, SORI, FBI/NCIC, LE 911 CAD) | H |
| 8 | Out-of-State CPS History Inquiry | M |
| 9 | Unified Background Summary Document (within 5 minutes) | H |
| 10 | Mid-Investigation Background Refresh (supplemental check on newly identified adults) | M |

### Module 3: Predictive Risk Scoring

| # | Feature | Priority |
|---|---|---|
| 11 | Risk Score Generation (1–20 scale, trained on MA SACWIS/CCWIS + EOHHS + MassHealth + DYS) | H |
| 12 | Score Explainability — Contributing Factors Display | H |
| 13 | Human Override & Score Audit Trail (7-year retention) | H |
| 14 | Quarterly Bias Audit Reports (by race, ethnicity, income, geography) | M |
| 15 | Model Retraining & Version Control | M |

### Module 4: Emergency / Non-Emergency Triage Flagging

| # | Feature | Priority |
|---|---|---|
| 16 | Real-Time Emergency Indicator Detection (5 indicators, ≤5 second latency, ≥90% recall) | H |
| 17 | Multi-Indicator Escalation Alert (2+ indicators triggers visual alert) | H |
| 18 | Triage Override & Decision Logging (dismissal reason required) | H |

### Module 5: Screening Team Support

| # | Feature | Priority |
|---|---|---|
| 19 | Pre-Meeting Case Summary Generation (distributed ≥1 hour before meeting) | M |
| 20 | Clinical Review Auto-Flag (3+ incidents in 12 months, 100% detection required) | H |
| 21 | Emergency Case Bypass Logic (emergency reports skip Screening Team queue) | H |
| 22 | Screening Decision Documentation (structured form, stored in case record) | M |

### Module 6: 51B Pre-Visit Worker Briefing

| # | Feature | Priority |
|---|---|---|
| 23 | Auto-Generated Pre-Visit Briefing Document (within 30 minutes of assignment) | H |
| 24 | Related Household & Child Identification (shared address/caregiver linkage) | H |
| 25 | Collateral Contact List & LE Accompaniment Flag | M |
| 26 | Geolocation Community Resource Mapping (via EOHHS Resource Directory) | M |

### Module 7: AI-Assisted 51B Report Documentation

| # | Feature | Priority |
|---|---|---|
| 27 | AI Draft Report Generation (from field notes, voice memos, and structured inputs) | H |
| 28 | Pre-Submission Compliance Validation (missing fields, policy compliance) | H |
| 29 | Report Version History & Audit Trail | M |
| 30 | Determination Recording & Case Opening Trigger | H |

### Module 8: System Integration

| # | Feature | Priority |
|---|---|---|
| 31 | CCWIS / SACWIS Bidirectional Integration (via secure API) | H |
| 32 | Criminal & Registry Systems Integration (CORI, SORI, FBI/NCIC) | H |
| 33 | Cross-Agency Data Sharing (EOHHS, MassHealth, DYS — DUA required) | H |

### Module 9: Security, Privacy & Compliance

| # | Feature | Priority |
|---|---|---|
| 34 | On-Premise AI Processing (no external cloud LLM; ATO from EOHHS CISO) | H |
| 35 | End-to-End Encryption (recordings, transcripts, case data, AI outputs — at rest and in transit) | H |
| 36 | Role-Based Access Control (RBAC by user type; all access logged) | H |
| 37 | System-Wide Audit Log (7-year retention; tamper-evident; accessible to DCF, EOHHS, OIG) | H |
| 38 | 24/7 Availability & Session Resilience (99.9% uptime SLA; auto-save on session drop) | H |

### Module 10: AI Governance & Ethics

| # | Feature | Priority |
|---|---|---|
| 39 | Human-in-the-Loop Design (no AI score may automatically trigger removal or legal action — hard-coded constraint) | H |
| 40 | Equity Oversight & Community Stakeholder Panel (pre-launch equity audit; published results) | H |
| 41 | Usability, Training & Pilot Rollout (≤8 hours training; ≥90% task completion in UAT with 20+ screeners; 30-day parallel run in 2+ area offices) | M |

---

## 7. Non-Functional Requirements

| Category | Requirement | Target Metric |
|---|---|---|
| **Performance** | System must support 24/7 continuous intake operations without planned downtime during business hours. | 99.9% uptime SLA; max 8 hours planned maintenance per year during off-peak hours. |
| **Transcription Latency** | Real-time transcription must not materially impede call flow. | Transcription lag ≤2 seconds behind spoken audio. |
| **Background Check Throughput** | Parallel background check queries must complete before the screener's session ends. | Unified Background Summary available within 5 minutes of report acceptance. |
| **Security** | All AI processing must occur within DCF's secure environment. No child welfare data may be transmitted to external commercial cloud AI platforms. | Penetration test passed prior to go-live; ATO issued by EOHHS CISO. |
| **Privacy** | System must comply with HIPAA, FERPA, M.G.L. Chapter 119, and DCF data governance policy. Call recordings and transcripts must be encrypted at rest and in transit. | Privacy Impact Assessment completed; legal counsel sign-off required before go-live. |
| **Usability** | Interface must be operable by screeners with no more than 8 hours of training. Existing CCWIS workflow disruption must be minimized. | UAT with 20+ screeners; task completion rate of ≥90% on core workflows. |
| **Equity** | AI models must be developed with external researchers, validated against equity metrics, and subject to ongoing bias audits with community stakeholder input. | Pre-launch equity audit completed; results published to DCF leadership and community stakeholder panel. |
| **Auditability** | All AI-generated outputs, human overrides, and system decisions must be logged with full audit trail. | Audit logs retained 7+ years; accessible to authorized DCF, EOHHS, and OIG personnel. |
| **Reliability** | Session resilience ensures no data loss on dropped calls or browser crashes. | Auto-save confirmed in integration testing; zero data loss on simulated session failure. |

---

## 8. System Integration Requirements

| System | Integration Type | Data Elements Exchanged |
|---|---|---|
| **DCF CCWIS / SACWIS** | Bidirectional API | Case history, prior 51A/51B records, worker notes, service plan history, family demographics |
| **MA DCF Central Registry** | Read-only query | Prior abuse/neglect history for child and caregivers |
| **CORI System (DCJIS)** | Automated query | Criminal offender record information for adults in household |
| **SORI System (SORB)** | Automated query | Sex offender registry information for adults in household |
| **National Criminal History (FBI/NCIC)** | Automated query | National-level criminal background for household adults |
| **Local Law Enforcement (911 CAD)** | Read-only query | Prior 911 calls and service history at reported address |
| **EOHHS / MassHealth** | Secure data sharing (DUA required) | Medical and benefits history for risk model enrichment |
| **DYS (Department of Youth Services)** | Secure data sharing (DUA required) | Youth justice history for risk model enrichment |
| **EOHHS Resource Directory** | Read-only API | Community resource locations for geolocation matching |

---

## 9. AI Governance & Ethical Guardrails

AI in child welfare carries unique risks. The AIT shall be governed by the following non-negotiable principles, embedded in system design, training, and ongoing operations:

| Risk Area | Mitigation Principle |
|---|---|
| **Racial & Socioeconomic Bias** | Any model trained on historical DCF data risks encoding existing racial and socioeconomic disparities. Models must be developed with external researchers, validated against equity metrics, and subject to ongoing bias audits with community stakeholder participation. Informed by the Miracle Foundation Thrivewell POC, which evaluated evidence guardrails to prevent model outputs from hallucinating or overstating findings. |
| **Automation Bias** | Workers may defer to AI recommendations even when their own judgment should override. Human override authority must be preserved and actively reinforced through training. High scores must never auto-trigger removal without documented human review. This is a hard-coded system constraint, not a configurable option. |
| **Data Privacy** | Child welfare data is among the most sensitive in government. All AI processing must comply with HIPAA, FERPA, and DCF data governance policy. Processing must occur within DCF's secure environment — never via third-party commercial cloud platforms. |
| **Model Transparency** | Families affected by AI-assisted decisions have a right to understand how decisions were made. DCF shall adopt explainable AI approaches — specifically, the contributing-factor display pattern (FR-3.3) — and ensure predictive scores are never the sole or determinative factor in any decision. |
| **Human-in-the-Loop** | AI tools are decision support, not decision replacement. Every screening, triage, and determination must be made and documented by a qualified human professional. AI outputs are inputs to human judgment — never substitutes for it. |
| **Evidence Integrity** | Drawing on the Miracle Foundation Thrivewell assessment engine pattern, all AI-generated summaries and risk outputs must include evidence snippets traceable to source data. AI must not speculate beyond available evidence. Where data is insufficient, the system must output "Insufficient data" rather than guess. |

### Quarterly Governance Checklist

- Review bias audit reports by race, ethnicity, income, and geography.
- Review community stakeholder panel feedback on model behavior.
- Validate model version in production against current performance benchmarks.
- Confirm all 7-year audit log retention requirements are being met.
- Review screener override patterns to detect potential automation bias drift.

---

## 10. Acceptance Criteria

- All functional requirements (FR-1 through FR-7) pass user acceptance testing with a task completion rate of ≥90%.
- Transcription accuracy of ≥95% validated on a 100-call test set prior to go-live.
- Risk model equity audit completed and reviewed by community stakeholder panel prior to go-live.
- Authority to Operate (ATO) issued by EOHHS CISO following penetration testing.
- Privacy Impact Assessment completed and signed by DCF legal counsel.
- All integrations validated end-to-end in staging environment before production deployment.
- Screener training program completed; ≥90% of trained users pass post-training assessment.
- Parallel run period of 30 days in at least two DCF Area Offices prior to statewide rollout.
- Emergency bypass logic validated: 100% of emergency-flagged reports routed directly to emergency workflow, not Screening Team queue.
- Audit log retention validated: all AI outputs, human overrides, and system events logged and accessible.

---

## 11. AI Pipeline Orchestration

The AIT's AI capabilities are implemented as an event-driven, modular pipeline — a pattern proven in production by the Miracle Foundation Thrivewell POC and adapted here for the DCF context. This section describes how the individual AI layers are wired together, coordinated, and made resilient.

### 11.1 Orchestration Model: Event-Driven, S3-Triggered Lambda Chain

The orchestration pattern is drawn directly from the Miracle Foundation source code (`transcribe_lambda.py`, `assessment_lambda.py`) and extended for DCF's scale and regulatory requirements. The core pattern:

1. **An S3 object event triggers a Lambda function** — no polling, no scheduled jobs, no orchestration overhead.
2. **Each Lambda is responsible for exactly one stage** — transcription initiation, transcript extraction, NLP extraction, risk scoring, document generation — enabling independent deployment, testing, and failure isolation.
3. **Each Lambda writes its output to a designated S3 prefix**, which triggers the next Lambda in the chain.
4. **AWS Step Functions** breaks the pattern only for the background check stage, where a parallel Map state is required to run multiple external queries simultaneously.

### 11.2 End-to-End Pipeline Flow

The following table documents the full pipeline, including the S3 prefix routing conventions drawn from the Miracle Foundation source code:

| Stage | Trigger | Lambda / Service | Input Prefix | Output Prefix | Key Logic |
|---|---|---|---|---|---|
| **1. Call Capture** | VoIP call connects | Kinesis Video Streams → S3 | — | `Audio_Input_files/` | Audio stream saved as MP3/WAV to S3; triggers pipeline |
| **2. Transcription** | S3 `Audio_Input_files/` event | `transcribe_lambda.py` pattern: `start_transcribe_job()` | `Audio_Input_files/` | `Transcribe_Output/` | Calls AWS Transcribe (GovCloud) with speaker diarization and custom vocabulary; waits for COMPLETED status |
| **3. Transcript Extraction & Cleaning** | S3 `Transcribe_Output/` event | `extract_transcript.py` pattern: `process_transcribe_output()` | `Transcribe_Output/` | `Txt_Input/` | Reads Transcribe JSON; cleans transcript (deduplication, whitespace normalization); saves clean text |
| **4. NLP Field Extraction** | S3 `Txt_Input/` event | NLP Lambda (SageMaker endpoint) | `Txt_Input/` | `NLP_Output/` | Fine-tuned model extracts 51A structured fields; fires WebSocket alert for any missing mandatory field |
| **5. Risk Score & Triage** | S3 `NLP_Output/` event | Risk Lambda (SageMaker endpoint) | `NLP_Output/` | `Risk_Output/` | Actuarial model scores report 1–20; triage engine evaluates 5 emergency indicators; outputs score + factors + triage flags |
| **6. Background Checks** | S3 `NLP_Output/` event (parallel to Risk) | Step Functions Map state → 5 Lambda functions | `NLP_Output/` | `Background_Output/` | Parallel queries: Central Registry, CORI, SORI, FBI/NCIC, LE 911 CAD; compiles unified Background Summary |
| **7. Document Generation** | S3 `Risk_Output/` + `Background_Output/` merge event | Document Generation Lambda (Bedrock Claude 3 Haiku) | `Risk_Output/` + `Background_Output/` | `Documents/` | Section-based prompting pattern from `assessment_lambda.py`; produces pre-meeting summaries, pre-visit briefings, 51B drafts; evidence guardrails enforced |
| **8. Schema Validation** | S3 `Documents/` event | Validation Lambda | `Documents/` | `Validated_Documents/` | Validates AI output against DCF report schema; rejects non-conforming outputs; triggers JSON repair loop if needed |
| **9. CCWIS Write-Back** | S3 `Validated_Documents/` event | CCWIS Integration Lambda | `Validated_Documents/` | CCWIS REST API | Writes validated outputs to DCF CCWIS/SACWIS via bidirectional API; SQS DLQ handles failures |

### 11.3 Anti-Recursion Guard

Directly adapted from `assessment_lambda.py` (Miracle Foundation), which contains:

```python
# Prevent recursion: skip files already written by this Lambda
if key.startswith("assessments/"):
    print("Skipping assessment output file")
    return {"statusCode": 200}
```

In the AIT, every Lambda that writes to S3 checks the incoming event key against its own output prefix before processing. This prevents accidental recursive triggering when a Lambda writes output to the same bucket it reads from — a critical safeguard in event-driven architectures.

### 11.4 Parallel Processing Patterns

Two parallelism patterns are used:

**Pattern A — Step Functions Map State (Background Checks):**
Five external background check queries are dispatched simultaneously. Each is an independent Lambda with its own retry policy. Step Functions waits for all five to complete before writing the unified Background Summary. This directly corrects the sequential bottleneck in the AS-IS workflow.

**Pattern B — Parallel Section Assessment (Document Generation):**
Adapted from `assessment_lambda.py`'s loop over `EXPECTED_SECTION_IDS`: each assessment section is invoked independently against the Bedrock Converse API, then merged with `merge_section_outputs()`. In the AIT, parallel Lambda fan-out replaces the sequential loop, reducing document generation latency on long transcripts.

### 11.5 Transcript Cleaning Pipeline

Directly adapted from `extract_transcript.py` (Miracle Foundation):

```python
def clean_transcript(text):
    text = re.sub(r"\s+", " ", text)             # Normalize whitespace
    text = re.sub(r"\b(\w+)( \1\b)+", r"\1", text)  # Remove duplicate words
    return text.strip()
```

In the DCF AIT, this cleaning step is extended to:
- Remove duplicate words from Transcribe output (ASR artifacts)
- Normalize speaker-attributed segments from diarization
- Strip Transcribe confidence metadata before passing to downstream NLP
- Flag and preserve intentionally repeated phrases (e.g., repeated names, addresses)

### 11.6 Error Handling and Resilience

| Component | Failure Mode | Mitigation |
|---|---|---|
| **AWS Transcribe** | Transcription job failure or timeout | Lambda polls for COMPLETED status; failed jobs written to `Transcribe_Failed/`; alert to screener |
| **SageMaker Endpoints** | Model invocation error | Lambda retry with exponential backoff; fallback to "model unavailable" flag in UI; never blocks intake |
| **Bedrock API** | Throttling or JSON output error | JSON repair loop (`_parse_json_lenient` pattern); structured retry; SQS DLQ after 3 retries |
| **Background Check APIs** | Partial query failure | Step Functions continues; failed sources flagged in Background Summary; screener notified of incomplete data |
| **CCWIS Write-Back** | API failure or timeout | SQS Dead Letter Queue captures failed messages; Operations team alerted; manual write-back path preserved |
| **Session Drop** | Browser crash or network loss | DynamoDB session state enables auto-recovery; all data auto-saved at each pipeline stage |

---

## 12. Security Architecture for AI-Augmented Intake

The DCF AIT processes among the most sensitive personal data in state government: child welfare reports, abuse allegations, criminal history, and mental health records. Augmenting this workflow with AI introduces additional attack surfaces that must be explicitly addressed in the security architecture.

### 12.1 Data Classification

| Data Type | Classification | Handling Requirement |
|---|---|---|
| **51A Call Audio** | CONFIDENTIAL — PII/PHI | Encrypted at rest (AES-256, S3 SSE-KMS); in transit (TLS 1.3); never transmitted outside EOHHS boundary |
| **Call Transcripts** | CONFIDENTIAL — PII/PHI | Same as audio; access restricted to screener role and above; audit logged on every access |
| **NLP-Extracted 51A Fields** | CONFIDENTIAL — PII/PHI | Stored in CCWIS; access via RBAC; full audit trail |
| **Background Check Results** | RESTRICTED — CJIS/PII | Governed by CJIS Security Policy for CORI/SORI/FBI; no caching beyond session; access logged |
| **AI Risk Scores** | SENSITIVE — Decision Support | Stored with audit trail; accompanied by contributing factors; visible only to screener and supervisor roles |
| **AI-Generated Documents** | CONFIDENTIAL | Worker review required before finalization; version history maintained; 7-year retention |
| **Model Training Data** | RESTRICTED | Historical SACWIS/CCWIS data; DUA required; access limited to approved model developers |

### 12.2 AI-Specific Security Threats and Mitigations

AI systems introduce threat vectors that traditional security controls do not fully address:

| Threat | Description | Mitigation |
|---|---|---|
| **Prompt Injection** | Malicious content embedded in a 51A transcript that attempts to hijack the LLM's behavior — for example, instructions that cause the model to suppress risk indicators or generate false output | Strict system prompt architecture with declarative rules (proven in Thrivewell POC); input length limits; output schema validation rejects non-conforming responses; evidence guardrails require traceable citations |
| **Data Poisoning** | Manipulation of training data to bias model outputs — e.g., adversarially crafted cases designed to lower risk scores for certain families | Training data governance with lineage tracking; model validation against equity benchmarks before deployment; external researcher review of training pipeline |
| **Model Inversion / Extraction** | Adversary probes the model through repeated API calls to extract information about training data or model parameters | API rate limiting on all Bedrock/SageMaker endpoints; output logging to detect systematic probing; no direct external access to model endpoints |
| **Automation Bias Exploitation** | Social engineering of workers to over-rely on AI scores, enabling manipulation of screening outcomes | Human-in-the-loop enforced at application layer; override requiring documented reason; training program emphasizes AI as decision support |
| **Output Hallucination** | AI generates plausible but fabricated content — a critical failure in child welfare where false information can harm families | Evidence guardrail pattern (from Thrivewell `assessment_ai.py`): every AI output must cite source evidence snippets; outputs with no supporting evidence return "Insufficient data" |
| **Model Drift** | Model accuracy degrades over time as population characteristics change, quietly increasing false negatives in risk scoring | Quarterly performance benchmarks against held-out labeled datasets; equity audit monitoring; automated drift alerts via CloudWatch |

### 12.3 Network Security Architecture

All AIT components operate within the AWS GovCloud VPC. No AI service endpoint is publicly accessible.

- **VPC Private Endpoints** for all AWS services: S3, Lambda, SageMaker, Bedrock, Step Functions, DynamoDB, CloudWatch, CloudTrail, SQS — no traffic traverses the public internet
- **Security Groups** restrict inter-component communication to required ports only; Lambda functions have no inbound rules
- **NACLs** provide subnet-level defense-in-depth
- **AWS PrivateLink** for all cross-service calls within the EOHHS account boundary
- **No external API calls** from any Lambda except to authorized background check systems via approved integration gateways; all outbound routes are whitelisted and logged

### 12.4 Identity and Access Management

Role-based access is enforced at two layers: AWS IAM (infrastructure) and application-layer RBAC (case-level).

| Role | AWS IAM Permissions | Application Permissions |
|---|---|---|
| **DCF Screener** | Read from validated documents bucket; invoke NLP/Risk Lambda via UI | View own active cases; intake workflow; cannot view other screeners' cases |
| **DCF Supervisor** | Read validated documents bucket; read audit logs for supervised cases | Override review; full audit trail for area office; model score override visibility |
| **51B Investigator / Worker** | Read assigned case documents | View assigned case briefings; submit field notes; review/approve 51B drafts |
| **Model Developer** | SageMaker full access; S3 training data bucket (DUA-governed) | No case data access; model artifacts only |
| **IT Admin / DevOps** | Infrastructure management; no case S3 bucket access | No case content access |
| **OIG / Auditor** | Read-only CloudTrail and audit event logs | Read-only audit log access; no live case access |

IAM policies follow least-privilege: each Lambda execution role has access only to the specific S3 prefixes it reads and writes, and only the specific model endpoints it invokes.

### 12.5 Encryption Standards

| Layer | Standard | Key Management |
|---|---|---|
| **Data at Rest (S3)** | AES-256 via SSE-KMS | AWS KMS customer-managed keys (CMK); key rotation every 365 days |
| **Data in Transit** | TLS 1.3 minimum; TLS 1.2 deprecated | AWS Certificate Manager |
| **Bedrock / SageMaker API Calls** | TLS 1.3 over PrivateLink | No internet exposure |
| **DynamoDB (Session State)** | AES-256 via DynamoDB encryption at rest | KMS CMK |
| **CloudTrail Logs** | AES-256 via S3 SSE-KMS | Separate CMK for audit logs |
| **Kinesis Audio Stream** | Server-side encryption | KMS CMK |

### 12.6 AI Output Validation and Guardrails

Directly adapted from Miracle Foundation patterns:

- **Schema Validation Lambda** (Layer 8 of architecture): Every AI-generated output is validated against the DCF report schema before reaching the caseworker UI. Non-conforming outputs are rejected and the system retries with a repair prompt.
- **Evidence Guardrail** (from `assessment_ai.py`): All AI outputs must include source evidence snippets traceable to the transcript or input data. Where evidence is absent, the output must return "Insufficient data" — never a fabricated conclusion.
- **JSON Repair Loop** (from `_parse_json_lenient`): Malformed LLM JSON output is automatically repaired via a secondary Bedrock call. If repair fails after 3 attempts, the document generation stage fails safely and the worker is notified.
- **Output Length Limits**: All Bedrock prompts include maximum token constraints to prevent runaway generation and reduce injection attack surface.
- **Confidence Thresholds**: NLP field extraction below a configurable confidence threshold flags the field for manual screener entry rather than auto-populating.

### 12.7 Audit and Forensic Logging

Every AI interaction is logged with sufficient detail to reconstruct the decision context:

| Event | Log Content | Retention |
|---|---|---|
| **Transcription Job** | Job ID, start time, duration, accuracy score, speaker segments, S3 URIs | 7 years (S3 Object Lock WORM) |
| **NLP Field Extraction** | Input transcript hash, extracted fields, confidence scores, missing field alerts | 7 years |
| **Risk Score Generation** | Model version, input feature vector, output score, contributing factors | 7 years |
| **Triage Flag** | Detected indicators, detection timestamps, screener action (accepted/dismissed), dismissal reason | 7 years |
| **Background Check Query** | System queried, query parameters, result summary, timestamp | 7 years (CJIS requirements) |
| **Document Generation** | Prompt template version, Bedrock model version, output token count, evidence citations | 7 years |
| **Human Override** | User ID, role, case ID, original AI output, override action, documented reason, timestamp | 7 years |
| **Case Record Access** | User ID, role, case ID, action (view/edit/approve), timestamp | 7 years |

All logs are written to S3 with Object Lock (WORM) — no mechanism exists to modify or delete logs, including with administrator access. CloudTrail provides the API-level audit layer.

### 12.8 Model Governance and Drift Detection

| Control | Frequency | Responsible Party | Output |
|---|---|---|---|
| **Performance Benchmark** | Quarterly | AI Development Team | Accuracy metrics vs. held-out labeled test set; comparison to prior quarter |
| **Equity Audit** | Quarterly | External Equity Researchers + Community Stakeholder Panel | Score distribution by race, ethnicity, income, geography; published to DCF leadership |
| **Model Version Review** | Every deployment | AI Development Team + DCF IT | New model version logged in SageMaker Model Registry; rollback plan documented |
| **Drift Alert** | Continuous | CloudWatch metric alarms | Alert if risk score distribution shifts by >10% vs. 30-day baseline; triggers review |
| **Prompt Template Audit** | Quarterly | AI Development Team | Review system prompts for injection vulnerabilities; evidence guardrail compliance |
| **Penetration Test (AI-specific)** | Annual | External Security Firm | Prompt injection attempts; model extraction probing; output manipulation testing |

---

## 13. Architectural Recommendation

### 13.1 Foundation: Lessons from the Miracle Foundation Thrivewell POC

The Miracle Foundation Thrivewell AI Caseworker Assessment System successfully validated an end-to-end AI pipeline for social welfare case assessment in a production AWS environment. Phase 1 delivered:

- S3-triggered, Lambda-orchestrated ingestion (zero orchestration overhead, cost-effective, highly reliable)
- Audio transcription via Amazon Transcribe with automatic language detection via AWS Comprehend
- LLM-based insight extraction via Amazon Bedrock (Claude 3 Haiku), with sentence-aware chunking and context carryover
- Section-based prompting with a fixed JSON schema, evidence guardrails, and a JSON repair loop for LLM output robustness
- A four-tier welfare rating (In Crisis → Vulnerable → Safe → Thriving) with per-section evidence snippets and strong-evidence keyword detection
- Streamlit-based caseworker UI with dual audio/text input

**Phase 1 known limitations** that must be addressed in the AIT:

| Issue | Severity | Recommended Mitigation |
|---|---|---|
| Sequential chunk processing causes latency on long transcripts | High | Parallel Lambda invocations per chunk; Fan-out / Map-Reduce pattern |
| Context loss between translation chunks | Medium | Sliding window context with speaker tagging |
| Reasoning model leakage in translation output | Medium | Use domain-specific or fine-tuned model for translation via SageMaker |
| No fine-tuning capability on Bedrock-hosted models | Medium | Migrate domain-specific models to Amazon SageMaker for fine-tuning |
| Sequential processing: no parallel section assessment | Medium | Parallel Bedrock invocations per assessment section |

### 13.2 Recommended Architecture for DCF AIT

Given DCF's hard requirement that **all AI processing must remain within the DCF/EOHHS secure infrastructure** and no child welfare data may be transmitted to external commercial cloud AI platforms, the recommended architecture is a **secure AWS GovCloud deployment within the EOHHS boundary**, leveraging the proven event-driven patterns from the Thrivewell POC.

---

#### Architecture Layer 1 — Telephony & Intake Layer

**Purpose:** Capture 51A hotline calls and route audio into the AI pipeline.

- SIP/VoIP integration with DCF's existing hotline infrastructure
- Real-time audio streaming to the Transcription Layer via a secure WebSocket or Kinesis Video Streams (GovCloud)
- Session state stored in DynamoDB for auto-recovery on dropped calls
- All audio encrypted in transit (TLS 1.3) and at rest (AES-256 on S3)

---

#### Architecture Layer 2 — Transcription Layer

**Purpose:** Convert raw audio to structured text with speaker attribution.

- **Amazon Transcribe** (GovCloud) for real-time call transcription
  - Speaker diarization enabled (screener vs. caller)
  - Real-time partial results streamed to the UI for live screener display
  - Custom vocabulary for DCF-specific terminology (child welfare, legal terms)
- **Sentence-aware chunking with context carryover** — proven Thrivewell pattern — for long-call handling
- **Parallel chunk processing** via Lambda fan-out to reduce latency on long transcripts (Phase 1 lesson applied)
- **AWS Comprehend** for language detection (proven reliable across all test languages in Thrivewell POC)
- Completed transcripts stored in S3 (Input Bucket) as structured JSON; triggers downstream pipeline via S3 event notification

---

#### Architecture Layer 3 — NLP Intelligence Layer

**Purpose:** Extract structured 51A fields and detect risk signals.

- **Fine-tuned NLP model on Amazon SageMaker** for 51A field extraction
  - Trained on annotated DCF call transcripts
  - Extracts: child name/age/DOB/address, reporter type and contact, allegation type, alleged responsible party, household members
  - SageMaker chosen over Bedrock to enable domain fine-tuning (Phase 1 lesson applied)
- **High-risk keyword detection engine** using the strong-evidence keyword pattern from Thrivewell `assessment_ai.py`
  - Extensible keyword taxonomy: weapons, prior removals, domestic violence, very young children, perpetrator in home
  - ≤5 second detection latency via streaming Transcribe partial results
- **Missing field alert engine**: monitors field completion status against the 51A schema; fires WebSocket alert to screener UI
- Lambda orchestration of all NLP steps, triggered by Transcribe completion event

---

#### Architecture Layer 4 — Risk Intelligence Layer

**Purpose:** Generate actuarial risk scores and triage flags.

- **Actuarial risk scoring model** (trained on MA SACWIS/CCWIS, EOHHS, MassHealth, DYS data)
  - Hosted on Amazon SageMaker (GovCloud) for data sovereignty
  - Outputs: risk score (1–20) + top contributing factors
  - Model versioned in SageMaker Model Registry; each score logs the model version that produced it
  - Contributing factors displayed using the Thrivewell evidence snippet pattern — short, traceable citations
- **Triage flagging engine**: evaluates five DCF emergency indicators against the NLP output and case history
  - Multi-indicator escalation alert: triggers when ≥2 emergency indicators detected
  - Override logged with mandatory dismissal reason
- **Clinical review threshold detector**: counts qualifying incidents in rolling 12-month window across CCWIS case history

---

#### Architecture Layer 5 — Background Check Orchestration Layer

**Purpose:** Simultaneously query all required background systems.

- **AWS Step Functions** orchestrates parallel background check execution (replacing the sequential manual process)
  - Map state runs Central Registry, CORI, SORI, FBI/NCIC, and LE 911 CAD queries in parallel
  - Proven Thrivewell event-driven Lambda pattern applied to multi-system orchestration
- Each integration implemented as an independent Lambda function for isolated testing and deployment
- Results compiled into a **Unified Background Summary** document (S3 Artifact Bucket) within 5 minutes
- Mid-investigation refresh: worker-triggered Lambda invocation on newly identified adults, results returned to case record

---

#### Architecture Layer 6 — Document Generation Layer

**Purpose:** Generate pre-meeting summaries, pre-visit briefings, and 51B draft reports.

- **Claude 3 Haiku via Amazon Bedrock** (GovCloud) for all generative document tasks
  - Pre-meeting case summaries: section-based prompting pattern from Thrivewell `assessment_ai.py`
  - Pre-visit briefing documents: family history, risk factors, collateral contacts, resource mapping
  - 51B report first drafts: synthesized from worker field notes, voice memos, and structured system inputs
- **Evidence guardrail pattern** from Thrivewell: all AI outputs must include evidence snippets; "Insufficient data" required when evidence is absent; no hallucination permitted
- **JSON repair loop** from Thrivewell `_parse_json_lenient`: handles malformed LLM output with automated retry and repair prompt
- **Schema validation Lambda**: validates all AI-generated documents against the DCF report schema before presenting to the worker
- Pre-submission compliance validation: flags missing mandatory fields and policy compliance issues before supervisor sign-off
- Worker reviews and approves all AI-generated documents before finalization — human-in-the-loop enforced at the application layer

---

#### Architecture Layer 7 — CCWIS/SACWIS Integration Layer

**Purpose:** Bidirectional data exchange with the existing case management platform.

- Secure REST API integration with DCF CCWIS/SACWIS (on-premise or existing hosting environment)
- AIT operates as a layer on top of — not a replacement for — the existing platform
- Read: case history, prior 51A/51B records, worker notes, service plan history, family demographics
- Write: new 51A records, background summary, risk score, triage flag, pre-meeting summary, pre-visit briefing, 51B draft, determination recording
- Retry logic and dead-letter queue (SQS DLQ) for integration failures

---

#### Architecture Layer 8 — Audit & Compliance Layer

**Purpose:** Tamper-evident logging and access control across all AIT activities.

- **Amazon CloudWatch Logs** (GovCloud) for all Lambda execution logs
- **AWS CloudTrail** for API-level audit trail (who accessed what, when)
- **Custom audit event log** (DynamoDB + S3) capturing:
  - Every AI-generated output with model version
  - Every human override with documented reason
  - Every background check query and result
  - Every document generation event
  - Every access event (who viewed each record)
- 7-year retention enforced via S3 Object Lock (WORM — Write Once Read Many)
- **Role-Based Access Control (RBAC)** via AWS IAM + application-layer enforcement
  - Screeners: intake and background check views only
  - Supervisors: + override review, audit trail for their reports
  - Workers: + pre-visit briefing, field notes, 51B drafting
  - IT Admin: infrastructure, no access to case content
  - OIG / Auditors: read-only audit log access

---

#### Architecture Layer 9 — Caseworker UI Layer

**Purpose:** Present AI outputs to screeners, supervisors, and workers with minimal disruption to existing workflows.

- Web-based interface integrated into (or alongside) the existing CCWIS/SACWIS screener workflow
- Dual input support: live call transcription view + manual text paste (for edge cases) — proven Thrivewell UI pattern
- Real-time AI panels: transcription display, field auto-population status, keyword alerts, triage flags, risk score + contributors
- Document review and approval flows for all AI-generated outputs
- Operable with ≤8 hours of training; ≥90% task completion rate in UAT with 20+ screeners

---

### 13.3 Architecture Summary Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DCF/EOHHS Secure Boundary (AWS GovCloud)         │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────────────────────────┐  │
│  │   Caseworker │    │           Layer 1: Telephony             │  │
│  │      UI      │◄──►│   SIP/VoIP → Kinesis Audio Stream        │  │
│  └──────┬───────┘    └──────────────────┬───────────────────────┘  │
│         │                               │                           │
│         │            ┌──────────────────▼───────────────────────┐  │
│         │            │       Layer 2: Transcription             │  │
│         │            │   Amazon Transcribe + Speaker Diarization │  │
│         │            │   Parallel Lambda Chunks + AWS Comprehend │  │
│         │            └──────────────────┬───────────────────────┘  │
│         │                               │                           │
│         │          ┌────────────────────▼────────────────────────┐ │
│         │          │         S3 Input Bucket (Transcripts)       │ │
│         │          └────┬───────────────────────────────────┬────┘ │
│         │               │                                   │      │
│         │   ┌───────────▼──────────┐   ┌───────────────────▼────┐ │
│         │   │  Layer 3: NLP        │   │  Layer 5: Background    │ │
│         │   │  SageMaker Fine-Tuned│   │  Check Orchestration    │ │
│         │   │  51A Field Extractor │   │  Step Functions →       │ │
│         │   │  + Keyword Detector  │   │  CORI/SORI/NCIC/CR/911  │ │
│         │   └───────────┬──────────┘   └───────────────────┬────┘ │
│         │               │                                   │      │
│         │   ┌───────────▼──────────┐   ┌───────────────────▼────┐ │
│         │   │  Layer 4: Risk       │   │  S3 Artifact Bucket     │ │
│         │   │  SageMaker Risk Model│   │  (Background Summary +  │ │
│         │   │  + Triage Flagging   │   │   Validated Documents)  │ │
│         │   └───────────┬──────────┘   └───────────────────┬────┘ │
│         │               │                                   │      │
│         │   ┌───────────▼───────────────────────────────────▼───┐ │
│         │   │       Layer 6: Document Generation                │ │
│         │   │  Claude 3 Haiku (Bedrock) + Evidence Guardrails   │ │
│         │   │  + Schema Validation Lambda + JSON Repair Loop    │ │
│         │   └───────────────────────────┬───────────────────────┘ │
│         │                               │                          │
│         │   ┌───────────────────────────▼───────────────────────┐ │
│         │   │       Layer 7: CCWIS/SACWIS Integration           │ │
│         │   │  Bidirectional REST API + SQS DLQ Retry           │ │
│         │   └───────────────────────────────────────────────────┘ │
│         │                                                          │
│         └──────────────────►  Layer 8: Audit & Compliance         │
│                               CloudTrail + DynamoDB + S3 (WORM)   │
│                               7-Year Retention + RBAC (IAM)       │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.4 Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **AWS GovCloud over standard AWS** | Meets DCF's "on-premise AI" requirement; FedRAMP High compliant; child welfare data never leaves the EOHHS secure boundary. |
| **SageMaker for domain models over Bedrock-only** | Bedrock-hosted models cannot be fine-tuned (Phase 1 lesson). Domain-specific vocabulary in child welfare requires fine-tuning for acceptable accuracy. Bedrock (Claude) is retained for generative document tasks where fine-tuning is less critical. |
| **Step Functions for background checks** | Replaces the sequential manual process with a parallel Map state, reducing background check completion time from hours to minutes. Aligns with the proven Thrivewell event-driven Lambda pattern. |
| **Evidence guardrail pattern from Thrivewell** | Directly adapted from `assessment_ai.py`. Prevents AI hallucination in high-stakes child welfare decisions. Every AI output must cite evidence snippets; "Insufficient data" is required when evidence is absent. |
| **JSON repair loop** | Adapted from `_parse_json_lenient` in Thrivewell. Provides production robustness for LLM JSON output across all generative tasks. |
| **Parallel chunk processing** | Corrects the highest-severity Phase 1 issue (sequential processing latency). Critical for real-time transcription of long calls. |
| **S3 Object Lock (WORM) for audit logs** | Satisfies the 7-year tamper-evident audit log retention requirement; no mechanism exists to delete or modify logs even with admin access. |
| **Human-in-the-loop as application-layer constraint** | Override authority is enforced at the application layer, not as a configurable parameter. No AI score can trigger any action without documented human approval. This is not a policy — it is a system invariant. |

---

## 14. Constraints & Assumptions

### 14.1 Constraints

- All AI processing must remain within the DCF/EOHHS secure infrastructure. No child welfare data may be sent to or processed by external commercial AI providers.
- The AIT must operate as a layer on top of the existing CCWIS/SACWIS platform, not a replacement. The existing platform must remain operational throughout development.
- AI tools must be designed as decision support only. Human screeners, workers, and supervisors must retain full authority over all screening, triage, and determination decisions.
- The risk scoring model must be developed and validated with participation from external equity researchers and community stakeholders — not as a black-box vendor product.
- The system must comply with M.G.L. Chapter 119, HIPAA, FERPA, and all applicable DCF data governance policies.

### 14.2 Assumptions

- DCF will provide dedicated access to SACWIS/CCWIS sandbox environments for development and testing.
- Data Use Agreements (DUAs) with EOHHS, MassHealth, and DYS are obtainable prior to risk model training.
- DCF will designate subject matter experts (screeners, supervisors, area managers) to participate in user acceptance testing.
- Federal CCWIS grant funding will be pursued to partially offset implementation costs.
- DCF leadership will designate an internal project sponsor with authority to make binding decisions on requirements and priorities.
- AWS GovCloud accounts with appropriate EOHHS authorization are obtainable prior to development.
- The Miracle Foundation Thrivewell Phase 2 learnings (SageMaker migration, parallel processing, sliding window context) will be incorporated into Phase 1 AIT development rather than treated as future work.

---

## 15. Document Control

| Version | Date | Author | Change Summary |
|---|---|---|---|
| 0.1 | March 2026 | InApp HHS Practice | Initial draft — DCF requirements gathering phase |
| 1.0 | May 2026 | InApp HHS Practice | Full BRD submitted for DCF stakeholder review |
| 2.0 | May 2026 | InApp HHS Practice | PRD expansion: Miracle Foundation Thrivewell integration, 41-feature inventory, architectural recommendation incorporating Phase 1 POC learnings |
| 3.0 | May 2026 | InApp HHS Practice | Added AS-IS/TO-BE workflow comparison, response timeframes table, AI pipeline orchestration section (S3/Lambda chain, anti-recursion, error handling), security architecture section (data classification, AI-specific threats, IAM, encryption, audit logging, model governance). All source files from dcf/ and Miracle/ subfolders consulted. |

---

*Document prepared by InApp | HHS Practice | Child Welfare Modernization | 2026*

*This document is confidential and intended solely for authorized DCF personnel and approved project stakeholders.*
