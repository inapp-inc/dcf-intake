/** API shapes aligned with openapi.yaml / API responses */

export type UserRole = "screener" | "supervisor" | "worker" | "admin";
export type SectionId = "child" | "incident" | "reporter" | "household";
export type CheckpointStatus =
  | "not_started"
  | "ai_populating"
  | "ready_for_review"
  | "incomplete"
  | "complete"
  | "locked";

export interface Form51AField {
  label: string;
  required: boolean;
  value: string;
  source: "human" | "ai" | "ccwis";
  aiConfidence?: number;
  confirmedByHuman: boolean;
  missing: boolean;
  multiline?: boolean;
}

export interface Form51ASection {
  title: string;
  icon: string;
  fields: Record<string, Form51AField>;
}

export interface Form51ACompletion {
  mandatoryTotal: number;
  mandatoryFilled: number;
  aiFieldsPendingConfirmation: number;
  sectionsComplete: SectionId[];
  canSubmitToSupervisor: boolean;
}

export interface Form51A {
  caseId: string;
  checkpointStatus: CheckpointStatus;
  sections: Record<SectionId, Form51ASection>;
  completion: Form51ACompletion;
}

export interface CaseSummary {
  caseId: string;
  externalId?: string;
  childDisplay?: string;
  status: string;
  form51aCheckpointStatus: CheckpointStatus;
  riskScore?: number;
  triageFlagCount?: number;
  emergency: boolean;
  updatedAt: string;
}

export interface ScreeningQueueItem {
  caseId: string;
  externalId?: string;
  childDisplay: string;
  riskScore: number;
  emergency: boolean;
  aiSummary: string;
  aiRecommendation: string;
  screenerName: string;
  submittedAt: string;
  triageFlagCount?: number;
}

export interface Briefing {
  caseId: string;
  childDisplay: string;
  address: string;
  riskScore: number;
  riskFactors: string[];
  protectiveFactors: string[];
  collateralContacts: { name: string; role: string; phone: string }[];
  leAccompanimentRecommended: boolean;
  leReason: string;
  communityResources: string[];
  evidence: { claim: string; source: string }[];
}

export interface Report51BDraft {
  version: number;
  content: string;
  aiGenerated: boolean;
  status: string;
}

export interface ComplianceResult {
  passed: boolean;
  missingFields: string[];
}

export interface AuditEvent {
  id: string;
  caseId: string;
  eventType: string;
  actorId: string;
  actorRole: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SystemHealth {
  uptime: string;
  components: { name: string; status: "up" | "down" | "degraded" }[];
}

export interface ModelInfo {
  name: string;
  version: string;
  status: string;
  metric: string;
}

export interface TranscriptSegment {
  speaker: "S" | "C";
  text: string;
  keywordFlag?: boolean;
}

export interface TriageFlag {
  id: string;
  label: string;
  severity: string;
  evidence?: string;
  status: string;
}

export interface RiskAssessment {
  score: number;
  label: string;
  modelVersion?: string;
  contributingFactors: string[];
  advisoryOnly: boolean;
}

export interface BackgroundSource {
  name: string;
  status: string;
  recordFound: boolean | null;
}

export interface AssistantMessage {
  id: string;
  type: string;
  message: string;
  fieldJump?: string;
}

export interface PipelineStatus {
  currentStage: string;
  stages: Record<string, string>;
}

export type CaseWsEvent =
  | { type: "transcript.line"; index?: number; speaker?: string; text?: string; keywordFlag?: boolean }
  | { type: "form.field.updated"; source?: string }
  | { type: "form.checkpoint.changed"; checkpointStatus?: CheckpointStatus }
  | { type: "pipeline.stage"; stage?: string; status?: string }
  | { type: "triage.alert"; keywords?: string[]; flagId?: string }
  | { type: "assistant.refresh" };
