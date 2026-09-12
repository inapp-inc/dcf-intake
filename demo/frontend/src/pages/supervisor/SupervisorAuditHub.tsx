import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatCaseTitle } from "../../utils/format";
import type { ScreeningQueueItem } from "../../api/types";

const EMPTY_QUEUE: ScreeningQueueItem[] = [];

export function SupervisorAuditHub({ onOpenCase }: { onOpenCase: (caseId: string) => void }) {
  const { data, loading } = useApiQuery(
    () => api.screeningPending().catch(() => EMPTY_QUEUE),
    [],
    { initialData: EMPTY_QUEUE, keepPreviousData: true },
  );

  const queue = data ?? EMPTY_QUEUE;

  return (
    <PageShell>
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">Audit Trail</div>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
          Tamper-evident log for AI outputs, human overrides, and sensitive access. Select a case in your review
          queue.
        </p>
        <QueryState
          loading={loading}
          loadingMessage="Loading cases…"
          empty={
            !loading && queue.length === 0 ? (
              <p style={{ color: C.textLight, fontSize: 13 }}>
                No cases in queue. Submit and route an Initial Report as screener first.
              </p>
            ) : undefined
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.map((c) => (
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
                <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.textDark }}>
                  {c.childDisplay} — {formatCaseTitle(c.externalId)}
                </div>
                <button
                  type="button"
                  className="app-btn"
                  style={{ background: C.navy, color: "#fff", fontSize: 12 }}
                  onClick={() => onOpenCase(c.caseId)}
                >
                  View trail →
                </button>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
