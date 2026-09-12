import { useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { EmergBadge, PulseCircle, RiskBadge } from "../../components/atoms";
import { StatGrid } from "../../components/ui/StatGrid";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { formatCaseTitle, formatTimeAgo } from "../../utils/format";
import type { ScreeningQueueItem } from "../../api/types";

const EMPTY_QUEUE: ScreeningQueueItem[] = [];

type ScreeningDecision = "approve_screen_in" | "screen_out" | "request_clarification";
type SupervisorView = "dashboard" | "review" | "summaries";

export function SupervisorDashboard({
  view,
  expanded,
  setExpanded,
  onAudit,
  onViewCase,
  onQueueLoaded,
  onDrill,
  emergencyOnly = false,
}: {
  view: SupervisorView;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onAudit?: (caseId: string) => void;
  onViewCase?: (caseId: string) => void;
  onQueueLoaded?: (count: number) => void;
  onDrill?: (page: string, caseId?: string, options?: import("../../utils/navOptions").NavOptions) => void;
  emergencyOnly?: boolean;
}) {
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const { data, loading, reload } = useApiQuery(
    () => api.screeningPending().catch(() => EMPTY_QUEUE),
    [],
    {
      initialData: EMPTY_QUEUE,
      keepPreviousData: true,
      onSuccess: (q) => onQueueLoaded?.(q.length),
    },
  );

  const queue = data ?? EMPTY_QUEUE;
  const displayQueue = emergencyOnly ? queue.filter((c) => c.emergency) : queue;
  const emergencyCount = queue.filter((c) => c.emergency).length;
  const avgRisk = queue.length
    ? (queue.reduce((a, c) => a + c.riskScore, 0) / queue.length).toFixed(1)
    : "—";

  const { run: runDecision } = useAsyncAction(
    async (caseId: string, decision: ScreeningDecision, note?: string) => {
      await api.screeningDecision(caseId, decision, note);
    },
  );

  const decide = async (caseId: string, decision: ScreeningDecision) => {
    setDecidingId(caseId);
    try {
      await runDecision(caseId, decision, rationale[caseId]);
      setMsg(`Decision recorded for ${formatCaseTitle(queue.find((c) => c.caseId === caseId)?.externalId)}`);
      await reload();
      setExpanded(null);
    } finally {
      setDecidingId(null);
    }
  };

  if (view === "dashboard") {
    return (
      <PageShell>
        <StatGrid
          items={[
            {
              label: "Pending Your Review",
              val: String(queue.length),
              clr: C.coral,
              onClick: () => onDrill?.("review"),
            },
            {
              label: "Emergency in Queue",
              val: String(emergencyCount),
              clr: C.coral,
              onClick: () => onDrill?.("review", undefined, { supervisorEmergencyOnly: true }),
            },
            {
              label: "Avg Risk Score (Queue)",
              val: avgRisk,
              clr: C.amber,
              onClick: () => onDrill?.("review"),
            },
            {
              label: "Field screening",
              val: "View",
              sub: "Track Field Report progress",
              clr: C.navy,
              onClick: () => onDrill?.("screening"),
            },
          ]}
        />
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="sec-title">Team Overview</div>
          <p style={{ fontSize: 12, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
            Springfield area office — use <strong>Pending Review</strong> to approve or screen out submitted Initial Reports.
          </p>
          <QueryState loading={loading} loadingMessage="Loading team metrics…" minHeight={80}>
            {queue.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textLight }}>
                No cases awaiting supervisor action. Submit a case as screener to populate the queue.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12, color: C.textMid, marginBottom: 4 }}>
                  {queue.length} case{queue.length === 1 ? "" : "s"} need review · {emergencyCount} emergency
                </p>
                {queue.slice(0, 5).map((c) => (
                  <div
                    key={c.caseId}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: c.emergency ? C.coralPale : C.bg,
                      border: `1px solid ${C.border}`,
                      cursor: "pointer",
                    }}
                    onClick={() => onDrill?.("review")}
                    onKeyDown={(e) => e.key === "Enter" && onDrill?.("review")}
                  >
                    {c.emergency && <PulseCircle color={C.coral} />}
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: C.textDark }}>
                      {c.childDisplay} — {formatCaseTitle(c.externalId)}
                    </div>
                    <RiskBadge score={c.riskScore} />
                  </div>
                ))}
                {queue.length > 5 && (
                  <p style={{ fontSize: 11, color: C.textLight }}>+ {queue.length - 5} more in Pending Review</p>
                )}
              </div>
            )}
          </QueryState>
        </div>
      </PageShell>
    );
  }

  if (view === "summaries") {
    return (
      <PageShell>
        <div className="card" style={{ padding: "16px 18px" }}>
          <div className="sec-title">Case Summaries</div>
          <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
            AI pre-meeting summaries for cases pending your review. Decisions are made from Pending Review.
          </p>
          <QueryState
            loading={loading}
            loadingMessage="Loading summaries…"
            empty={
              !loading && displayQueue.length === 0 ? (
                <p style={{ color: C.textLight, fontSize: 13 }}>No summaries — queue is empty.</p>
              ) : undefined
            }
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {displayQueue.map((c) => (
                <div
                  key={c.caseId}
                  className="card"
                  style={{
                    padding: "14px 16px",
                    border: `1px solid ${c.emergency ? `${C.coral}44` : C.border}`,
                    background: c.emergency ? C.coralPale : C.white,
                    cursor: "pointer",
                  }}
                  onClick={() => setExpanded(c.caseId)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.textDark }}>
                      {c.childDisplay} — {formatCaseTitle(c.externalId)}
                    </div>
                    <RiskBadge score={c.riskScore} />
                    {c.emergency && <EmergBadge />}
                  </div>
                  <p style={{ fontSize: 11, color: C.textLight, marginBottom: 8 }}>
                    {c.screenerName} · {formatTimeAgo(c.submittedAt)} ago
                  </p>
                  <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.65 }}>{c.aiSummary}</p>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: c.emergency ? C.coral : C.amber,
                      marginTop: 10,
                      lineHeight: 1.5,
                    }}
                  >
                    {c.aiRecommendation}
                  </p>
                </div>
              ))}
            </div>
          </QueryState>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {msg && (
        <div className="card" style={{ padding: 12, background: C.greenPale, color: C.green, fontSize: 13 }}>
          {msg}
        </div>
      )}
      <StatGrid
        items={[
          {
            label: "Awaiting Decision",
            val: String(queue.length),
            clr: C.coral,
            onClick: () => onDrill?.("review", undefined, { supervisorEmergencyOnly: false }),
          },
          {
            label: "Emergency",
            val: String(emergencyCount),
            clr: C.coral,
            onClick: () => onDrill?.("review", undefined, { supervisorEmergencyOnly: true }),
          },
          {
            label: "Avg Risk Score",
            val: avgRisk,
            clr: C.amber,
            onClick: () => onDrill?.("review"),
          },
          {
            label: "Field screening",
            val: "View",
            sub: "Field Report tracking",
            clr: C.navy,
            onClick: () => onDrill?.("screening"),
          },
        ]}
      />
      {emergencyOnly && (
        <div className="card" style={{ padding: "10px 14px", background: C.coralPale, fontSize: 12, color: C.coral }}>
          Showing emergency cases only.{" "}
          <button
            type="button"
            className="app-btn ghost-btn"
            style={{ fontSize: 11, marginLeft: 8 }}
            onClick={() => onDrill?.("review", undefined, { supervisorEmergencyOnly: false })}
          >
            Show all
          </button>
        </div>
      )}
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">Cases Pending Your Review</div>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -8 }}>
          AI pre-meeting summaries are ready. Review, then approve or request clarification before the daily meeting.
        </p>
        <QueryState
          loading={loading}
          loadingMessage="Loading review queue…"
          loadingHint="AI summaries load from the demo API."
          empty={
            !loading && displayQueue.length === 0 ? (
              <p style={{ color: C.textLight, fontSize: 13 }}>
                No cases in pending_review — submit a case as screener first.
              </p>
            ) : undefined
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {displayQueue.map((c) => (
              <div
                key={c.caseId}
                style={{
                  border: `1px solid ${c.emergency ? `${C.coral}44` : C.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "13px 15px",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    cursor: "pointer",
                    background: c.emergency ? C.coralPale : C.white,
                  }}
                  onClick={() => setExpanded(expanded === c.caseId ? null : c.caseId)}
                >
                  {c.emergency && <PulseCircle color={C.coral} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>
                      {c.childDisplay} — {formatCaseTitle(c.externalId)}
                    </div>
                    <div style={{ fontSize: 11, color: C.textLight }}>
                      Screener: {c.screenerName} · Submitted {formatTimeAgo(c.submittedAt)} ago ·{" "}
                      {c.triageFlagCount ?? 0} triage flags
                    </div>
                  </div>
                  <RiskBadge score={c.riskScore} />
                  {c.emergency && <EmergBadge />}
                  <span style={{ color: C.textLight, fontSize: 12 }}>{expanded === c.caseId ? "▲" : "▼"}</span>
                </div>
                {expanded === c.caseId && (
                  <div
                    className="fade-in"
                    style={{ padding: "0 15px 15px", background: C.white, borderTop: `1px solid ${C.border}` }}
                  >
                    <div style={{ marginTop: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.textLight,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          AI Case Summary
                        </div>
                        <div
                          style={{
                            background: C.tealPale,
                            border: `1px solid ${C.teal}22`,
                            borderRadius: 10,
                            padding: "11px 13px",
                          }}
                        >
                          <p style={{ fontSize: 12, color: C.textMid, lineHeight: 1.7 }}>{c.aiSummary}</p>
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: C.textLight,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                            marginBottom: 6,
                          }}
                        >
                          AI Recommendation
                        </div>
                        <div
                          style={{
                            background: c.emergency ? C.coralPale : C.amberPale,
                            border: `1px solid ${(c.emergency ? C.coral : C.amber)}22`,
                            borderRadius: 10,
                            padding: "11px 13px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: c.emergency ? C.coral : C.amber,
                              lineHeight: 1.7,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {c.aiRecommendation}
                          </p>
                          {c.triageFlags && c.triageFlags.length > 0 && (
                            <div style={{ marginTop: 12 }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: C.textLight,
                                  textTransform: "uppercase",
                                  marginBottom: 6,
                                }}
                              >
                                Triage indicators
                              </div>
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: C.textMid }}>
                                {c.triageFlags.map((f) => (
                                  <li key={f.id} style={{ marginBottom: 4 }}>
                                    <strong>{f.label}</strong>
                                    {f.evidence ? ` — ${f.evidence}` : ""}{" "}
                                    <span style={{ color: f.severity === "critical" ? C.coral : C.amber }}>
                                      [{f.severity}]
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
                            Advisory only. Supervisor retains full determination authority.
                          </p>
                        </div>
                      </div>
                    </div>
                    <textarea
                      className="app-input app-ta"
                      style={{ marginTop: 13, marginBottom: 10, minHeight: 56 }}
                      placeholder="Rationale (optional for approve)…"
                      value={rationale[c.caseId] ?? ""}
                      onChange={(e) => setRationale((p) => ({ ...p, [c.caseId]: e.target.value }))}
                    />
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="app-btn"
                        style={{ background: C.green, color: "#fff" }}
                        disabled={decidingId === c.caseId}
                        onClick={() => void decide(c.caseId, "approve_screen_in")}
                      >
                        {decidingId === c.caseId ? <LoadingSpinner size={14} color="#fff" /> : null}
                        Approve — Screen In
                      </button>
                      <button
                        type="button"
                        className="app-btn"
                        style={{ background: C.navy, color: "#fff" }}
                        disabled={decidingId === c.caseId}
                        onClick={() => void decide(c.caseId, "screen_out")}
                      >
                        Screen Out
                      </button>
                      <button
                        type="button"
                        className="app-btn ghost-btn"
                        disabled={decidingId === c.caseId}
                        onClick={() => void decide(c.caseId, "request_clarification")}
                      >
                        Request Clarification
                      </button>
                      {onViewCase && (
                        <button
                          type="button"
                          className="app-btn"
                          style={{ background: C.navy, color: "#fff" }}
                          onClick={() => onViewCase(c.caseId)}
                        >
                          Full case record →
                        </button>
                      )}
                      {onAudit && (
                        <button type="button" className="app-btn ghost-btn" onClick={() => onAudit(c.caseId)}>
                          Audit trail
                        </button>
                      )}
                      <button
                        type="button"
                        className="app-btn ghost-btn"
                        onClick={() => void api.openOfficialForm(c.caseId)}
                      >
                        View Initial Report
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
