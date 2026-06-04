import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { C } from "../../theme/tokens";
import { EmergBadge, PulseCircle, RiskBadge } from "../../components/atoms";
import { StatGrid } from "../../components/ui/StatGrid";
import { formatCaseTitle, formatStatus } from "../../utils/format";
import type { CaseSummary } from "../../api/types";

export function WorkerDashboard({
  onBriefing,
  onReport,
}: {
  onBriefing: (caseId: string) => void;
  onReport: (caseId: string) => void;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<CaseSummary[]>([]);

  useEffect(() => {
    if (!token) return;
    api.listCases(token).then((r) => setItems(r.items)).catch(() => setItems([]));
  }, [token]);

  const emergency = items.filter((c) => c.emergency).length;
  const reportsPending = items.filter((c) => c.status === "assigned").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-up">
      <StatGrid
        columns={3}
        items={[
          { label: "Assigned Cases", val: String(items.length), clr: C.navy },
          { label: "Emergency Responses", val: String(emergency), clr: C.coral },
          { label: "Reports Pending", val: String(reportsPending), clr: C.amber },
        ]}
      />
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">My Assigned Cases</div>
        {items.length === 0 && (
          <p style={{ fontSize: 13, color: C.textLight }}>
            No assigned cases — supervisor must approve screen-in first.
          </p>
        )}
        {items.map((c) => (
          <div
            key={c.caseId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 13px",
              borderRadius: 10,
              background: c.emergency ? C.coralPale : C.bg,
              border: `1px solid ${c.emergency ? `${C.coral}33` : C.border}`,
              marginBottom: 9,
            }}
          >
            {c.emergency && <PulseCircle color={C.coral} />}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{c.childDisplay ?? "Case"}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>
                {formatCaseTitle(c.externalId)} · Status: {formatStatus(c.status)}
              </div>
            </div>
            {c.riskScore != null && <RiskBadge score={c.riskScore} />}
            {c.emergency && <EmergBadge />}
            <button
              type="button"
              className="dcf-btn"
              style={{ background: C.teal, color: "#fff", fontSize: 12 }}
              onClick={() => onBriefing(c.caseId)}
            >
              View Briefing →
            </button>
            <button
              type="button"
              className="dcf-btn"
              style={{ background: C.navy, color: "#fff", fontSize: 12 }}
              onClick={() => onReport(c.caseId)}
            >
              Write Report →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
