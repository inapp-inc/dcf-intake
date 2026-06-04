import type {
  AssistantMessage,
  AuditEvent,
  BackgroundSource,
  Briefing,
  CaseSummary,
  ComplianceResult,
  FieldNotesResponse,
  Form51A,
  ModelInfo,
  PipelineStatus,
  Report51BDraft,
  RiskAssessment,
  ScreeningQueueItem,
  ScreeningScreenInItem,
  SectionId,
  SystemHealth,
  TranscriptSegment,
  RiskFramework,
  TriageConfig,
  TriageFlag,
  UserRole,
} from "./types";
import { getAccessToken, handleAuthFailure } from "../auth/session";
import { API_BASE, wsBaseUrl, wsCaseUrl } from "../config/paths";
import { TIMEOUT_MS } from "../config/timeouts";
import { ApiError } from "./errors";
import { fetchTimed, parseJsonResponse } from "./http";

export { wsBaseUrl, wsCaseUrl };
export { ApiError } from "./errors";

function timeoutForRequest(path: string, method: string): number {
  if (method === "POST" && (/\/audio$/.test(path) || path.includes("/field-memo/audio"))) return TIMEOUT_MS.upload;
  if (method === "POST" && path.includes("/assistant-messages")) return TIMEOUT_MS.ai;
  if (method === "POST" && path.includes("/report51b/")) return TIMEOUT_MS.ai;
  if (path.includes("/briefing")) return TIMEOUT_MS.ai;
  if (path.startsWith("/auth/")) return TIMEOUT_MS.auth;
  return TIMEOUT_MS.default;
}

/** Authenticated API calls — Bearer token from auth session; 401 clears session. */
async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new ApiError("Not authenticated", 401, "AUTH_REQUIRED");
  }

  const method = (init.method ?? "GET").toUpperCase();
  const timeoutMs = timeoutForRequest(path, method);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetchTimed(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);
  if (res.status === 401) {
    handleAuthFailure();
    throw new ApiError("Session expired or invalid", 401, "UNAUTHORIZED");
  }
  return parseJsonResponse<T>(res);
}

async function publicRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const timeoutMs = timeoutForRequest(path, method);
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetchTimed(`${API_BASE}${path}`, { ...init, headers }, timeoutMs);
  return parseJsonResponse<T>(res);
}

