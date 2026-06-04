import { C, riskColor, riskLabel, riskPale } from "../theme/tokens";

export function Chip({
  children,
  color,
  bg,
  size = "sm",
}: {
  children: React.ReactNode;
  color: string;
  bg: string;
  size?: "sm" | "xs";
}) {
  return (
    <span className="chip" style={{ color, background: bg, fontSize: size === "xs" ? 10 : 11 }}>
      {children}
    </span>
  );
}

export function RiskBadge({ score }: { score: number }) {
  return (
    <Chip color={riskColor(score)} bg={riskPale(score)}>
      {score}/20 — {riskLabel(score)}
    </Chip>
  );
}

export function EmergBadge() {
  return (
    <Chip color="#fff" bg={C.coral}>
      ⚠ EMERGENCY
    </Chip>
  );
}

export function AiBadge() {
  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 700,
        color: C.teal,
        background: C.tealPale,
        padding: "1px 6px",
        borderRadius: 4,
        letterSpacing: 0.4,
        marginLeft: 6,
      }}
    >
      AI
    </span>
  );
}

export function PulseCircle({ color }: { color: string }) {
  return (
    <span
      className="pulsing"
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
