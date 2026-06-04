/** App URL prefix, e.g. `/dcfintake` (no trailing slash). Empty = site root. */
export function normalizeAppBase(raw?: string): string {
  const v = (raw ?? import.meta.env.VITE_BASE_PATH ?? "/").trim();
  if (!v || v === "/") return "";
  const withLeading = v.startsWith("/") ? v : `/${v}`;
  return withLeading.replace(/\/+$/, "");
}

export const APP_BASE = normalizeAppBase(import.meta.env.VITE_BASE_PATH);

/** REST API prefix, e.g. `/dcfintake/api/v1` */
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  (APP_BASE ? `${APP_BASE}/api/v1` : "/api/v1");

/** WebSocket path prefix, e.g. `/dcfintake/ws` */
export const WS_BASE = APP_BASE ? `${APP_BASE}/ws` : "/ws";

export function wsBaseUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}`;
}

export function wsCaseUrl(caseId: string, token: string): string {
  return `${wsBaseUrl()}${WS_BASE}/cases/${caseId}?token=${encodeURIComponent(token)}`;
}
