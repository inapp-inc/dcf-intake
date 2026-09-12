import { useMemo, type ReactNode } from "react";
import { api } from "../api/client";
import { C } from "../theme/tokens";
import { PulseCircle, RiskBadge } from "../components/atoms";
import { StatGrid } from "../components/ui/StatGrid";
import { PageShell } from "../components/ui/PageShell";
import { QueryState } from "../components/ui/QueryState";
import { useApiQuery } from "../hooks/useApiQuery";
import { BriefingStatusChip } from "../components/worker/BriefingStatusChip";
import { Report51bStatusChip } from "../components/worker/Report51bStatusChip";
import { screenerQueueStats, supervisorScreeningStats, workerQueueStats } from "../utils/caseStats";
import { formatCaseTitle, formatCheckpointStatus, formatStatus, formatTimeAgo } from "../utils/format";
import type { CaseSummary, UserRole } from "../api/types";
import type { NavOptions } from "../utils/navOptions";

const EMPTY: CaseSummary[] = [];

export function RoleHomePage({
  role,
  onDrill,
}: {
  role: UserRole;
  onDrill: (target: string, caseId?: string, options?: NavOptions) => void;
}) {
  if (role === "screener") return <ScreenerHome onDrill={onDrill} />;
  if (role === "supervisor") return <SupervisorHome onDrill={onDrill} />;
  if (role === "worker") return <WorkerHome onDrill={onDrill} />;
  return <AdminHome onDrill={onDrill} />;
}

function ScreenerHome({ onDrill }: { onDrill: (t: string, id?: string, o?: NavOptions) => void }) {
  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY),
    [],
    { initialData: EMPTY },
  );
  const items = data ?? EMPTY;
  const stats = useMemo(() => screenerQueueStats(items), [items]);
  const inProgress = items.filter((c) => c.status === "in_progress");

  return (
    <PageShell>
      <StatGrid
        items={[
          {
            label: "My active cases",
            val: String(stats.active),
            clr: C.navy,
            onClick: () => onDrill("dashboard", undefined, { screenerFilter: "active" }),
          },
          {
            label: "In progress",
            val: String(stats.inProgress),
            clr: C.teal,
            onClick: () => onDrill("dashboard", undefined, { screenerFilter: "in_progress" }),
          },
          {
            label: "Emergency",
            val: String(stats.emergencyCount),
            clr: C.coral,
            onClick: () => onDrill("dashboard", undefined, { screenerFilter: "emergency" }),
          },
          {
            label: "Pending supervisor",
            val: String(stats.pendingReview),
            clr: C.green,
            onClick: () => onDrill("dashboard", undefined, { screenerFilter: "pending_review" }),
          },
        ]}
      />
      <div className="card" style={{ padding: 16 }}>
        <div className="sec-title">Your work today</div>
        <p style={{ fontSize: 12, color: C.textLight, marginBottom: 12 }}>
          Start a new hotline intake or continue an in-progress Initial Report.
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
          <button type="button" className="app-btn" style={{ background: C.teal, color: "#fff" }} onClick={() => onDrill("intake")}>
            + New Initial Report
          </button>
          <button type="button" className="app-btn ghost-btn" onClick={() => onDrill("dashboard")}>
            My queue →
          </button>
        </div>
        <QueryState loading={loading} loadingMessage="Loading cases…">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {inProgress.slice(0, 6).map((c) => (
              <DrillRow key={c.caseId} case={c} onClick={() => onDrill("intake", c.caseId)} />
            ))}
            {inProgress.length === 0 && (
              <p style={{ fontSize: 12, color: C.textLight }}>No in-progress intakes — start a new Initial Report.</p>
            )}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}

