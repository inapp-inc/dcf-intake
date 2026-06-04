import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { EmergBadge, PulseCircle, RiskBadge } from "../../components/atoms";
import { FilterChips } from "../../components/ui/FilterChips";
import { StatGrid } from "../../components/ui/StatGrid";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { workerQueueStats } from "../../utils/caseStats";
import { BriefingStatusChip } from "../../components/worker/BriefingStatusChip";
import { Report51bStatusChip } from "../../components/worker/Report51bStatusChip";
import { formatCaseTitle, formatStatus } from "../../utils/format";
import {
  filterWorkerCases,
  WORKER_FILTER_OPTIONS,
  type WorkerQueueFilter,
} from "../../utils/navOptions";
import type { CaseSummary } from "../../api/types";

const EMPTY_CASES: CaseSummary[] = [];

function workerFilterCounts(items: CaseSummary[]): Partial<Record<WorkerQueueFilter, number>> {
  const s = workerQueueStats(items);
  return {
    all: s.all,
    assigned: s.assigned,
    report_submitted: s.reportSubmitted,
    emergency: s.emergency,
  };
}

export function WorkerDashboard({
  onBriefing,
  onReport,
  onViewCase,
  queueFilter: queueFilterProp = "all",
  onQueueFilterChange,
}: {
  onBriefing: (caseId: string) => void;
  onReport: (caseId: string) => void;
  onViewCase?: (caseId: string) => void;
  onDrill?: (page: string, caseId?: string) => void;
  queueFilter?: WorkerQueueFilter;
  onQueueFilterChange?: (filter: WorkerQueueFilter) => void;
}) {
  const [filter, setFilter] = useState<WorkerQueueFilter>(queueFilterProp);

  useEffect(() => {
    setFilter(queueFilterProp);
  }, [queueFilterProp]);

  const setQueueFilter = (next: WorkerQueueFilter) => {
    setFilter(next);
    onQueueFilterChange?.(next);
  };

  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY_CASES),
    [],
    { initialData: EMPTY_CASES, keepPreviousData: true },
  );

  const items = data ?? EMPTY_CASES;
  const stats = useMemo(() => workerQueueStats(items), [items]);
  const counts = useMemo(() => workerFilterCounts(items), [items]);
  const filtered = useMemo(() => filterWorkerCases(items, filter), [items, filter]);

  return (
    <PageShell>
      <StatGrid
        columns={4}
        items={[
          {
            label: "Assigned cases",
            val: String(stats.assigned),
            sub: "51B not yet submitted",
            clr: C.navy,
            onClick: () => setQueueFilter("assigned"),
          },
          {
            label: "Emergency",
            val: String(stats.emergency),
            clr: C.coral,
            onClick: () => setQueueFilter("emergency"),
          },
          {
            label: "51B submitted",
            val: String(stats.reportSubmitted),
            sub: "Awaiting supervisor review",
            clr: C.green,
            onClick: () => setQueueFilter("report_submitted"),
          },
          {
            label: "All active",
            val: String(stats.all),
            clr: C.purple,
            onClick: () => setQueueFilter("all"),
          },
        ]}
      />
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">My Assigned Cases</div>
        <FilterChips options={WORKER_FILTER_OPTIONS} value={filter} onChange={setQueueFilter} counts={counts} />
        <QueryState
          loading={loading}
          loadingMessage="Loading assigned cases…"
          minHeight={100}
          empty={
            !loading && filtered.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textLight }}>
                {items.length === 0
                  ? "No assigned cases — supervisor must approve screen-in first."
                  : "No cases match this filter."}
              </p>
            ) : undefined
          }
        >
          {filtered.map((c) => (
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
                <BriefingStatusChip briefingOpenedAt={c.briefingOpenedAt} />
                <Report51bStatusChip caseRow={c} />
                {onViewCase && (
                <button
                  type="button"
                  className="dcf-btn ghost-btn"
                  style={{ fontSize: 12 }}
                  onClick={() => onViewCase(c.caseId)}
                >
                  Case record
                </button>
              )}
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
        </QueryState>
      </div>
    </PageShell>
  );
}
