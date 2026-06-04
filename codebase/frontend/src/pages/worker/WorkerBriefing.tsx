import { useEffect, useState } from "react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { C } from "../../theme/tokens";
import { EmergBadge, RiskBadge } from "../../components/atoms";
import { formatCaseTitle } from "../../utils/format";
import type { Briefing } from "../../api/types";

export function WorkerBriefing({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const { token } = useAuth();
  const [b, setB] = useState<Briefing | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getBriefing(token, caseId).then(setB).catch(() => setB(null));
  }, [token, caseId]);

  if (!b) return <p style={{ color: C.textLight }}>Loading briefing…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 13 }} className="fade-up">
      <div className="card" style={{ padding: "13px 17px", display: "flex", gap: 11, alignItems: "center" }}>
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
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: C.textLight, fontWeight: 600 }}>AI Pre-Visit Briefing</div>
          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Fraunces', serif", color: C.textDark }}>
            {formatCaseTitle(undefined, caseId)} — {b.childDisplay}
          </div>
        </div>
        {b.leAccompanimentRecommended && <EmergBadge />}
        <RiskBadge score={b.riskScore} />
      </div>
      {b.leAccompanimentRecommended && (
        <div
          style={{
            background: C.coralPale,
            border: `1.5px solid ${C.coral}66`,
            borderRadius: 12,
            padding: "13px 17px",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontSize: 22 }}>🚔</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.coral, marginBottom: 3 }}>
              Law Enforcement Accompaniment Recommended
            </div>
            <p style={{ fontSize: 12, color: C.textMid }}>{b.leReason}</p>
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Risk Factors</div>
          {b.riskFactors.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textMid, display: "flex", gap: 6, marginBottom: 7 }}>
              <span style={{ color: C.coral, flexShrink: 0 }}>▸</span>
              {f}
            </div>
          ))}
          <div className="divider" />
          <div className="sec-title">Protective Factors</div>
          {b.protectiveFactors.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textMid, display: "flex", gap: 6, marginBottom: 7 }}>
              <span style={{ color: C.green, flexShrink: 0 }}>▸</span>
              {f}
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "15px 17px" }}>
          <div className="sec-title">Collateral Contacts</div>
          {b.collateralContacts.map((c, i) => (
            <div key={i} style={{ padding: "9px 11px", background: C.bg, borderRadius: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textDark }}>{c.name}</div>
              <div style={{ fontSize: 11, color: C.textLight }}>
                {c.role} · {c.phone}
              </div>
            </div>
          ))}
          <div className="divider" />
          <div className="sec-title">Community Resources</div>
          {b.communityResources.map((r, i) => (
            <div key={i} style={{ fontSize: 12, color: C.textMid, marginBottom: 6 }}>
              📍 {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
