import { C, riskColor, riskLabel } from "../../theme/tokens";
import { Chip } from "../atoms";
import type { RiskAssessment } from "../../api/types";

export function RiskScoreCard({ risk }: { risk: RiskAssessment | null }) {
  if (!risk || (risk.status === "ready" && risk.score == null)) {
    return (
      <p style={{ fontSize: 12, color: C.textLight, margin: 0, lineHeight: 1.5 }}>
        No risk score yet. Upload a recording and wait for transcription and triage — the statistical
        advisory score will appear here.
      </p>
    );
  }

  if (risk.status && risk.status !== "ready") {
    return (
      <>
        <p style={{ fontSize: 12, color: C.textLight, margin: 0, lineHeight: 1.5 }}>
          {risk.status === "running"
            ? "Statistical risk score is being calculated from triage flags and transcript keywords."
            : risk.status === "failed"
              ? "Risk scoring did not complete. You can still proceed with intake."
              : "Risk score will appear after transcription and triage complete."}
        </p>
      </>
    );
  }

  if (risk.score == null) {
    return (
      <p style={{ fontSize: 12, color: C.textLight, margin: 0, lineHeight: 1.5 }}>
        Risk score is not available for this case yet.
      </p>
    );
  }

  const score = risk.score;
  const arc = (score / 20) * 360;
  const color = riskColor(score);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 14, gap: 7 }}>
        {risk.modelVersion && <Chip color={C.textLight} bg={C.bg}>{risk.modelVersion}</Chip>}
        <Chip color={C.teal} bg={C.tealPale}>
          Statistical · Advisory
        </Chip>
      </div>
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              background: `conic-gradient(${color} ${arc}deg, ${C.border} 0)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: C.white,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Fraunces', serif" }}>{score}</span>
              <span style={{ fontSize: 9, color: C.textLight, fontWeight: 600 }}>/ 20</span>
            </div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 6 }}>{risk.label ?? riskLabel(score)}</div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.textLight,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Contributing Factors
          </div>
          {risk.contributingFactors.map((f, i) => (
            <div
              key={i}
              style={{
                fontSize: 12,
                color: C.textMid,
                display: "flex",
                gap: 6,
                marginBottom: 6,
              }}
            >
              <span style={{ color }}>▸</span>
              {f}
            </div>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 11, color: C.textLight, marginTop: 14, marginBottom: 0 }}>
        Additive rule-based score (not probabilistic). Screener retains full override authority.
      </p>
    </>
  );
}
