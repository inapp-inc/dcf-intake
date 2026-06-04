import type { CaseSummary } from "../api/types";

export type BriefingProgress = "pending" | "in_progress";

export function briefingProgress(caseRow: Pick<CaseSummary, "briefingOpenedAt">): BriefingProgress {
  return caseRow.briefingOpenedAt ? "in_progress" : "pending";
}

export function briefingProgressLabel(progress: BriefingProgress): string {
  return progress === "in_progress" ? "In progress" : "Pending";
}
