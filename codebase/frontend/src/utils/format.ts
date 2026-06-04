const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending_review: "Pending Review",
  assigned: "Pre-Visit Prep",
  report_submitted: "Report Submitted",
  screened_in: "Screened In",
  screened_out: "Screened Out",
  not_started: "Not Started",
};

export function formatStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

export function formatCaseTitle(externalId?: string, caseId?: string): string {
  if (externalId) return `Case #${externalId}`;
  if (caseId) return `Case ${caseId.slice(0, 8)}…`;
  return "New case";
}
