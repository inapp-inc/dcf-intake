**PROJECT CLOSURE DOCUMENT**

*Phase 1 — Proof of Concept Completion Report*

**Miracle Foundation- Thrivewell AI Caseworker Assessment System**

| Prepared by | Ajitha V |
| :---- | :---- |
| **Prepared for** | Leadership & Stakeholders |
| **Project Phase** | Phase 1 (POC) |
| **Document Type** | Project Closure Report |
| **Status** | Phase 1 Completed & Delivered |
| **Next Phase** | Phase 2 \- Yet to Plan |
| **Date** | 27 March 2026 |

# 

# 

# **1\. Executive Summary**

Phase 1 (Proof of Concept) of the Thrivewell AI Caseworker Assessment System has been successfully completed, deployed, and handed over to the client. The POC demonstrates a fully functional end-to-end AI pipeline designed to support social caseworkers in assessing family welfare scenarios using conversational transcripts.

The system accepts multilingual audio or text case inputs, transcribes and translates them into English, generates AI-driven assessments, and presents structured results through a simple caseworker UI

**Key Outcomes**

* Full end-to-end pipeline operational in production AWS environment

* Supports dual input modes: audio upload (mp3, wav, m4a) and direct text paste

* Multilingual translation covering Hindi, Kannada, Marathi and more Indian languages

* AI-driven welfare assessment with four-tier rating: In Crisis → Vulnerable → Safe → Thriving

* Evidence-backed recommendations presented through Streamlit UI

* System successfully handed over and accepted by client

| Milestone | Status |
| ----- | ----- |
| POC Development | **Complete** |
| AWS Deployment | **Complete** |
| Client Handover & Acceptance | **Complete** |
| Translation Pipeline | **Operational (with known limitations)** |
| Assessment Engine | **Operational** |
| Phase 2 Planning | **In Progress** |

# **2\. Project Performance Assessment**

The following table compares original project goals against actual outcomes delivered in Phase 1\.

| Objective | Planned | Actual | Variance |
| ----- | ----- | ----- | ----- |
| **Input Handling** | Audio \+ text intake via UI | **Delivered** | None |
| **Transcription** | Audio → raw text pipeline | **Delivered** | None |
| **Translation** | Indian languages → English via Bedrock LLM | **Delivered** | Minor — reasoning leakage in model output (mitigated via post-processing) |
| **Assessment Engine** | AI-driven structured welfare assessment | **Delivered** | None |
| **Output Storage** | JSON results stored in S3 | **Delivered** | None |
| **UI** | Streamlit caseworker interface | **Delivered** | None |
| **Deployment** | Serverless AWS Lambda \+ S3 event-driven arch | **Delivered** | None |
| **Performance** | Acceptable latency for caseworker use | **Achieved** | Sequential chunk processing adds latency — parallel processing planned for Phase 2 |

# **3\. Deliverables Sign-off**

All Phase 1 deliverables have been completed, tested, deployed, and formally handed over to the client. The table below confirms acceptance status for each component.

| Deliverable | Delivered | Client Accepted |
| ----- | :---: | :---: |
| Streamlit UI — dual input (audio \+ text) | **Yes** | **Yes** |
| S3-triggered ingestion pipeline | **Yes** | **Yes** |
| AWS Transcribe audio transcription module | **Yes** | **Yes** |
| Bedrock LLM translation pipeline | **Yes** | **Yes** |
| Reasoning-leakage post-processing extractor | **Yes** | **Yes** |
| AI assessment generation engine | **Yes** | **Yes** |
| Structured JSON output storage (S3) | **Yes** | **Yes** |
| Interactive rating UI (In Crisis → Thriving) | **Yes** | **Yes** |
| Evidence snippet display | **Yes** | **Yes** |
| Full AWS serverless deployment | **Yes** | **Yes** |
| System handover documentation | **Yes** | **Yes** |

**Sign-off Statement**

All deliverables listed above have been reviewed, accepted, and signed off by the client stakeholders. Phase 1 is formally closed as of the date of this document.

| Role | Name |
| ----- | ----- |
| **Project Manager** | Pramod Vijayan |
| **Technical Lead** | Parvathy Sukumaran |
| **Client Delivery Director** | Priya George |

# **4\. Lessons Learned**

This section captures institutional knowledge from Phase 1 to inform future phases and similar projects.

## **4.1 What Went Well**

