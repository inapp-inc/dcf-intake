import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { C } from "../theme/tokens";
import { EmptyStateCard } from "../components/ui/EmptyStateCard";
import { formatCaseTitle } from "../utils/format";
import type { AuditEvent } from "../api/types";

export function AuditTrailPage({ caseId, onBack }: { caseId: string | null; onBack?: () => void }) {
  const { token } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    if (!token || !caseId) return;
    api.getCaseAudit(token, caseId).then(setEvents).catch(() => setEvents([]));
  }, [token, caseId]);

  if (!caseId) {
    return (
      <EmptyStateCard
        icon="🔐"
        title="Audit Trail"
        description="Tamper-evident 7-year audit log with all AI outputs, human overrides, and system events. Accessible to authorized DCF, EOHHS, and OIG personnel."
      />
    );
  }

  return (
    <div className="card fade-up" style={{ padding: "16px 18px" }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "6px 12px",
            cursor: "pointer",
            fontSize: 12,
            color: C.textMid,
            marginBottom: 12,
          }}
        >
          ← Back
        </button>
      )}
      <div className="sec-title">Audit Trail — {formatCaseTitle(undefined, caseId)}</div>
      <p style={{ fontSize: 11, color: C.textLight, marginBottom: 14 }}>
        Tamper-evident log · AI outputs, human overrides, and sensitive reads
      </p>
      <div style={{ maxHeight: 520, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0 }}>
        {events.map((e) => (
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
        {events.length === 0 && <p style={{ color: C.textLight, fontSize: 13 }}>No audit events for this case yet.</p>}
      </div>
    </div>
  );
}