function SupervisorHome({ onDrill }: { onDrill: (t: string, id?: string, o?: NavOptions) => void }) {
  const { data: pending, loading: lp } = useApiQuery(
    () => api.screeningPending().catch(() => []),
    [],
    { initialData: [] },
  );
  const { data: screenIn, loading: ls } = useApiQuery(
    () => api.screeningScreenIn().catch(() => []),
    [],
    { initialData: [] },
  );
  const queue = pending ?? [];
  const field = screenIn ?? [];
  const fieldStats = useMemo(() => supervisorScreeningStats(field), [field]);

  return (
    <PageShell>
      <StatGrid
        items={[
          {
            label: "Pending review",
            val: String(queue.length),
            clr: C.coral,
            onClick: () => onDrill("review"),
          },
          {
            label: "Sent to field",
            val: String(fieldStats.all),
            clr: C.navy,
            onClick: () => onDrill("screening", undefined, { supervisorScreeningFilter: "all" }),
          },
          {
            label: "Field Report returned",
            val: String(fieldStats.report51b),
            clr: C.green,
            onClick: () => onDrill("screening", undefined, { supervisorScreeningFilter: "report51b" }),
          },
          {
            label: "Emergency in queue",
            val: String(queue.filter((c) => c.emergency).length),
            clr: C.coral,
            onClick: () => onDrill("review", undefined, { supervisorEmergencyOnly: true }),
          },
        ]}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="sec-title">Awaiting your decision</div>
          <QueryState loading={lp} loadingMessage="Loading…">
            {queue.slice(0, 4).map((c) => (
              <div
                key={c.caseId}
                style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                onClick={() => onDrill("review")}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.childDisplay}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>
                  {c.triageFlagCount ?? 0} triage flags · risk {c.riskScore}
                </div>
              </div>
            ))}
            <button type="button" className="app-btn ghost-btn" style={{ marginTop: 10 }} onClick={() => onDrill("review")}>
              Open pending review →
            </button>
          </QueryState>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="sec-title">Field screening status</div>
          <QueryState loading={ls} loadingMessage="Loading…">
            {field.slice(0, 4).map((c) => (
              <div
                key={c.caseId}
                style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                onClick={() => onDrill("case-record", c.caseId)}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.childDisplay}</div>
                <div style={{ fontSize: 11, color: C.textLight }}>
                  {formatStatus(c.status)}
                  {c.hasReport51b ? " · Field Report available" : ""}
                </div>
              </div>
            ))}
            <button type="button" className="app-btn ghost-btn" style={{ marginTop: 10 }} onClick={() => onDrill("screening")}>
              Field screening →
            </button>
          </QueryState>
        </div>
      </div>
    </PageShell>
  );
}

function WorkerHome({ onDrill }: { onDrill: (t: string, id?: string, o?: NavOptions) => void }) {
  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY),
    [],
    { initialData: EMPTY },
  );
  const items = data ?? EMPTY;
  const stats = useMemo(() => workerQueueStats(items), [items]);

  return (
    <PageShell>
      <StatGrid
        items={[
          {
            label: "Assigned cases",
            val: String(stats.assigned),
            clr: C.purple,
            onClick: () => onDrill("dashboard", undefined, { workerFilter: "assigned" }),
          },
          {
            label: "Field Report submitted",
            val: String(stats.reportSubmitted),
            clr: C.green,
            onClick: () => onDrill("dashboard", undefined, { workerFilter: "report_submitted" }),
          },
          {
            label: "Emergency",
            val: String(stats.emergency),
            clr: C.coral,
            onClick: () => onDrill("dashboard", undefined, { workerFilter: "emergency" }),
          },
          {
            label: "Total active",
            val: String(stats.all),
            clr: C.navy,
            onClick: () => onDrill("dashboard", undefined, { workerFilter: "all" }),
          },
        ]}
      />
      <div className="card" style={{ padding: 16 }}>
        <div className="sec-title">Your field work</div>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <button type="button" className="app-btn" style={{ background: C.purple, color: "#fff" }} onClick={() => onDrill("briefing")}>
            Pre-visit briefing
          </button>
          <button type="button" className="app-btn ghost-btn" onClick={() => onDrill("report")}>
            Field Report
          </button>
        </div>
        <QueryState loading={loading} loadingMessage="Loading cases…">
          {items.map((c) => (
            <DrillRow
              key={c.caseId}
              case={c}
              showWorkerStatus
              onClick={() => onDrill("case-record", c.caseId)}
              actions={
                <>
                  <button type="button" className="app-btn ghost-btn" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onDrill("briefing", c.caseId); }}>
                    Briefing
                  </button>
                  <button type="button" className="app-btn ghost-btn" style={{ fontSize: 11 }} onClick={(e) => { e.stopPropagation(); onDrill("report", c.caseId); }}>
                    Field Report
                  </button>
                </>
              }
            />
          ))}
        </QueryState>
      </div>
    </PageShell>
  );
}

