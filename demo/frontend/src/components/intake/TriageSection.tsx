import { useState } from "react";
import { C } from "../../theme/tokens";
import { Chip } from "../atoms";
import type { TriageFlag } from "../../api/types";

export function TriageSection({
  flags,
  onDecision,
  readOnly = false,
}: {
  flags: TriageFlag[];
  onDecision?: (flagId: string, action: "confirm" | "dismiss", reason?: string) => void;
  readOnly?: boolean;
}) {
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const confirmed = flags.filter((f) => f.status === "confirmed").length;

  if (!flags.length) {
    return (
      <p style={{ fontSize: 12, color: C.textLight, margin: 0, lineHeight: 1.5 }}>
        No emergency triage flags yet. Flags will appear here when the AI detects indicators during
        transcription or field extraction.
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: confirmed >= 2 ? 10 : 14, flexWrap: "wrap" }}>
        <Chip color={C.coral} bg={C.coralPale}>
          {flags.length} detected
        </Chip>
        {confirmed >= 2 && (
          <Chip color="#fff" bg={C.coral}>
            ⚠ ESCALATION — {confirmed} confirmed
          </Chip>
        )}
      </div>
      {confirmed >= 2 && (
        <div
          style={{
            background: C.coralPale,
            border: `1px solid ${C.coral}33`,
            borderRadius: 10,
            padding: "11px 14px",
            marginBottom: 12,
            fontSize: 12,
            color: C.coral,
            fontWeight: 600,
          }}
        >
          Multi-indicator escalation: {confirmed} emergency indicators confirmed. This report will bypass the
          Screening Team queue and route directly to the emergency response workflow.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flags.map((flag) => {
          const critical = flag.severity === "critical";
          return (
            <div
              key={flag.id}
              style={{
                border: `1px solid ${critical ? C.coral : C.amber}44`,
                borderRadius: 10,
                padding: "12px 14px",
                background: critical ? C.coralPale : C.amberPale,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.textDark }}>{flag.label}</div>
                  {flag.evidence && (
                    <p style={{ fontSize: 11, color: C.textMid, fontStyle: "italic", marginTop: 4 }}>{flag.evidence}</p>
                  )}
                </div>
                {flag.status === "confirmed" ? (
                  <Chip color={C.coral} bg={C.coralPale}>
                    ✓ Confirmed
                  </Chip>
                ) : flag.status === "dismissed" ? (
                  <Chip color={C.green} bg={C.greenPale}>
                    Dismissed
                  </Chip>
                ) : readOnly ? (
                  <Chip color={C.textMid} bg={C.bg}>
                    {flag.status}
                  </Chip>
                ) : (
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="dcf-btn"
                      style={{ background: C.coral, color: "#fff", fontSize: 11, padding: "5px 12px" }}
                      onClick={() => onDecision?.(flag.id, "confirm")}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="dcf-btn ghost-btn"
                      style={{ fontSize: 11, padding: "5px 12px" }}
                      onClick={() => setDismissing(flag.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              {dismissing === flag.id && (
                <div className="fade-in" style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <input
                    className="dcf-input"
                    style={{ flex: 1, fontSize: 12 }}
                    placeholder="Reason for dismissal (required)…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <button
                    type="button"
                    className="dcf-btn"
                    style={{ background: C.navy, color: "#fff", fontSize: 12 }}
                    onClick={() => {
                      if (reason.trim().length >= 5) {
                        onDecision?.(flag.id, "dismiss", reason);
                        setDismissing(null);
                        setReason("");
                      }
                    }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
