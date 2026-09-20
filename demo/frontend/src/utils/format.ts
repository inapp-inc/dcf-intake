import type { CheckpointStatus } from "../api/types";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending_review: "Pending Review",
  assigned: "Pre-Visit Prep",
  report_submitted: "Report Submitted",
  needs_clarification: "Needs Clarification",
  screened_in: "Screened In",
  screened_out: "Screened Out",
  not_started: "Not Started",
};

/** Initial Report checkpoint — fine-grained screener-stage progress */
export const CHECKPOINT_LABELS: Record<CheckpointStatus, string> = {
  not_started: "Initial Report not started",
  ai_populating: "AI populating fields",
  ready_for_review: "AI fields need review",
  incomplete: "Initial Report incomplete",
  complete: "Initial Report checkpoint done",
  locked: "Submitted to supervisor",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCheckpointStatus(status: CheckpointStatus | string): string {
  return CHECKPOINT_LABELS[status as CheckpointStatus] ?? formatStatus(status);
}

export function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "1 hr" : `${hr} hr`;
  const d = Math.floor(hr / 24);
  return d === 1 ? "1 day" : `${d} days`;
}

export function formatInitiatedTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Read-only auto-generated case number label. */
export function formatCaseNumber(externalId?: string, caseId?: string): string {
  if (externalId) return externalId;
  if (caseId) return caseId.slice(0, 8);
  return "Pending";
}

/** Legacy helper — prefer formatCaseNumber for identifiers. */
export function formatCaseTitle(externalId?: string, caseId?: string): string {
  if (externalId) return `Case #${externalId}`;
  if (caseId) return `Case ${caseId.slice(0, 8)}…`;
  return "New case";
}

/** Primary case label: child name; falls back when not yet captured. */
export function formatCaseName(childDisplay?: string | null): string {
  const name = childDisplay?.trim();
  if (name) return name;
  return "New case";
}
