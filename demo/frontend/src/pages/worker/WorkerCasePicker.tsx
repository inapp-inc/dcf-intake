import { api } from "../../api/client";
import { C } from "../../theme/tokens";
import { EmergBadge, RiskBadge } from "../../components/atoms";
import { PageShell } from "../../components/ui/PageShell";
import { QueryState } from "../../components/ui/QueryState";
import { useApiQuery } from "../../hooks/useApiQuery";
import { BriefingStatusChip } from "../../components/worker/BriefingStatusChip";
import { Report51bStatusChip } from "../../components/worker/Report51bStatusChip";
import { formatCaseTitle, formatStatus } from "../../utils/format";
import type { CaseSummary } from "../../api/types";

const EMPTY_CASES: CaseSummary[] = [];

export function WorkerCasePicker({
  target,
  onSelect,
  onGoDashboard,
}: {
  target: "briefing" | "report";
  onSelect: (caseId: string) => void;
  onGoDashboard: () => void;
}) {
  const { data, loading } = useApiQuery(
    () => api.listCases().then((r) => r.items).catch(() => EMPTY_CASES),
    [],
    { initialData: EMPTY_CASES, keepPreviousData: true },
  );

  const items = data ?? EMPTY_CASES;
  const title = target === "briefing" ? "51B Pre-Visit Briefing" : "Field Report";
  const hint =
    target === "briefing"
      ? "Choose an assigned case to open the AI pre-visit briefing."
      : "Choose an assigned case to write or edit the 51B field report.";

  return (
    <PageShell style={{ gap: 13 }}>
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="sec-title" style={{ marginBottom: 6 }}>
          {title}
        </div>
        <p style={{ fontSize: 12, color: C.textLight, marginBottom: 14 }}>{hint}</p>
        <QueryState
          loading={loading}
          loadingMessage="Loading assigned cases…"
          empty={
            !loading && items.length === 0 ? (
              <p style={{ fontSize: 13, color: C.textLight }}>
                No assigned cases yet. A supervisor must approve screen-in before cases appear here.{" "}
                <button type="button" className="dcf-btn ghost-btn" style={{ marginTop: 10 }} onClick={onGoDashboard}>
                  Go to My Cases
                </button>
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
                  background: c.emergency ? C.coralPale : C.bg,
                  border: `1px solid ${c.emergency ? `${C.coral}33` : C.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.textDark }}>{c.childDisplay ?? "Case"}</div>
                  <div style={{ fontSize: 11, color: C.textLight }}>
                    {formatCaseTitle(c.externalId)} · {formatStatus(c.status)}
                  </div>
                </div>
                {c.riskScore != null && <RiskBadge score={c.riskScore} />}
                {c.emergency && <EmergBadge />}
                {target === "briefing" && <BriefingStatusChip briefingOpenedAt={c.briefingOpenedAt} />}
                {target === "report" && <Report51bStatusChip caseRow={c} />}
                <button
                  type="button"
                  className="dcf-btn"
                  style={{ background: C.teal, color: "#fff", fontSize: 12 }}
                  onClick={() => onSelect(c.caseId)}
                >
                  Open →
                </button>
              </div>
            ))}
          </div>
        </QueryState>
      </div>
    </PageShell>
  );
}
