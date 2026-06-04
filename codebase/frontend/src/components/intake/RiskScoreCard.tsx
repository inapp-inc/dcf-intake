import { C, riskColor, riskLabel } from "../../theme/tokens";
import { Chip } from "../atoms";
import type { RiskAssessment } from "../../api/types";

export function RiskScoreCard({ risk }: { risk: RiskAssessment }) {
  const score = risk.score;
  const arc = (score / 20) * 360;
  const color = riskColor(score);

  return (
    <div className="card fade-up" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div className="sec-title" style={{ margin: 0 }}>
          📊 AI Risk Assessment
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {risk.modelVersion && <Chip color={C.textLight} bg={C.bg}>{risk.modelVersion}</Chip>}
          <Chip color={C.teal} bg={C.tealPale}>
            Decision Support Only
          </Chip>
        </div>
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
      <p style={{ fontSize: 11, color: C.textLight, marginTop: 14 }}>
        Advisory only. Screener retains full override authority.
      </p>
    </div>
  );
}
