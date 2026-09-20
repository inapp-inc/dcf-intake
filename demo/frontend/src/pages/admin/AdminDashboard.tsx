import { useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { Chip } from "../../components/atoms";
import { StatGrid } from "../../components/ui/StatGrid";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { ModelsPanel, RbacPanel } from "./AdminPanels";
import { AdminAuditLogs } from "./AdminAuditLogs";
import type { ModelInfo } from "../../api/types";

const EMPTY_MODELS: ModelInfo[] = [];
const statusColor = (s: string) => (s === "up" ? C.green : s === "degraded" ? C.amber : C.coral);

export function AdminDashboard({
  page,
  onDrill,
}: {
  page: string;
  onDrill?: (page: string, caseId?: string) => void;
}) {
  const wantHealth = page === "dashboard" || page === "audit";
  const wantModels = page === "dashboard" || page === "models";

  const { data: health, loading: healthLoading } = useApiQuery(
    () => api.adminHealth(),
    [page],
    { enabled: wantHealth },
  );

  const { data: models } = useApiQuery(
    () => api.adminModels().catch(() => EMPTY_MODELS),
    [page],
    { enabled: wantModels, initialData: EMPTY_MODELS, keepPreviousData: true },
  );

  const modelList = models ?? EMPTY_MODELS;
  const components = health?.components ?? [];
  const upCount = components.filter((c) => c.status === "up").length;
  const totalComponents = components.length;
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const { run: runReset, pending: resetting } = useAsyncAction(() => api.demoReset());

  if (page === "users") {
    return (
      <div className="card fade-up" style={{ padding: "15px 17px" }}>
        <RbacPanel />
      </div>
    );
  }

  if (page === "audit") {
    return <AdminAuditLogs />;
  }

  if (page === "models") {
    return (
      <div className="card fade-up" style={{ padding: "15px 17px" }}>
        <ModelsPanel models={modelList} statusColor={statusColor} />
      </div>
    );
  }

  return (
    <QueryState loading={healthLoading && page === "dashboard"} loadingMessage="Loading system health…" minHeight={200}>
      <PageShell style={{ gap: 14 }}>
        <StatGrid
          items={[
            {
              label: "System Uptime",
              val: health?.uptime ?? "99.97%",
              sub: "Last 30 days",
              clr: C.green,
              onClick: () => onDrill?.("dashboard"),
            },
            {
              label: "Components Up",
              val: totalComponents ? `${upCount}/${totalComponents}` : "—",
              sub: "Across all services",
              clr: C.navy,
              onClick: () => onDrill?.("dashboard"),
            },
            {
              label: "AI Models",
              val: String(modelList.length || 4),
              sub: "Transcriptions + risk jobs",
              clr: C.teal,
              onClick: () => onDrill?.("models"),
            },
            {
              label: "Audit",
              val: "Live",
              sub: "All access logged",
              clr: C.amber,
              onClick: () => onDrill?.("audit"),
            },
          ]}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
          <div className="card" style={{ padding: "15px 17px" }}>
            <RbacPanel />
          </div>
          <div className="card" style={{ padding: "15px 17px" }}>
            <ModelsPanel models={modelList} statusColor={statusColor} />
          </div>
        </div>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Demo data reset</div>
          <p style={{ fontSize: 12, color: C.textMid, margin: "0 0 10px", lineHeight: 1.5 }}>
            Clears all cases, transcripts, and artifacts. Keeps triage/risk config and demo login accounts.
            Reseeds sample cases including a linked pair for search and related-reports demos.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input
              className="app-input"
              placeholder='Type RESET to confirm'
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              style={{ maxWidth: 200, fontSize: 12 }}
            />
            <button
              type="button"
              className="app-btn"
              disabled={resetConfirm !== "RESET" || resetting}
              onClick={() => {
                void runReset().then((r) => {
                  setResetMsg(
                    `Demo data cleared (${r.casesRemoved} removed, ${r.seededCases} seeded).`,
                  );
                  setResetConfirm("");
                });
              }}
            >
              {resetting ? "Resetting…" : "Reset demo data"}
            </button>
          </div>
          {resetMsg && (
            <div style={{ fontSize: 12, color: C.green, marginTop: 8 }}>{resetMsg}</div>
          )}
        </div>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">System Health</div>
          {components.map((c) => (
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
      </PageShell>
    </QueryState>
  );
}
