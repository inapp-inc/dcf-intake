import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { C } from "../theme/tokens";
import { Chip, EmergBadge, PulseCircle, RiskBadge } from "../components/atoms";
import { FilterChips } from "../components/ui/FilterChips";
import { StatGrid } from "../components/ui/StatGrid";
import { PageShell } from "../components/ui/PageShell";
import { QueryState } from "../components/ui/QueryState";
import { useApiQuery } from "../hooks/useApiQuery";
import { screenerQueueStats } from "../utils/caseStats";
import { formatCaseName, formatCaseNumber, formatCheckpointStatus, formatStatus, formatTimeAgo } from "../utils/format";
import { filterScreenerCases, SCREENER_FILTER_OPTIONS, type ScreenerQueueFilter } from "../utils/navOptions";
import type { CaseSummary } from "../api/types";

const EMPTY_CASES: CaseSummary[] = [];

function screenerFilterCounts(items: CaseSummary[]): Partial<Record<ScreenerQueueFilter, number>> {
  const s = screenerQueueStats(items);
  return {
    all: s.all,
    active: s.active,
    in_progress: s.inProgress,
    needs_checkpoint: s.needsCheckpoint,
    ready_to_submit: s.readyToSubmit,
    pending_review: s.pendingReview,
    emergency: s.emergencyCount,
  };
}

export function ScreenerDashboard({
  onNewIntake,
  onOpenCase,
  queueFilter: queueFilterProp = "all",
  onQueueFilterChange,
}: {
  onNewIntake: () => void;
  onOpenCase: (id: string) => void;
  queueFilter?: ScreenerQueueFilter;
  onQueueFilterChange?: (filter: ScreenerQueueFilter) => void;
}) {
  const [filter, setFilter] = useState<ScreenerQueueFilter>(queueFilterProp);

  useEffect(() => {
    setFilter(queueFilterProp);
  }, [queueFilterProp]);

  const setQueueFilter = (next: ScreenerQueueFilter) => {
    setFilter(next);
    onQueueFilterChange?.(next);
  };

  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY_CASES),
    [],
    { initialData: EMPTY_CASES, keepPreviousData: true },
  );

  const items = data ?? EMPTY_CASES;
  const stats = useMemo(() => screenerQueueStats(items), [items]);
  const counts = useMemo(() => screenerFilterCounts(items), [items]);
  const filtered = useMemo(() => filterScreenerCases(items, filter), [items, filter]);

  return (
    <PageShell>
      <StatGrid
        items={[
          {
            label: "My active cases",
            val: String(stats.active),
            sub: "In progress · pending review · clarification",
            clr: C.navy,
            onClick: () => setQueueFilter("active"),
          },
          {
            label: "Emergency",
            val: String(stats.emergencyCount),
            sub: "2-hour response required",
            clr: C.coral,
            onClick: () => setQueueFilter("emergency"),
          },
          {
            label: "Initial Report incomplete",
            val: String(stats.needsCheckpoint),
            sub: "Checkpoint not complete",
            clr: C.amber,
            onClick: () => setQueueFilter("needs_checkpoint"),
          },
          {
            label: "Ready to submit",
            val: String(stats.readyToSubmit),
            sub: stats.readyToSubmit
              ? "Checkpoint complete · review BG before submit"
              : "None awaiting supervisor",
            clr: C.teal,
            onClick: () => setQueueFilter("ready_to_submit"),
          },
          {
            label: "Pending supervisor",
            val: String(stats.pendingReview),
            sub: stats.inProgress ? `${stats.inProgress} still in progress` : "Submitted for review",
            clr: C.green,
            onClick: () => setQueueFilter("pending_review"),
          },
        ]}
      />
      <div className="card" style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div className="sec-title" style={{ margin: 0 }}>
            Active Case Queue
          </div>
          <button type="button" className="app-btn" style={{ background: C.teal, color: "#fff" }} onClick={onNewIntake}>
            + New Initial Report
          </button>
        </div>

        <FilterChips options={SCREENER_FILTER_OPTIONS} value={filter} onChange={setQueueFilter} counts={counts} />

        <QueryState
          loading={loading}
          loadingMessage="Loading cases…"
          loadingHint="Demo API may take a moment on first load."
          empty={
            !loading && filtered.length === 0 ? (
              <p style={{ color: C.textLight, fontSize: 13 }}>
                {items.length === 0
                  ? "No cases yet. Start a new Initial Report."
                  : "No cases match this filter."}
              </p>
            ) : undefined
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {filtered.map((c) => (
              <div
                key={c.caseId}
                role="button"
                tabIndex={0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "11px 13px",
                  borderRadius: 10,
                  background: c.emergency ? C.coralPale : C.bg,
                  border: `1px solid ${c.emergency ? `${C.coral}33` : C.border}`,
                  cursor: "pointer",
                }}
                onClick={() => onOpenCase(c.caseId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenCase(c.caseId);
                  }
                }}
              >
                {c.emergency && <PulseCircle color={C.coral} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{formatCaseName(c.childDisplay)}</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>
                    Case #{formatCaseNumber(c.externalId)} · {formatTimeAgo(c.updatedAt)} ago
                  </div>
                </div>
                {c.riskScore != null && <RiskBadge score={c.riskScore} />}
                {c.emergency && <EmergBadge />}
                <Chip color={C.textMid} bg={C.bg}>
                  {formatStatus(c.status)}
                </Chip>
                {c.status === "in_progress" && (
                  <Chip color={C.teal} bg={C.tealPale}>
                    {formatCheckpointStatus(c.form51aCheckpointStatus)}
                  </Chip>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>Open →</span>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
