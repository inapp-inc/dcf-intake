

**COMMONWEALTH OF MASSACHUSETTS**

Department of Children and Families

**BUSINESS REQUIREMENTS DOCUMENT**

**DCF Automated Intake Tool (AIT)**

| Document Version | 1.0 — DRAFT |
| :---- | :---- |
| **Prepared By** | InApp  |  HHS Practice  |  Child Welfare IT & Program Consulting |
| **Prepared For** | Massachusetts Department of Children and Families |
| **Date** | May 2026 |
| **Classification** | CONFIDENTIAL |
| **Legal Authority** | M.G.L. Chapter 119, Sections 51A and 51B |

*This document is confidential and intended solely for authorized DCF personnel and approved project stakeholders.*

# **1\. Executive Summary**

The Massachusetts Department of Children and Families (DCF) currently operates a 24/7 protective intake system to receive, screen, and respond to reports of child abuse, neglect, sexual exploitation, and human trafficking (51A reports). The existing process relies heavily on manual data entry, sequential background checks, and paper-based documentation — creating structural conditions for error, inconsistency, and compliance risk.

This Business Requirements Document (BRD) defines the functional and non-functional requirements for developing a DCF Automated Intake Tool (AIT) — an AI-assisted digital platform designed to modernize every stage of the intake and response process while preserving human judgment as the ultimate decision authority.

| Why This Matters In FY2024, Massachusetts DCF received tens of thousands of 51A reports. Manual intake methods are prone to significant omissions, and screeners face a 1-business-day window to make complex, life-altering decisions. The AIT offers a proven path to faster, more consistent, and more accurate child protection — removing structural friction without replacing professional judgment. |
| :---- |

# **2\. Project Overview**

## **2.1  Project Background**

DCF operates under M.G.L. Chapter 119, §51A and §51B, which establish the mandatory reporting and investigation obligations governing all intake activity. The intake process comprises two primary phases:

* Phase 1 — Screening: Gathering sufficient information to determine whether a DCF response is necessary.

* Phase 2 — 51B Response (Investigation): Formal investigation to determine whether reasonable cause exists to believe a child has been abused or neglected.

Screeners currently work under extreme time pressure — managing emotionally charged calls while simultaneously typing notes, running manual checks, and applying complex policy criteria. Critical information is routinely missed due to the structural limitations of the manual process, not negligence.

## **2.2  Project Objectives**

* Reduce administrative burden on screeners so they can focus on the caller and the child's safety.

* Eliminate manual, sequential background check workflows in favor of simultaneous automated queries.

* Provide AI-powered decision support (risk scoring, triage flagging) while preserving human authority over all determinations.

* Ensure complete, consistent documentation for every intake record, reducing compliance exposure.

* Establish an equity-aware, explainable AI framework compliant with DCF data governance policies.

## **2.3  Scope**

| In Scope | Out of Scope |
| :---- | :---- |
| • 51A Hotline call transcription and NLP field auto-population • Automated background checks (Central Registry, CORI, SORI, 911 history) • Predictive risk scoring for screen-in/screen-out support • Emergency/non-emergency triage flagging • Screening Team pre-meeting case summaries • 51B pre-visit worker briefing documents • AI-assisted 51B report drafting • CCWIS/SACWIS integration layer | • Post-investigation case management (Foster Care, Reunification) • Court filing or legal documentation generation • Replacement of the existing SACWIS/CCWIS case management platform • Automated removal decisions or court petitions • Third-party commercial cloud AI processing outside DCF secure environment |

# **3\. Stakeholder Identification**

| Stakeholder | Role | Key Interest / Concern |
| :---- | :---- | :---- |
| DCF Area Office Screeners | Primary users of the AIT; conduct 51A intake calls | Ease of use; reduced documentation burden; reliable triage support |
| DCF Supervisors & Area Managers | Approve screening decisions; review Screening Team cases | Consistent decision quality; compliance monitoring; audit trail |
| 51B Investigators / Social Workers | Conduct field investigations after screen-in | Accurate pre-visit briefings; up-to-date collateral summaries |
| DCF IT & Data Governance | Own SACWIS/CCWIS infrastructure and data security policy | Secure integration; data privacy compliance; system uptime |
| EOHHS Office of Analytics | Cross-agency data sharing for risk model enrichment | Data use agreements; equity metrics; model governance |
| Families Served by DCF | Subject of intake and investigation decisions | Fairness; explainability; protection from automated bias |
| Massachusetts Legislature / OIG | Oversight of DCF compliance and outcomes | Audit capability; bias monitoring; legal compliance |
| InApp HHS Practice | System implementer and AI model developer | Requirements clarity; agency buy-in; technical feasibility |

