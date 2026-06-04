import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { C } from "../theme/tokens";
import { Chip, EmergBadge, PulseCircle, RiskBadge } from "../components/atoms";
import { StatGrid } from "../components/ui/StatGrid";
import { formatCaseTitle, formatStatus, formatTimeAgo } from "../utils/format";
import type { CaseSummary } from "../api/types";

export function ScreenerDashboard({
  onNewIntake,
  onOpenCase,
}: {
  onNewIntake: () => void;
  onOpenCase: (id: string) => void;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .listCases(token)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  const emergencyCount = items.filter((c) => c.emergency).length;
  const inProgress = items.filter((c) => c.status === "in_progress").length;
  const bgPending = items.filter(
    (c) => c.status === "in_progress" && c.form51aCheckpointStatus !== "complete",
  ).length;
  const completed = items.filter((c) => c.status === "pending_review" || c.form51aCheckpointStatus === "complete").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="fade-up">
      <StatGrid
        items={[
          { label: "Reports Today", val: String(items.length), sub: "Active queue from API", clr: C.navy },
          { label: "Emergency Active", val: String(emergencyCount), sub: "2-hour response required", clr: C.coral },
          { label: "Pending BG Checks", val: String(bgPending), sub: "Intakes in progress", clr: C.amber },
          { label: "Completed Today", val: String(completed), sub: inProgress ? `${inProgress} in progress` : "All within SLA", clr: C.green },
        ]}
      />
      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div className="sec-title" style={{ margin: 0 }}>
            Active Case Queue
          </div>
          <button type="button" className="dcf-btn" style={{ background: C.teal, color: "#fff" }} onClick={onNewIntake}>
            + New 51A Intake
          </button>
        </div>
        {loading && <p style={{ color: C.textLight, fontSize: 13 }}>Loading cases…</p>}
        {!loading && items.length === 0 && (
          <p style={{ color: C.textLight, fontSize: 13 }}>No cases yet. Start a new 51A intake.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
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
              }}
            >
              {c.emergency && <PulseCircle color={C.coral} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{c.childDisplay ?? "New case"}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>
                  {formatCaseTitle(c.externalId)} · {formatTimeAgo(c.updatedAt)} ago
                </div>
              </div>
              {c.riskScore != null && <RiskBadge score={c.riskScore} />}
              {c.emergency && <EmergBadge />}
              <Chip color={C.textMid} bg={C.bg}>
                {formatStatus(c.status)}
              </Chip>
              <button
                type="button"
                className="dcf-btn"
                style={{ background: C.navy, color: "#fff", fontSize: 12, padding: "6px 13px" }}
                onClick={() => onOpenCase(c.caseId)}
              >
                Open →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
