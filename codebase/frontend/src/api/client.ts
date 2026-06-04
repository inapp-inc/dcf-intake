import type {
  AssistantMessage,
  AuditEvent,
  BackgroundSource,
  Briefing,
  CaseSummary,
  ComplianceResult,
  Form51A,
  ModelInfo,
  PipelineStatus,
  Report51BDraft,
  RiskAssessment,
  ScreeningQueueItem,
  SectionId,
  SystemHealth,
  TranscriptSegment,
  TriageFlag,
  UserRole,
} from "./types";
import { API_BASE, wsBaseUrl, wsCaseUrl } from "../config/paths";

export { wsBaseUrl, wsCaseUrl };

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined;
    }
    const code = (body as { code?: string })?.code;
    const message = (body as { message?: string })?.message ?? res.statusText;
    throw new ApiError(message, res.status, code, body);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  demoLogin(role: UserRole, displayName?: string) {
    return request<{ accessToken: string; role: UserRole }>("/auth/demo-login", "", {
      method: "POST",
      body: JSON.stringify({ role, displayName }),
    });
  },

  me(token: string) {
    return request<{ userId: string; displayName: string; role: UserRole }>("/auth/me", token);
  },

  listCases(token: string, status?: string) {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ items: CaseSummary[] }>(`/cases${q}`, token);
  },

  createCase(token: string, emergencyHint = false) {
    return request<CaseSummary & { externalId?: string }>("/cases", token, {
      method: "POST",
      body: JSON.stringify({ emergencyHint }),
    });
  },

  getCase(token: string, caseId: string) {
    return request<CaseSummary & { externalId?: string }>(`/cases/${caseId}`, token);
  },

  uploadAudio(token: string, caseId: string, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    return request<PipelineStatus>(`/cases/${caseId}/audio`, token, {
      method: "POST",
      body: fd,
    });
  },

  getForm51a(token: string, caseId: string) {
    return request<Form51A>(`/cases/${caseId}/form51a`, token);
  },

  patchForm51a(
    token: string,
    caseId: string,
    fields: { sectionId: SectionId; fieldId: string; value: string }[],
  ) {
    return request<Form51A>(`/cases/${caseId}/form51a`, token, {
      method: "PATCH",
      body: JSON.stringify({ fields }),
    });
  },

  confirmSection(token: string, caseId: string, sectionId: SectionId) {
    return request<Form51A>(`/cases/${caseId}/form51a/confirm-section`, token, {
      method: "POST",
      body: JSON.stringify({ sectionId }),
    });
  },

  completeCheckpoint(token: string, caseId: string) {
    return request<{
      checkpointStatus: "complete";
      backgroundChecksStarted: boolean;
    }>(`/cases/${caseId}/form51a/complete-checkpoint`, token, {
      method: "POST",
      body: "{}",
    });
  },

  async openOfficialForm(token: string, caseId: string) {
    const res = await fetch(`${API_BASE}/cases/${caseId}/form51a/official`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new ApiError("Could not load official form", res.status);
    const html = await res.text();
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  },

  getTranscript(token: string, caseId: string) {
    return request<{ segments: TranscriptSegment[] }>(`/cases/${caseId}/transcript`, token);
  },

  getRisk(token: string, caseId: string) {
    return request<RiskAssessment>(`/cases/${caseId}/risk`, token);
  },

  getTriageFlags(token: string, caseId: string) {
    return request<TriageFlag[]>(`/cases/${caseId}/triage-flags`, token);
  },

  triageDecision(
    token: string,
    caseId: string,
    flagId: string,
    action: "confirm" | "dismiss",
    dismissalReason?: string,
  ) {
    return request<TriageFlag>(`/cases/${caseId}/triage-decisions`, token, {
      method: "POST",
      body: JSON.stringify({ flagId, action, dismissalReason }),
    });
  },

  getBackgroundChecks(token: string, caseId: string) {
    return request<{ sources: BackgroundSource[]; summaryAvailable: boolean }>(
      `/cases/${caseId}/background-checks`,
      token,
    );
  },

  getAssistantMessages(token: string, caseId: string) {
    return request<AssistantMessage[]>(`/cases/${caseId}/assistant-messages`, token);
  },

  postAssistantMessage(token: string, caseId: string, message: string) {
    return request<AssistantMessage>(`/cases/${caseId}/assistant-messages`, token, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  getPipeline(token: string, caseId: string) {
    return request<PipelineStatus>(`/cases/${caseId}/pipeline`, token);
  },

  submitCase(token: string, caseId: string) {
    return request<CaseSummary & { status: string; message?: string }>(`/cases/${caseId}/submit`, token, {
      method: "POST",
      body: "{}",
    });
  },

  screeningPending(token: string) {
    return request<ScreeningQueueItem[]>("/screening/pending", token);
  },

  screeningDecision(
    token: string,
    caseId: string,
    decision: "approve_screen_in" | "screen_out" | "request_clarification",
    rationale?: string,
  ) {
    return request(`/screening/${caseId}/decision`, token, {
      method: "POST",
      body: JSON.stringify({ decision, rationale }),
    });
  },

  getBriefing(token: string, caseId: string) {
    return request<Briefing>(`/cases/${caseId}/briefing`, token);
  },

  saveFieldNotes(token: string, caseId: string, text: string) {
    return request<{ ok: boolean }>(`/cases/${caseId}/field-notes`, token, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  generateReport51b(token: string, caseId: string, fieldNotes: string) {
    return request<Report51BDraft>(`/cases/${caseId}/report51b/draft`, token, {
      method: "POST",
      body: JSON.stringify({ fieldNotes }),
    });
  },

  getReport51bDraft(token: string, caseId: string) {
    return request<Report51BDraft>(`/cases/${caseId}/report51b/draft`, token);
  },

  approveReport51b(token: string, caseId: string, editedContent: string) {
    return request<{ ok: boolean }>(`/cases/${caseId}/report51b/approve`, token, {
      method: "POST",
      body: JSON.stringify({ approved: true, editedContent }),
    });
  },

  complianceCheck51b(token: string, caseId: string, content: string) {
    return request<ComplianceResult>(`/cases/${caseId}/report51b/compliance-check`, token, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },

  getCaseAudit(token: string, caseId: string) {
    return request<AuditEvent[]>(`/audit/cases/${caseId}`, token);
  },

  adminHealth(token: string) {
    return request<SystemHealth>("/admin/health", token);
  },

  adminModels(token: string) {
    return request<ModelInfo[]>("/admin/models", token);
  },
};
