/** API shapes aligned with openapi.yaml / API responses */

export type UserRole = "screener" | "supervisor" | "worker" | "admin";
export type SectionId = "child" | "incident" | "reporter" | "household" | "filing";
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
  canCompleteCheckpoint: boolean;
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
  briefingOpenedAt?: string | null;
  report51bStatus?: string | null;
  createdAt?: string;
  relatedCases?: RelatedCaseSummary[];
}

export interface CaseSearchResult {
  caseId: string;
  externalId?: string;
  childDisplay?: string;
  status: string;
  updatedAt: string;
  relatedCount?: number;
}

export interface RelatedCaseSummary {
  caseId: string;
  externalId?: string;
  childDisplay?: string;
  status: string;
  createdAt: string;
  reporterName?: string | null;
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
  triageFlags?: TriageFlag[];
}

export interface ScreeningScreenInItem {
  caseId: string;
  externalId?: string;
  childDisplay: string;
  status: string;
  riskScore: number;
  emergency: boolean;
  decision: string;
  decisionLabel: string;
  notes?: string;
  decidedBy: string;
  decidedAt: string;
  hasReport51b?: boolean;
}

export interface TriageConfig {
  keywordPatterns: { label: string; pattern: string; flags?: string }[];
  triageIndicators: { id: string; label: string; severity: "high" | "critical" }[];
  escalationThreshold: number;
}

/** Rule-based risk weights (statistical, not probabilistic). */
export interface RiskFramework {
  version: string;
  scaleMin: number;
  scaleMax: number;
  baselinePoints: number;
  emergencyPoints: number;
  keywordPoints: Record<string, number>;
  defaultKeywordPoints: number;
  triageSeverityPoints: { critical: number; high: number };
  pendingTriageMultiplier: number;
  bands: { min: number; label: string }[];
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
  speaker: "S" | "C" | "L";
  text: string;
  keywordFlag?: boolean;
}

export interface LiveSessionStatus {
  status: "idle" | "recording" | "ended";
  sessionId?: string | null;
  startedAt?: string | null;
  chunkCount?: number;
}

export interface TriageFlag {
  id: string;
  label: string;
  severity: string;
  evidence?: string;
  status: string;
}

export interface RiskAssessment {
  status?: "pending" | "running" | "ready" | "failed";
  score: number | null;
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

export interface FieldNotesResponse {
  text: string;
  fieldMemoStatus: string | null;
}

export type CaseWsEvent =
  | { type: "transcript.line"; index?: number; speaker?: string; text?: string; keywordFlag?: boolean }
  | { type: "form.field.updated"; source?: string }
  | { type: "form.checkpoint.changed"; checkpointStatus?: CheckpointStatus }
  | { type: "pipeline.stage"; stage?: string; status?: string }
  | { type: "triage.alert"; keywords?: string[]; flagId?: string }
  | { type: "assistant.refresh" }
  | { type: "field_memo.complete"; text?: string; appended?: string }
  | { type: "field_memo.failed"; message?: string };