# **4\. Functional Requirements**

## **FR-1:  51A Hotline Call Transcription and NLP Field Auto-Population**

The AIT shall provide real-time voice-to-text transcription of all inbound 51A hotline calls, integrated directly into the DCF case management system.

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-1.1 | Transcription | System shall transcribe 51A hotline calls in real time with accuracy rate of 95% or higher. | Transcription accuracy validated against ground truth on 100-call test set; 95%+ accuracy required. |
| FR-1.2 | Auto-Population | NLP engine shall auto-populate all required 51A structured fields from the call transcript, including child name/age/address, reporter type, nature of allegation, and alleged responsible party. | 100% of mandatory 51A fields populated or flagged for manual entry before call ends. |
| FR-1.3 | Missing Field Alert | System shall alert the screener in real time if a mandatory field remains empty before the call is terminated. | Alert fires reliably for all mandatory fields; tested against 50 simulated incomplete-call scenarios. |
| FR-1.4 | High-Risk Keyword Detection | System shall detect and flag high-risk keywords in real time during the call (weapons, prior removals, domestic violence, very young children, perpetrator in home). | Flagging triggers within 5 seconds of keyword occurrence; validated on labeled test transcript set with 90%+ precision and recall. |
| FR-1.5 | Supervisor Call Summary | System shall auto-generate a structured call summary upon call completion for immediate supervisor review. | Summary generated within 30 seconds of call end; contains all required data elements. |

## **FR-2:  Automated Background and History Checks**

The AIT shall trigger simultaneous automated queries across all required background check systems upon acceptance of a new 51A report.

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-2.1 | Central Registry | System shall automatically query DCF's Central Registry for prior 51A/51B history on the child and all identified caregivers. | Query initiated within 60 seconds of report creation; results returned within the screener's session. |
| FR-2.2 | CORI / SORI | System shall automatically initiate CORI and SORI checks for all identified adults in the household. | Parallel CORI and SORI queries initiated simultaneously; results compiled into a unified summary. |
| FR-2.3 | National Criminal History | System shall query the national criminal background database for all adults identified in the report. | National query completed and results available to screener prior to screening decision. |
| FR-2.4 | Law Enforcement 911 History | System shall retrieve prior 911 service history at the reported address from the relevant law enforcement agency. | Prior 911 data retrieved and displayed; integration with local LE systems validated by area office. |
| FR-2.5 | Unified Background Summary | System shall compile all background check results into a single, structured Background Summary document available to the screener. | Summary document generated and available within 5 minutes of report acceptance; all data sources reflected. |

## **FR-3:  Predictive Risk Scoring**

The AIT shall include an actuarial-based risk scoring model to support — but not replace — screener judgment in screen-in/screen-out decisions.

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-3.1 | Risk Score Generation | System shall generate a risk score (1-20) for each screened-in report using a model trained on Massachusetts SACWIS/CCWIS, EOHHS, MassHealth, and DYS data. | Risk score produced for 100% of reports; model validated against historical outcomes on hold-out dataset. |
| FR-3.2 | Human Override | The risk score shall be displayed as a decision support input only. Screeners shall retain full authority to override the model on any report. | Override capability confirmed present and functional in all user acceptance testing scenarios. |
| FR-3.3 | Score Explainability | System shall display the top contributing factors to the risk score alongside the score itself. | Contributing factors displayed for every score; explanations reviewed by child welfare SMEs for accuracy. |
| FR-3.4 | Bias Audit Reporting | The risk model shall generate quarterly bias audit reports measuring score distribution by race, ethnicity, income, and geography. | Quarterly reports produced automatically; reviewed by equity stakeholder panel. |
| FR-3.5 | Score History | System shall retain a full audit trail of risk scores and screener override decisions for each report. | Score and override history accessible in case record; retained for minimum 7 years per DCF retention policy. |

