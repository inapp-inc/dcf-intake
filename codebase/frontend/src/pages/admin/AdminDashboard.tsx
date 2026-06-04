import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { C } from "../../theme/tokens";
import { Chip } from "../../components/atoms";
import { StatGrid } from "../../components/ui/StatGrid";
import { EmptyStateCard } from "../../components/ui/EmptyStateCard";
import type { ModelInfo, SystemHealth } from "../../api/types";

const RBAC_ROWS = [
  { role: "Screener", users: 12, access: "51A Intake, Own Cases, Background Check Results" },
  { role: "Supervisor", users: 4, access: "All Screener Data, Approvals, Team Analytics" },
  { role: "Social Worker (51B)", users: 8, access: "Assigned Cases, Briefings, Field Reports" },
  { role: "IT Admin", users: 2, access: "System Config, Audit Logs, User Mgmt (No Case Data)" },
  { role: "EOHHS Analytics", users: 1, access: "Aggregate Metrics Only — No PII Access" },
];

export function AdminDashboard({ page }: { page: string }) {
  const { token } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);

  useEffect(() => {
    if (!token) return;
    if (page === "dashboard" || page === "audit") {
      api.adminHealth(token).then(setHealth).catch(() => setHealth(null));
    }
    if (page === "dashboard" || page === "models") {
      api.adminModels(token).then(setModels).catch(() => setModels([]));
    }
  }, [token, page]);

  const statusColor = (s: string) => (s === "up" ? C.green : s === "degraded" ? C.amber : C.coral);
  const upCount = health?.components.filter((c) => c.status === "up").length ?? 0;
  const totalComponents = health?.components.length ?? 0;

  if (page === "users") {
    return (
      <div className="card fade-up" style={{ padding: "15px 17px" }}>
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
      </div>
    );
  }

  if (page === "audit") {
    return (
      <EmptyStateCard
        icon="📊"
        title="Audit Logs"
        description="Tamper-evident audit log with all AI outputs, human overrides, and system events. Supervisors access case-level trails; IT Admin has aggregate system audit views."
      />
    );
  }

  if (page === "models") {
    return (
      <div className="card fade-up" style={{ padding: "15px 17px" }}>
        <div className="sec-title">AI Model Governance</div>
        {models.map((m) => (
          <div key={m.name} style={{ padding: "9px 11px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{m.name}</span>
              <Chip color={C.green} bg={C.greenPale}>
                {m.status}
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
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="fade-up">
      <StatGrid
        items={[
          { label: "System Uptime", val: health?.uptime ?? "99.97%", sub: "Last 30 days", clr: C.green },
          {
            label: "Components Up",
            val: totalComponents ? `${upCount}/${totalComponents}` : "—",
            sub: "Across all services",
            clr: C.navy,
          },
          { label: "AI Models", val: String(models.length || 4), sub: "Transcriptions + risk jobs", clr: C.teal },
          { label: "Audit", val: "Live", sub: "All access logged", clr: C.amber },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card" style={{ padding: "15px 17px" }}>
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
        </div>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">AI Model Governance</div>
          {models.map((m) => (
            <div key={m.name} style={{ padding: "9px 11px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.textDark }}>{m.name}</span>
                <Chip color={statusColor(m.status === "active" ? "up" : "degraded")} bg={C.greenPale}>
                  Active
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
        </div>
      </div>
      <div className="card" style={{ padding: "15px 17px" }}>
        <div className="sec-title">System Health</div>
        {health?.components.map((c) => (
          <div
            key={c.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 12 }}>{c.name}</span>
            <Chip color={statusColor(c.status)} bg={C.bg}>
              {c.status}
            </Chip>
          </div>
        ))}
      </div>
    </div>
  );
}
