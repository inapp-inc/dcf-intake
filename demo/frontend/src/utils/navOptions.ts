import type { CaseSummary } from "../api/types";

export type ScreenerQueueFilter =
  | "all"
  | "active"
  | "in_progress"
  | "pending_review"
  | "emergency"
  | "needs_checkpoint"
  | "ready_to_submit";

export type WorkerQueueFilter = "all" | "assigned" | "report_submitted" | "emergency";

export type SupervisorScreeningFilter = "all" | "assigned" | "report_submitted" | "emergency" | "report51b";

export type NavOptions = {
  screenerFilter?: ScreenerQueueFilter;
  workerFilter?: WorkerQueueFilter;
  supervisorScreeningFilter?: SupervisorScreeningFilter;
  supervisorEmergencyOnly?: boolean;
};

export const SCREENER_FILTER_OPTIONS: { id: ScreenerQueueFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "needs_checkpoint", label: "Initial Report incomplete" },
  { id: "pending_review", label: "Pending review" },
  { id: "emergency", label: "Emergency" },
];

export const WORKER_FILTER_OPTIONS: { id: WorkerQueueFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "assigned", label: "Assigned" },
  { id: "report_submitted", label: "Field Report submitted" },
  { id: "emergency", label: "Emergency" },
];

export const SUPERVISOR_SCREENING_FILTER_OPTIONS: { id: SupervisorScreeningFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "assigned", label: "With field worker" },
  { id: "report_submitted", label: "Field Report submitted" },
  { id: "report51b", label: "Field Report returned" },
  { id: "emergency", label: "Emergency" },
];

const SCREENER_ACTIVE_STATUSES = new Set(["in_progress", "pending_review", "needs_clarification"]);

export function filterScreenerCases(items: CaseSummary[], filter: ScreenerQueueFilter): CaseSummary[] {
  switch (filter) {
    case "active":
      return items.filter((c) => SCREENER_ACTIVE_STATUSES.has(c.status));
    case "in_progress":
      return items.filter((c) => c.status === "in_progress");
    case "pending_review":
      return items.filter((c) => c.status === "pending_review");
    case "emergency":
      return items.filter((c) => c.emergency);
    case "needs_checkpoint":
      return items.filter(
        (c) =>
          c.status === "in_progress" &&
          c.form51aCheckpointStatus !== "complete" &&
          c.form51aCheckpointStatus !== "locked",
      );
    case "ready_to_submit":
      return items.filter(
        (c) => c.status === "in_progress" && c.form51aCheckpointStatus === "complete",
      );
    default:
      return items;
  }
}

export type ScreeningScreenInRow = {
  status: string;
  emergency: boolean;
  hasReport51b?: boolean;
};

export function filterSupervisorScreening<T extends ScreeningScreenInRow>(
  items: T[],
  filter: SupervisorScreeningFilter,
): T[] {
  switch (filter) {
    case "assigned":
      return items.filter((c) => c.status === "assigned");
    case "report_submitted":
      return items.filter((c) => c.status === "report_submitted");
    case "report51b":
      return items.filter((c) => c.hasReport51b);
    case "emergency":
      return items.filter((c) => c.emergency);
    default:
      return items;
  }
}

export function filterWorkerCases(items: CaseSummary[], filter: WorkerQueueFilter): CaseSummary[] {
  switch (filter) {
    case "assigned":
      return items.filter((c) => c.status === "assigned");
    case "report_submitted":
      return items.filter((c) => c.status === "report_submitted");
    case "emergency":
      return items.filter((c) => c.emergency);
    default:
      return items;
  }
}
