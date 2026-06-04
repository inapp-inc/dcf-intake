import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { C } from "../../theme/tokens";
import { EmergBadge, PulseCircle, RiskBadge } from "../../components/atoms";
import { StatGrid } from "../../components/ui/StatGrid";
import { formatCaseTitle, formatTimeAgo } from "../../utils/format";
import type { ScreeningQueueItem } from "../../api/types";

export function SupervisorDashboard({
  expanded,
  setExpanded,
  onAudit,
  onQueueLoaded,
}: {
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onAudit?: (caseId: string) => void;
  onQueueLoaded?: (count: number) => void;
}) {
  const { token } = useAuth();
  const [queue, setQueue] = useState<ScreeningQueueItem[]>([]);
  const [rationale, setRationale] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    api
      .screeningPending(token)
      .then((q) => {
        setQueue(q);
        onQueueLoaded?.(q.length);
      })
      .catch(() => {
        setQueue([]);
        onQueueLoaded?.(0);
      });
  };

  useEffect(load, [token]);

  const decide = async (
    caseId: string,
    decision: "approve_screen_in" | "screen_out" | "request_clarification",
  ) => {
    if (!token) return;
    await api.screeningDecision(token, caseId, decision, rationale[caseId]);
    setMsg(`Decision recorded for ${formatCaseTitle(queue.find((c) => c.caseId === caseId)?.externalId)}`);
    load();
    setExpanded(null);
  };

  const avgRisk = queue.length
    ? (queue.reduce((a, c) => a + c.riskScore, 0) / queue.length).toFixed(1)
    : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-up">
      {msg && (
        <div className="card" style={{ padding: 12, background: C.greenPale, color: C.green, fontSize: 13 }}>
          {msg}
        </div>
      )}
      <StatGrid
        items={[
          { label: "Pending Your Review", val: String(queue.length), clr: C.coral },
          { label: "Team Active Cases", val: String(queue.length + 9), clr: C.navy },
          { label: "Avg Risk Score Today", val: avgRisk, clr: C.amber },
          { label: "SLA Compliance", val: "96%", clr: C.green },
        ]}
      />
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">Cases Pending Your Review</div>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -8 }}>
          AI pre-meeting summaries are ready. Review, then approve or request clarification before the daily meeting.
        </p>
        {queue.length === 0 && (
          <p style={{ color: C.textLight, fontSize: 13 }}>No cases in pending_review — submit a case as screener first.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {queue.map((c) => (
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
                <div className="fade-in" style={{ padding: "0 15px 15px", background: C.white, borderTop: `1px solid ${C.border}` }}>
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
                          }}
                        >
                          {c.aiRecommendation}
                        </p>
                        <p style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
                          Advisory only. Supervisor retains full determination authority.
                        </p>
                      </div>
                    </div>
                  </div>
                  <textarea
                    className="dcf-input dcf-ta"
                    style={{ marginTop: 13, marginBottom: 10, minHeight: 56 }}
                    placeholder="Rationale (optional for approve)…"
                    value={rationale[c.caseId] ?? ""}
                    onChange={(e) => setRationale((p) => ({ ...p, [c.caseId]: e.target.value }))}
                  />
                  <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="dcf-btn"
                      style={{ background: C.green, color: "#fff" }}
                      onClick={() => void decide(c.caseId, "approve_screen_in")}
                    >
                      Approve — Screen In
                    </button>
                    <button
                      type="button"
                      className="dcf-btn"
                      style={{ background: C.navy, color: "#fff" }}
                      onClick={() => void decide(c.caseId, "screen_out")}
                    >
                      Screen Out
                    </button>
                    <button type="button" className="dcf-btn ghost-btn" onClick={() => void decide(c.caseId, "request_clarification")}>
                      Request Clarification
                    </button>
                    {onAudit && (
                      <button type="button" className="dcf-btn ghost-btn" style={{ marginLeft: "auto" }} onClick={() => onAudit(c.caseId)}>
                        Full Case View →
                      </button>
                    )}
                    <button
                      type="button"
                      className="dcf-btn ghost-btn"
                      onClick={() => token && api.openOfficialForm(token, c.caseId)}
                    >
                      View 51A
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
