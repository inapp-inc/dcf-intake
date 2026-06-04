import type { CaseSummary } from "../api/types";
import {
  filterScreenerCases,
  filterSupervisorScreening,
  filterWorkerCases,
  type ScreeningScreenInRow,
} from "./navOptions";

/** Counts derived from the same filters as queue chips / stat-card drill-down. */
export function screenerQueueStats(items: CaseSummary[]) {
  return {
    all: items.length,
    active: filterScreenerCases(items, "active").length,
    inProgress: filterScreenerCases(items, "in_progress").length,
    needsCheckpoint: filterScreenerCases(items, "needs_checkpoint").length,
    readyToSubmit: filterScreenerCases(items, "ready_to_submit").length,
    pendingReview: filterScreenerCases(items, "pending_review").length,
    emergencyCount: filterScreenerCases(items, "emergency").length,
  };
}

export function workerQueueStats(items: CaseSummary[]) {
  return {
    all: items.length,
    assigned: filterWorkerCases(items, "assigned").length,
    reportSubmitted: filterWorkerCases(items, "report_submitted").length,
    emergency: filterWorkerCases(items, "emergency").length,
  };
}

export function supervisorScreeningStats<T extends ScreeningScreenInRow>(items: T[]) {
  return {
    all: items.length,
    assigned: filterSupervisorScreening(items, "assigned").length,
    reportSubmitted: filterSupervisorScreening(items, "report_submitted").length,
    report51b: filterSupervisorScreening(items, "report51b").length,
    emergency: filterSupervisorScreening(items, "emergency").length,
  };
}
