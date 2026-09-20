import { C } from "../../theme/tokens";
import { formatCaseName, formatCaseNumber, formatStatus } from "../../utils/format";
import type { RelatedCaseSummary } from "../../api/types";

export function LinkedCasesDrawer({
  open,
  relatedCases,
  onClose,
  onOpenCase,
}: {
  open: boolean;
  relatedCases: RelatedCaseSummary[];
  onClose: () => void;
  onOpenCase: (caseId: string) => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.35)",
          zIndex: 200,
        }}
      />
      <aside
        aria-label="Related reports"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: 360,
          maxWidth: "92vw",
          height: "100vh",
          background: C.surface,
          borderLeft: `1px solid ${C.border}`,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 24px rgba(0,0,0,0.08)",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600, textTransform: "uppercase" }}>
              Same child
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.textDark }}>Related reports</div>
          </div>
          <button type="button" className="app-btn ghost-btn" onClick={onClose} aria-label="Close drawer">
            ✕
          </button>
        </div>

        <div style={{ padding: "12px 18px", fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>
          These cases share the same child name and date of birth. Reporter or timeline may differ — records are
          linked, not merged.
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 18px" }}>
          {relatedCases.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textLight, padding: 12 }}>No related cases found.</div>
          ) : (
            relatedCases.map((c) => (
              <button
                key={c.caseId}
                type="button"
                className="card"
                onClick={() => onOpenCase(c.caseId)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 14px",
                  marginBottom: 8,
                  border: `1px solid ${C.border}`,
                  cursor: "pointer",
                  background: C.surface,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: C.textDark }}>
                  {formatCaseName(c.childDisplay)}
                </div>
                <div style={{ fontSize: 11, color: C.textLight, marginTop: 4 }}>
                  {formatCaseNumber(c.externalId)} · {formatStatus(c.status)}
                </div>
                {c.reporterName && (
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 4 }}>Reporter: {c.reporterName}</div>
                )}
                <div style={{ fontSize: 10, color: C.textLight, marginTop: 4 }}>
                  Opened {new Date(c.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}

export function RelatedCasesBanner({
  count,
  onOpen,
}: {
  count: number;
  onOpen: () => void;
}) {
  if (count <= 0) return null;

  return (
    <div
      className="card"
      style={{
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: C.amberPale,
        border: `1px solid ${C.amber}44`,
      }}
    >
      <span style={{ fontSize: 18 }}>🔗</span>
      <div style={{ flex: 1, fontSize: 12, color: C.textDark }}>
        <strong>{count}</strong> related report{count === 1 ? "" : "s"} for the same child (name + DOB).
      </div>
      <button type="button" className="app-btn ghost-btn" style={{ fontSize: 11 }} onClick={onOpen}>
        View related
      </button>
    </div>
  );
}