| Area | Detail |
| ----- | ----- |
| **Event-driven Architecture** | The S3-triggered Lambda pipeline proved highly reliable, cost-effective, and easy to extend. Zero orchestration overhead. |
| **Prompt Engineering** | Iterative prompt refinement significantly improved translation fidelity. Strict system prompts with declarative rules outperformed conversational instructions. |
| **Post-processing Layer** | Introducing a regex-based reasoning extractor as a safety net after LLM output was a robust pattern for production robustness. |
| **Chunking Strategy** | Sentence-aware chunking with context carryover between chunks preserved conversational continuity better than fixed-character splits. |
| **Language Detection** | AWS Comprehend integration for automatic language detection worked reliably across all five target languages. |
| **Modular Design** | Separating transcription, translation, and assessment into independent Lambda functions allowed independent testing, deployment, and debugging. |

## **4.2 What Didn't Work / Challenges**

| Challenge | Impact & Learning |
| ----- | ----- |
| **Reasoning Model for Translation** | GPT-class reasoning models leak chain-of-thought into translation output ("let's translate...", "probably"). A task-specific translation model should be used from the start. |
| **Conversational Input Complexity** | Informal, emotion-driven, grammatically fragmented transcripts reduce translation accuracy. Preprocessing and reconstruction are necessary upstream steps. |
| **Sequential Chunk Processing** | Translating chunks one-by-one significantly increases end-to-end latency for long transcripts. Parallel processing was deprioritised in Phase 1\. |
| **Context Loss Across Chunks** | Long conversations split across many chunks occasionally lost speaker continuity. A fixed trailing-context window helped but did not fully resolve this. |
| **No Fine-tuning Control** | Bedrock-hosted models cannot be fine-tuned. Domain-specific terminology (welfare, casework jargon) was sometimes translated generically. |

## **4.3 Recommendations for Phase 2**

* Introduce **multi-model architecture** by integrating Amazon SageMaker to overcome current Amazon Bedrock limitations.

* Replace the existing AI models with ones that are specifically designed for translation using sagemaker.

* Enhance **context handling across chunks** for better conversational understanding.

* Identifying the root cause automatically and suggesting a tailored list of interventions.

* Leverage newly introduced **rephrased question dataset ( which includes Factors, Helper Text, Guidelines)** to:

* Provide **context-aware recommendations**  
* Standardize decision-making across caseworkers

# 

# **5\. Risk / Issue Register & Ownership Transfer**

The following risks and open issues are carried forward from Phase 1 into Phase 2\. Ownership has been formally transferred to the Phase 2 team.

## **5.1 Carried-Forward Issues**

| ID | Issue / Risk | Severity | Phase 2 Owner | Resolution Plan |
| ----- | ----- | :---: | :---: | ----- |
| **Issue-1** | Translation model generates reasoning leakage in output | **Medium** | AI Dev | Replace with Opensource model via SageMaker |
| **Issue- 2** | Sequential chunk processing causes latency on long transcripts | **High** | AI Dev | Parallel Lambda invocations per chunk |
| **Issue-3** | Context loss between translation chunks for very long conversations | **Medium** | AI Dev | Sliding window context \+ speaker tagging |
| **Issue-4** | No fine-tuning capability on Bedrock-hosted models | **Medium** | AI Dev | Migrate to SageMaker for domain fine-tuning |
| **Risk-01** | Bedrock model availability / pricing changes | **Low** | AI Dev | Fallback model strategy \+ cost monitoring alerts |
| **Risk-02** | Accuracy degradation on highly informal or code-switched transcripts | **High** | AI Dev | Preprocessing layer \+ quality control loop |
| **Risk-03** | AWS Comprehend language detection failures on mixed-language input | **Low** | AI Dev | Fallback language detection heuristic |

## 

## **5.2 Ongoing Maintenance Responsibilities**

| System Component | Responsibility | Owner |
| ----- | ----- | ----- |
| **AWS Lambda Functions** | Monitoring, error alerting, updates | AI Dev |
| **S3 Buckets** | Storage cost, lifecycle policies | DevOps |
| **Bedrock Model Invocations** | Cost monitoring, model version updates | AI Dev |
| **Streamlit UI** | Bug fixes, UX improvements | AI Dev |
| **Translation Prompt Config** | Prompt iteration, leakage monitoring | AI Dev |
| **Assessment Prompt Config** | Assessment accuracy monitoring | AI Dev |

# **8\. Conclusion & Project Status**

Phase 1 of the Thrivewell AI Caseworker Assessment System has been successfully completed. The POC demonstrates a robust, scalable, and extensible architecture for AI-assisted social welfare case assessment, supporting multilingual conversational transcripts from audio to structured welfare rating.

While limitations exist primarily around translation model behaviour and sequential processing latency clear, actionable solutions are identified and planned for Phase 2\. The system has been delivered, accepted, and is operational in the client environment.

| Phase 1 | Handover | Phase 2 |
| :---: | :---: | :---: |
|  **Completed** | **Delivered** | **Yet to Plan** |

*This document is prepared for Leadership & Stakeholders for Phase Closure & Next Phase Alignment.*

*Document Date: 27 March 2026*