function AdminHome({ onDrill }: { onDrill: (t: string, id?: string, o?: NavOptions) => void }) {
  const { data: health, error: healthError } = useApiQuery(
    () => api.adminHealth().catch(() => null),
    [],
    { initialData: null },
  );
  const components = health?.components ?? [];
  const up = components.filter((c) => c.status === "up").length;
  const total = components.length;

  return (
    <PageShell>
      {healthError && (
        <div className="card" style={{ padding: 12, fontSize: 12, color: C.amber, background: C.amberPale }}>
          System health check unavailable — other admin tools still work.
        </div>
      )}
      <StatGrid
        items={[
          {
            label: "System health",
            val: total ? `${up}/${total} up` : "—",
            clr: C.green,
            onClick: () => onDrill("dashboard"),
          },
          {
            label: "Triage config",
            val: "Edit",
            sub: "Keywords & thresholds",
            clr: C.teal,
            onClick: () => onDrill("triage-config"),
          },
          {
            label: "Risk scoring",
            val: "Weights",
            sub: "Statistical framework",
            clr: C.coral,
            onClick: () => onDrill("risk-framework"),
          },
          {
            label: "Audit",
            val: "View",
            sub: "Access logs",
            clr: C.amber,
            onClick: () => onDrill("audit"),
          },
          {
            label: "Models",
            val: "HF",
            sub: "Cloud inference",
            clr: C.navy,
            onClick: () => onDrill("models"),
          },
        ]}
      />
      <div className="card" style={{ padding: 16 }}>
        <div className="sec-title">Administration</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          <button type="button" className="app-btn ghost-btn" onClick={() => onDrill("triage-config")}>
            Configure triage keywords & thresholds →
          </button>
          <button type="button" className="app-btn ghost-btn" onClick={() => onDrill("risk-framework")}>
            Configure statistical risk weights →
          </button>
          <button type="button" className="app-btn ghost-btn" onClick={() => onDrill("dashboard")}>
            System status dashboard →
          </button>
          <button type="button" className="app-btn ghost-btn" onClick={() => onDrill("audit")}>
            Audit logs →
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function DrillRow({
  case: c,
  onClick,
  actions,
  showWorkerStatus,
}: {
  case: CaseSummary;
  onClick: () => void;
  actions?: ReactNode;
  showWorkerStatus?: boolean;
}) {
  return (
    <div
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
      onClick={onClick}
    >
      {c.emergency && <PulseCircle color={C.coral} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{c.childDisplay ?? "Child"} — {formatCaseTitle(c.externalId)}</div>
        <div style={{ fontSize: 11, color: C.textLight }}>
          {formatStatus(c.status)}
          {c.status === "in_progress" ? ` · ${formatCheckpointStatus(c.form51aCheckpointStatus)}` : ""}
          {" · "}
          {formatTimeAgo(c.updatedAt)} ago
        </div>
      </div>
      {c.riskScore != null && <RiskBadge score={c.riskScore} />}
      {showWorkerStatus && (
        <>
          <BriefingStatusChip briefingOpenedAt={c.briefingOpenedAt} />
          <Report51bStatusChip caseRow={c} />
        </>
      )}
      {actions}
    </div>
  );
}
