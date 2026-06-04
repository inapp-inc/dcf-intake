import { useMemo } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { Chip, EmergBadge, RiskBadge } from "../../components/atoms";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatCaseTitle, formatCheckpointStatus, formatStatus, formatTimeAgo } from "../../utils/format";
import type { CaseSummary } from "../../api/types";

const EMPTY_CASES: CaseSummary[] = [];
const ACTIVE_STATUSES = new Set(["in_progress"]);

export function ScreenerCaseHistory({ onOpenCase }: { onOpenCase: (id: string) => void }) {
  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY_CASES),
    [],
    { initialData: EMPTY_CASES, keepPreviousData: true },
  );

  const items = useMemo(
    () => (data ?? EMPTY_CASES).filter((c) => !ACTIVE_STATUSES.has(c.status)),
    [data],
  );

  return (
    <PageShell>
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">Case History</div>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
          Submitted and closed intakes. Open a record to review the 51A (read-only after submit).
        </p>
        <QueryState
          loading={loading}
          loadingMessage="Loading case history…"
          empty={
            !loading && items.length === 0 ? (
              <p style={{ color: C.textLight, fontSize: 13 }}>
                No submitted cases yet. Complete and submit a 51A from New Intake or My Queue.
              </p>
            ) : undefined
          }
        >
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
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{c.childDisplay ?? "Case"}</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>
                    {formatCaseTitle(c.externalId)} · Updated {formatTimeAgo(c.updatedAt)} ago
                  </div>
                </div>
                {c.riskScore != null && <RiskBadge score={c.riskScore} />}
                {c.emergency && <EmergBadge />}
                <Chip color={C.textMid} bg={C.white}>
                  {formatStatus(c.status)}
                </Chip>
                {c.status === "in_progress" && (
                  <Chip color={C.teal} bg={C.tealPale}>
                    {formatCheckpointStatus(c.form51aCheckpointStatus)}
                  </Chip>
                )}
                <button
                  type="button"
                  className="dcf-btn"
                  style={{ background: C.navy, color: "#fff", fontSize: 12, padding: "6px 13px" }}
                  onClick={() => onOpenCase(c.caseId)}
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
