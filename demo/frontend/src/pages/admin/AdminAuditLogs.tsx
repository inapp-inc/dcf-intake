import { useState } from "react";
import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { formatCaseTitle } from "../../utils/format";
import type { CaseSummary } from "../../api/types";
import { AuditTrailPage } from "../AuditTrailPage";

const EMPTY_CASES: CaseSummary[] = [];

export function AdminAuditLogs() {
  const [caseId, setCaseId] = useState<string | null>(null);

  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY_CASES),
    [],
    { initialData: EMPTY_CASES, keepPreviousData: true },
  );

  if (caseId) {
    return <AuditTrailPage caseId={caseId} onBack={() => setCaseId(null)} />;
  }

  const items = data ?? EMPTY_CASES;

  return (
    <PageShell>
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title">Audit Logs</div>
        <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14, marginTop: -6 }}>
          Select a case to view tamper-evident audit events (AI outputs, overrides, and access).
        </p>
        <QueryState
          loading={loading}
          loadingMessage="Loading cases…"
          empty={
            !loading && items.length === 0 ? (
              <p style={{ color: C.textLight, fontSize: 13 }}>No cases in the system yet.</p>
            ) : undefined
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((c) => (
              <div
                key={c.caseId}
                role="button"
                tabIndex={0}
                className="nav-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "11px 13px",
                  borderRadius: 10,
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                }}
                onClick={() => setCaseId(c.caseId)}
                onKeyDown={(e) => e.key === "Enter" && setCaseId(c.caseId)}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>
                  {formatCaseTitle(c.externalId, c.caseId)}
                </span>
                <span style={{ fontSize: 11, color: C.textLight }}>View trail →</span>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