## **FR-4:  Emergency / Non-Emergency Triage Flagging**

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-4.1 | Real-Time Triage Analysis | System shall analyze the call transcript and flag potential emergency indicators in real time before the screener ends the call. | Triage flags appear within 5 seconds of qualifying indicator detection during the call. |
| FR-4.2 | Emergency Indicator Coverage | System shall detect the following emergency indicators: very young child (under 5), weapon present, prior removal history, perpetrator currently in the home, reporter expressing imminent fear. | All defined indicators detected with 90%+ recall on labeled test set. |
| FR-4.3 | Triage Escalation Alert | System shall display a visible on-screen escalation alert when two or more emergency indicators are detected. | Alert visible and distinct from standard notifications; confirmed in usability testing with screeners. |

## **FR-5:  Screening Team Pre-Meeting Case Summaries**

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-5.1 | Pre-Meeting Summary Generation | System shall auto-generate a structured one-page case summary for each case pending Screening Team review, available prior to the daily meeting. | Summaries generated and distributed at least 1 hour before scheduled Screening Team meeting time. |
| FR-5.2 | Summary Content | Each summary shall include: timeline of prior contacts, current risk score, key protective and risk factors, collateral contact status, and recommended response type. | Summary content verified against a defined template; reviewed and approved by DCF program leads prior to go-live. |
| FR-5.3 | Clinical Review Trigger | System shall automatically flag cases that meet the Clinical Review threshold (3+ incidents in 12 months involving the same child or family). | Clinical Review flags tested against historical cases; 100% detection of qualifying cases required. |

## **FR-6:  51B Pre-Visit Worker Briefing**

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-6.1 | Auto-Briefing Document | System shall generate a pre-visit briefing document for each assigned 51B worker, containing: full family history, prior 51A/51B records, prior worker notes, known risk factors, and relevant collateral contacts. | Briefing document available to assigned worker within 30 minutes of case assignment; all required data elements present. |
| FR-6.2 | Related Child Identification | System shall identify other children in related households and flag for worker review. | Related children identified via shared address/caregiver linkage logic; confirmed accurate in user acceptance testing. |
| FR-6.3 | Geolocation Resource Mapping | System shall surface nearby community resources relevant to identified family needs. | Resource list generated for each case; tied to current EOHHS resource directory. |

## **FR-7:  AI-Assisted 51B Report Documentation**

| Req ID | Category | Requirement Description | Acceptance Criteria |
| :---- | :---- | :---- | :---- |
| FR-7.1 | Draft Report Generation | System shall produce a structured first draft of the 51B response report from the worker's field notes, voice memos, and structured system inputs. | Draft report generated upon submission of field notes; worker review and approval required before finalization. |
| FR-7.2 | Compliance Validation | System shall flag missing required fields and check for policy compliance before supervisor sign-off. | Compliance check catches 100% of missing mandatory fields on test set of 50 report scenarios. |
| FR-7.3 | Report Audit Trail | System shall maintain a full version history of all report drafts, worker edits, and supervisor approvals. | Version history accessible in case record; confirmed in integration testing. |

# **5\. Non-Functional Requirements**

| Category | Requirement | Target Metric |
| :---- | :---- | :---- |
| **Performance** | System must support 24/7 continuous intake operations without planned downtime during business hours. | 99.9% uptime SLA; max 8 hours planned maintenance per year during off-peak hours. |
| **Security** | All AI processing must occur within DCF's secure environment. No child welfare data may be transmitted to or processed by third-party commercial cloud platforms. | Penetration test passed prior to go-live; ATO (Authority to Operate) issued by EOHHS CISO. |
| **Privacy** | System must comply with HIPAA, FERPA, M.G.L. Chapter 119, and DCF data governance policy. Call recordings and transcripts must be encrypted at rest and in transit. | Privacy impact assessment completed; legal counsel sign-off required before go-live. |
| **Usability** | Interface must be operable by screeners with no more than 8 hours of training. Existing CCWIS workflow disruption must be minimized. | User acceptance testing with 20+ screeners; task completion rate of 90%+ on core workflows. |
| **Equity** | AI models must be developed with external researchers, validated against equity metrics, and subject to ongoing bias audits with community stakeholder input. | Pre-launch equity audit completed; results published to DCF leadership and community stakeholder panel. |
| **Auditability** | All AI-generated outputs, human overrides, and system decisions must be logged with full audit trail. | Audit logs retained 7+ years; accessible to authorized DCF, EOHHS, and OIG personnel. |

# **6\. System Integration Requirements**

