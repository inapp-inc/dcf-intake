import type { CaseSummary } from "../api/types";

/** Labels derived only from case status + latest 51B draft status returned by the API. */
export type Report51bWorkflowStep = "not_started" | "draft" | "submitted";

export function report51bWorkflowStep(
  caseRow: Pick<CaseSummary, "status" | "report51bStatus">,
): Report51bWorkflowStep {
  if (caseRow.status === "report_submitted") return "submitted";
  const draft = caseRow.report51bStatus;
  if (draft === "draft" || draft === "worker_approved") return "draft";
  return "not_started";
}

export function report51bWorkflowLabel(step: Report51bWorkflowStep): string {
  switch (step) {
    case "submitted":
      return "Submitted to supervisor";
    case "draft":
      return "Draft in progress";
    default:
      return "Not started";
  }
}