export const api = {
  login(username: string, password: string) {
    return publicRequest<{ accessToken: string; role: UserRole; displayName: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  },

  demoLogin(role: UserRole, displayName?: string) {
    return publicRequest<{ accessToken: string; role: UserRole }>("/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ role, displayName }),
    });
  },

  me() {
    return authRequest<{ userId: string; displayName: string; role: UserRole; areaOffice?: string }>(
      "/auth/me",
    );
  },

  listCases(status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return authRequest<{ items: CaseSummary[] }>(`/cases${q}`);
  },

  createCase(emergencyHint = false) {
    return authRequest<CaseSummary & { externalId?: string }>("/cases", {
      method: "POST",
      body: JSON.stringify({ emergencyHint }),
    });
  },

  getCase(caseId: string) {
    return authRequest<CaseSummary & { externalId?: string }>(`/cases/${caseId}`);
  },

  uploadAudio(caseId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return authRequest<PipelineStatus>(`/cases/${caseId}/audio`, {
      method: "POST",
      body: fd,
    });
  },

  getForm51a(caseId: string) {
    return authRequest<Form51A>(`/cases/${caseId}/form51a`);
  },

  patchForm51a(caseId: string, fields: { sectionId: SectionId; fieldId: string; value: string }[]) {
    return authRequest<Form51A>(`/cases/${caseId}/form51a`, {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    });
  },

  confirmSection(caseId: string, sectionId: SectionId) {
    return authRequest<Form51A>(`/cases/${caseId}/form51a/confirm-section`, {
      method: "POST",
      body: JSON.stringify({ sectionId }),
    });
  },

  completeCheckpoint(caseId: string) {
    return authRequest<{
      checkpointStatus: "complete";
      backgroundChecksStarted: boolean;
    }>(`/cases/${caseId}/form51a/complete-checkpoint`, {
      method: "POST",
      body: "{}",
    });
  },

  reextractForm51a(caseId: string) {
    return authRequest<{ ok: boolean; message: string }>(`/cases/${caseId}/form51a/reextract`, {
      method: "POST",
      body: "{}",
    });
  },

  openOfficialForm(caseId: string) {
    const token = getAccessToken();
    if (!token) throw new ApiError("Not authenticated", 401, "AUTH_REQUIRED");
    const url = `${API_BASE}/cases/${caseId}/form51a/official?access_token=${encodeURIComponent(token)}`;
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) throw new ApiError("Pop-up blocked — allow pop-ups to open the 51A form", 400, "POPUP_BLOCKED");
  },

  getTranscript(caseId: string) {
    return authRequest<{ segments: TranscriptSegment[] }>(`/cases/${caseId}/transcript`);
  },

  getRisk(caseId: string) {
    return authRequest<RiskAssessment>(`/cases/${caseId}/risk`);
  },

  getTriageFlags(caseId: string) {
    return authRequest<TriageFlag[]>(`/cases/${caseId}/triage-flags`);
  },

  triageDecision(
    caseId: string,
    flagId: string,
    action: "confirm" | "dismiss",
    dismissalReason?: string,
  ) {
    return authRequest<TriageFlag>(`/cases/${caseId}/triage-decisions`, {
      method: "POST",
      body: JSON.stringify({ flagId, action, dismissalReason }),
    });
  },

  getBackgroundChecks(caseId: string) {
    return authRequest<{ sources: BackgroundSource[]; summaryAvailable: boolean }>(
      `/cases/${caseId}/background-checks`,
    );
  },

  getAssistantMessages(caseId: string) {
    return authRequest<AssistantMessage[]>(`/cases/${caseId}/assistant-messages`);
  },

  postAssistantMessage(caseId: string, message: string) {
    return authRequest<AssistantMessage>(`/cases/${caseId}/assistant-messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  getPipeline(caseId: string) {
    return authRequest<PipelineStatus>(`/cases/${caseId}/pipeline`);
  },

  submitCase(caseId: string) {
    return authRequest<CaseSummary & { status: string; message?: string }>(`/cases/${caseId}/submit`, {
      method: "POST",
      body: "{}",
    });
  },

  screeningPending() {
    return authRequest<ScreeningQueueItem[]>("/screening/pending");
  },

  screeningScreenIn() {
    return authRequest<ScreeningScreenInItem[]>("/screening/screen-in");
  },

  screeningDecision(
    caseId: string,
    decision: "approve_screen_in" | "screen_out" | "request_clarification",
    rationale?: string,
  ) {
    return authRequest(`/screening/${caseId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, rationale }),
    });
  },

  getBriefing(caseId: string) {
    return authRequest<Briefing>(`/cases/${caseId}/briefing`);
  },

  markBriefingOpened(caseId: string) {
    return authRequest<{ ok: boolean; briefingOpenedAt: string | null }>(
      `/cases/${caseId}/briefing/opened`,
      { method: "POST", body: JSON.stringify({}) },
    );
  },

  getFieldNotes(caseId: string) {
    return authRequest<FieldNotesResponse>(`/cases/${caseId}/field-notes`);
  },

  uploadFieldMemoAudio(caseId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return authRequest<{ fieldMemoStatus: string; audioKey: string; message: string }>(
      `/cases/${caseId}/field-memo/audio`,
      { method: "POST", body: fd },
    );
  },

  saveFieldNotes(caseId: string, text: string) {
    return authRequest<{ ok: boolean }>(`/cases/${caseId}/field-notes`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  generateReport51b(caseId: string, fieldNotes: string) {
    return authRequest<Report51BDraft>(`/cases/${caseId}/report51b/draft`, {
      method: "POST",
      body: JSON.stringify({ fieldNotes }),
    });
  },

  getReport51bDraft(caseId: string) {
    return authRequest<Report51BDraft>(`/cases/${caseId}/report51b/draft`);
  },

  approveReport51b(caseId: string, editedContent: string) {
    return authRequest<{ ok: boolean }>(`/cases/${caseId}/report51b/approve`, {
      method: "POST",
      body: JSON.stringify({ approved: true, editedContent }),
    });
  },

  complianceCheck51b(caseId: string, content: string) {
    return authRequest<ComplianceResult>(`/cases/${caseId}/report51b/compliance-check`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  getCaseAudit(caseId: string) {
    return authRequest<AuditEvent[]>(`/audit/cases/${caseId}`);
  },

  adminHealth() {
    return authRequest<SystemHealth>("/admin/health");
  },

  adminModels() {
    return authRequest<ModelInfo[]>("/admin/models");
  },

  getTriageConfig() {
    return authRequest<{ config: TriageConfig; defaults: TriageConfig }>("/admin/triage-config");
  },

  saveTriageConfig(config: TriageConfig) {
    return authRequest<{ config: TriageConfig }>("/admin/triage-config", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },

  getRiskFramework() {
    return authRequest<{ config: RiskFramework; defaults: RiskFramework }>("/admin/risk-framework");
  },

  saveRiskFramework(config: RiskFramework) {
    return authRequest<{ config: RiskFramework }>("/admin/risk-framework", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  },
};