| System | Integration Type | Data Elements Exchanged |
| :---- | :---- | :---- |
| **DCF CCWIS / SACWIS** | Bidirectional API | Case history, prior 51A/51B records, worker notes, service plan history, family demographics |
| **MA DCF Central Registry** | Read-only query | Prior abuse/neglect history for child and caregivers |
| **CORI System (DCJIS)** | Automated query | Criminal offender record information for adults in household |
| **SORI System (SORB)** | Automated query | Sex offender registry information for adults in household |
| **National Criminal History (FBI/NCIC)** | Automated query | National-level criminal background for household adults |
| **Local Law Enforcement (911 CAD)** | Read-only query | Prior 911 calls and service history at reported address |
| **EOHHS / MassHealth** | Secure data sharing (DUA required) | Medical and benefits history for risk model enrichment |
| **DYS (Department of Youth Services)** | Secure data sharing (DUA required) | Youth justice history for risk model enrichment |
| **EOHHS Resource Directory** | Read-only API | Community resource locations for geolocation matching |

# **7\. Constraints and Assumptions**

## **7.1  Constraints**

* All AI processing must remain within the DCF/EOHHS secure infrastructure. No child welfare data may be sent to or processed by external commercial AI providers (e.g., public cloud LLMs).

* The AIT must operate as a layer on top of the existing CCWIS/SACWIS platform, not a replacement. The existing platform must remain operational throughout development.

* AI tools must be designed as decision support only. Human screeners, workers, and supervisors must retain full authority over all screening, triage, and determination decisions.

* The risk scoring model must be developed and validated with participation from external equity researchers and community stakeholders — not as a black-box vendor product.

* The system must comply with M.G.L. Chapter 119, HIPAA, FERPA, and all applicable DCF data governance policies.

## **7.2  Assumptions**

* DCF will provide dedicated access to SACWIS/CCWIS sandbox environments for development and testing.

* Data use agreements (DUAs) with EOHHS, MassHealth, and DYS are obtainable prior to risk model training.

* DCF will designate subject matter experts (screeners, supervisors, area managers) to participate in user acceptance testing.

* Federal CCWIS grant funding will be pursued to partially offset implementation costs.

* DCF leadership will designate an internal project sponsor with authority to make binding decisions on requirements and priorities.

# **8\. Ethical Guardrails and AI Governance**

AI in child welfare is not without risk. The AIT shall be governed by the following non-negotiable principles, embedded in system design, training, and ongoing operations:

| Risk Area | Mitigation Principle |
| :---- | :---- |
| **Racial & Socioeconomic Bias** | Any model trained on historical DCF data risks encoding existing racial and socioeconomic disparities. Models must be developed with external researchers, validated against equity metrics, and subject to ongoing bias audits with community stakeholder participation. |
| **Automation Bias** | Workers may defer to AI recommendations even when their own judgment should override. Human override authority must be preserved and actively reinforced through training. High scores must never auto-trigger removal without documented human review. |
| **Data Privacy** | Child welfare data is among the most sensitive in government. All AI processing must comply with HIPAA, FERPA, and DCF data governance policy. Processing must occur within DCF's secure environment — never via third-party commercial cloud platforms. |
| **Model Transparency** | Families affected by AI-assisted decisions have a right to understand how decisions were made. DCF shall adopt explainable AI approaches and ensure predictive scores are never the sole or determinative factor in any decision. |
| **Human-in-the-Loop** | AI tools are decision support, not decision replacement. Every screening, triage, and determination must be made and documented by a qualified human professional. AI outputs are inputs to human judgment — never substitutes for it. |

# **9\. Overall Acceptance Criteria**

* All functional requirements (FR-1 through FR-7) pass user acceptance testing with a task completion rate of 90% or higher.

* Transcription accuracy of 95%+ validated on a 100-call test set prior to go-live.

* Risk model equity audit completed and reviewed by community stakeholder panel prior to go-live.

* Authority to Operate (ATO) issued by EOHHS CISO following penetration testing.

* Privacy Impact Assessment completed and signed by DCF legal counsel.

* All integrations validated end-to-end in staging environment before production deployment.

* Screener training program completed; 90% of trained users pass post-training assessment.

* Parallel run period of 30 days in at least two DCF Area Offices prior to statewide rollout.

# **10\. Document Control**

| Version | Date | Author | Change Summary |
| :---- | :---- | :---- | :---- |
| 0.1 | March 2026 | InApp HHS Practice | Initial draft — requirements gathering phase |
| 1.0 | May 2026 | InApp HHS Practice | Full draft submitted for DCF stakeholder review |

*Document prepared by InApp  |  HHS Practice  |  Child Welfare Modernization  |  2026*