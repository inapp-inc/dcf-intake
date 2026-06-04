import { C } from "../../theme/tokens";
import { Chip } from "../../components/atoms";
import type { ModelInfo } from "../../api/types";

export const RBAC_ROWS = [
  { role: "Screener", users: 12, access: "51A Intake, Own Cases, Background Check Results" },
  { role: "Supervisor", users: 4, access: "All Screener Data, Approvals, Team Analytics" },
  { role: "Social Worker (51B)", users: 8, access: "Assigned Cases, Briefings, Field Reports" },
  { role: "DCF Admin", users: 2, access: "Triage keywords, Audit Logs, User Mgmt (No Case Data)" },
  { role: "EOHHS Analytics", users: 1, access: "Aggregate Metrics Only — No PII Access" },
];

export function RbacPanel() {
  return (
    <>
      <div className="sec-title">RBAC — Role Definitions</div>
      {RBAC_ROWS.map((r) => (
        <div key={r.role} style={{ padding: "9px 11px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{r.role}</span>
            <Chip color={C.teal} bg={C.tealPale}>
              {r.users} users
            </Chip>
          </div>
          <div style={{ fontSize: 10, color: C.textLight }}>{r.access}</div>
        </div>
      ))}
    </>
  );
}

export function ModelsPanel({
  models,
  statusColor,
}: {
  models: ModelInfo[];
  statusColor: (s: string) => string;
}) {
  return (
    <>
      <div className="sec-title">AI Model Governance</div>
      {models.map((m) => (
        <div key={m.name} style={{ padding: "9px 11px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{m.name}</span>
            <Chip color={statusColor(m.status === "active" ? "up" : "degraded")} bg={C.greenPale}>
              {m.status === "active" ? "Active" : m.status}
            </Chip>
          </div>
          <div style={{ fontSize: 10, color: C.textLight }}>
            {m.version} · {m.metric}
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: 9,
          padding: "9px 11px",
          background: C.amberPale,
          borderRadius: 8,
          fontSize: 11,
          color: C.amber,
          fontWeight: 600,
        }}
      >
        ⏰ Next quarterly bias audit due: Jun 30, 2026
      </div>
    </>
  );
}
