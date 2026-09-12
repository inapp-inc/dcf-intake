import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { EmergBadge, RiskBadge } from "../../components/atoms";
import { FilterChips } from "../../components/ui/FilterChips";
import { StatGrid } from "../../components/ui/StatGrid";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { supervisorScreeningStats } from "../../utils/caseStats";
import { formatCaseTitle, formatStatus, formatTimeAgo } from "../../utils/format";
import {
  filterSupervisorScreening,
  SUPERVISOR_SCREENING_FILTER_OPTIONS,
  type SupervisorScreeningFilter,
} from "../../utils/navOptions";
import type { ScreeningScreenInItem } from "../../api/types";

const EMPTY: ScreeningScreenInItem[] = [];

function statusColor(status: string): string {
  switch (status) {
    case "assigned":
      return C.purple;
    case "report_submitted":
      return C.green;
    default:
      return C.textMid;
  }
}

function statusBg(status: string): string {
  switch (status) {
    case "assigned":
      return C.purplePale;
    case "report_submitted":
      return C.greenPale;
    default:
      return C.bg;
  }
}

function screeningFilterCounts(
  items: ScreeningScreenInItem[],
): Partial<Record<SupervisorScreeningFilter, number>> {
  const s = supervisorScreeningStats(items);
  return {
    all: s.all,
    assigned: s.assigned,
    report_submitted: s.reportSubmitted,
    report51b: s.report51b,
    emergency: s.emergency,
  };
}

export function SupervisorScreeningStatus({
  onViewCase,
  queueFilter: queueFilterProp = "all",
  onQueueFilterChange,
}: {
  onViewCase?: (caseId: string) => void;
  queueFilter?: SupervisorScreeningFilter;
  onQueueFilterChange?: (filter: SupervisorScreeningFilter) => void;
}) {
  const [filter, setFilter] = useState<SupervisorScreeningFilter>(queueFilterProp);

  useEffect(() => {
    setFilter(queueFilterProp);
  }, [queueFilterProp]);

  const setQueueFilter = (next: SupervisorScreeningFilter) => {
    setFilter(next);
    onQueueFilterChange?.(next);
  };

  const { data, loading } = useApiQuery(
    () => api.screeningScreenIn().catch(() => EMPTY),
    [],
    { initialData: EMPTY, keepPreviousData: true },
  );

  const items = data ?? EMPTY;
  const stats = useMemo(() => supervisorScreeningStats(items), [items]);
  const counts = useMemo(() => screeningFilterCounts(items), [items]);
  const filtered = useMemo(() => filterSupervisorScreening(items, filter), [items, filter]);

  return (
    <PageShell>
      <StatGrid
        items={[
          {
            label: "Sent for field screening",
            val: String(stats.all),
            clr: C.navy,
            onClick: () => setQueueFilter("all"),
          },
          {
            label: "With field worker",
            val: String(stats.assigned),
            clr: C.purple,
            onClick: () => setQueueFilter("assigned"),
          },
          {
            label: "Field Report submitted",
            val: String(stats.reportSubmitted),
            clr: C.green,
            onClick: () => setQueueFilter("report_submitted"),
          },
          {
            label: "Field Report returned",
            val: String(stats.report51b),
            sub: "Draft on file for supervisor review",
            clr: C.teal,
            onClick: () => setQueueFilter("report51b"),
          },
          {
            label: "Emergency",
            val: String(stats.emergency),
            clr: C.coral,
            onClick: () => setQueueFilter("emergency"),
          },
        ]}
      />

      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">Field Screening Status</div>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
          Cases you approved for screen-in and their current progress with the field team.
        </p>

        <FilterChips
          options={SUPERVISOR_SCREENING_FILTER_OPTIONS}
          value={filter}
          onChange={setQueueFilter}
          counts={counts}
        />

        <QueryState
          loading={loading}
          loadingMessage="Loading screening status…"
          empty={
            !loading && filtered.length === 0 ? (
              <p style={{ color: C.textLight, fontSize: 13 }}>
                {items.length === 0
                  ? "No cases sent for field screening yet. Approve screen-in from Pending Review to track them here."
                  : "No cases match this filter."}
              </p>
            ) : undefined
          }
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>Case</th>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>Child</th>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>Risk</th>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>Status</th>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>Screen-in</th>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>By</th>
                  <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }}>Field Report</th>
                  {onViewCase && (
                    <th style={{ padding: "8px 10px", color: C.textLight, fontWeight: 700 }} />
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.caseId}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: onViewCase ? "pointer" : undefined }}
                    onClick={onViewCase ? () => onViewCase(c.caseId) : undefined}
                  >
                    <td style={{ padding: "10px", fontWeight: 600, color: C.textDark, whiteSpace: "nowrap" }}>
                      {formatCaseTitle(c.externalId, c.caseId)}
                      {c.emergency && (
                        <span style={{ marginLeft: 6 }}>
                          <EmergBadge />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px", color: C.textMid }}>{c.childDisplay}</td>
                    <td style={{ padding: "10px" }}>
                      <RiskBadge score={c.riskScore} />
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 9px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 700,
                          color: statusColor(c.status),
                          background: statusBg(c.status),
                        }}
                      >
                        {formatStatus(c.status)}
                      </span>
                    </td>
                    <td style={{ padding: "10px", color: C.textLight, whiteSpace: "nowrap" }}>
                      {formatTimeAgo(c.decidedAt)} ago
                    </td>
                    <td style={{ padding: "10px", color: C.textLight }}>{c.decidedBy}</td>
                    <td style={{ padding: "10px" }}>
                      {c.hasReport51b ? (
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 9px",
                            borderRadius: 999,
                            fontSize: 11,
                            fontWeight: 700,
                            color: C.green,
                            background: C.greenPale,
                          }}
                        >
                          Returned
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.textLight }}>Pending</span>
                      )}
                    </td>
                    {onViewCase && (
                      <td style={{ padding: "10px", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.navy }}>View →</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
