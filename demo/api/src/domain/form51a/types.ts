import type { SectionId } from "./fieldCatalog.js";

export type CheckpointStatus =
  | "not_started"
  | "ai_populating"
  | "ready_for_review"
  | "incomplete"
  | "complete"
  | "locked";

export type FieldSource = "human" | "ai" | "ccwis";

export interface Form51AField {
  label: string;
  required: boolean;
  value: string;
  source: FieldSource;
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

export type UserRole = "screener" | "supervisor" | "worker" | "admin";
