import { api } from "../api/client";
import { C } from "../theme/tokens";
import { BackButton } from "../components/ui/BackButton";
import { EmptyStateCard } from "../components/ui/EmptyStateCard";
import { QueryState } from "../components/ui/QueryState";
import { useApiQuery } from "../hooks/useApiQuery";
import { formatCaseTitle } from "../utils/format";

export function AuditTrailPage({ caseId, onBack }: { caseId: string | null; onBack?: () => void }) {
  const { data: events, loading } = useApiQuery(
    () => api.getCaseAudit(caseId!).catch(() => []),
    [caseId],
    { enabled: Boolean(caseId), initialData: [] },
  );

  if (!caseId) {
    return (
      <EmptyStateCard
        icon="🔐"
        title="Audit Trail"
        description="Tamper-evident 7-year audit log with all AI outputs, human overrides, and system events. Accessible to authorized agency and oversight personnel."
      />
    );
  }

  const list = events ?? [];

  return (
    <div className="card fade-up" style={{ padding: "16px 18px" }}>
      {onBack && <BackButton onClick={onBack} />}
      <div className="sec-title">Audit Trail — {formatCaseTitle(undefined, caseId)}</div>
      <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14 }}>
        Tamper-evident log · AI outputs, human overrides, and sensitive reads
      </p>
      <QueryState loading={loading} loadingMessage="Loading audit events…" minHeight={120}>
        <div style={{ maxHeight: 520, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
          {list.map((e) => (
            <div
              key={e.id}
              style={{
                padding: "11px 0",
                borderBottom: `1px solid ${C.border}`,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 700, color: C.textDark }}>{e.eventType}</div>
              <div style={{ color: C.textLight, marginTop: 2 }}>
                {e.actorRole} · {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
          {list.length === 0 && <p style={{ color: C.textLight, fontSize: 13 }}>No audit events for this case yet.</p>}
        </div>
      </QueryState>
    </div>
  );
}
