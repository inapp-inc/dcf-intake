/** Statistical (rule-based) risk scoring — additive points, capped scale. Not probabilistic / LLM. */

export interface RiskFramework {
  version: string;
  scaleMin: number;
  scaleMax: number;
  baselinePoints: number;
  emergencyPoints: number;
  /** Points per keyword label hit in transcript (regex from triage config). */
  keywordPoints: Record<string, number>;
  defaultKeywordPoints: number;
  triageSeverityPoints: { critical: number; high: number };
  /** Multiplier 0–1 for triage flags still pending screener confirmation. */
  pendingTriageMultiplier: number;
  bands: { min: number; label: string }[];
}

export const DEFAULT_RISK_FRAMEWORK: RiskFramework = {
  version: "statistical-v1",
  scaleMin: 1,
  scaleMax: 20,
  baselinePoints: 2,
  emergencyPoints: 5,
  keywordPoints: {
    weapon: 4,
    injury: 3,
    removal: 2,
  },
  defaultKeywordPoints: 2,
  triageSeverityPoints: { critical: 4, high: 2 },
  pendingTriageMultiplier: 0.5,
  bands: [
    { min: 15, label: "High" },
    { min: 10, label: "Moderate" },
    { min: 1, label: "Lower" },
  ],
};

export type RiskTriageFlagInput = {
  label: string;
  severity: string;
  status: string;
};

export type RiskBreakdownLine = {
  component: string;
  points: number;
};

export type StatisticalRiskResult = {
  score: number;
  label: string;
  rawTotal: number;
  contributingFactors: string[];
  breakdown: RiskBreakdownLine[];
};

export function normalizeRiskFramework(raw: unknown): RiskFramework {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_RISK_FRAMEWORK };
  const o = raw as Partial<RiskFramework>;
  const bands =
    Array.isArray(o.bands) && o.bands.length
      ? o.bands
          .map((b) => ({
            min: Number((b as { min?: number }).min) || 0,
            label: String((b as { label?: string }).label ?? ""),
          }))
          .filter((b) => b.label)
          .sort((a, b) => b.min - a.min)
      : DEFAULT_RISK_FRAMEWORK.bands;

  return {
    version: typeof o.version === "string" ? o.version : DEFAULT_RISK_FRAMEWORK.version,
    scaleMin: clampInt(o.scaleMin, 1, 20, DEFAULT_RISK_FRAMEWORK.scaleMin),
    scaleMax: clampInt(o.scaleMax, 1, 20, DEFAULT_RISK_FRAMEWORK.scaleMax),
    baselinePoints: clampInt(o.baselinePoints, 0, 10, DEFAULT_RISK_FRAMEWORK.baselinePoints),
    emergencyPoints: clampInt(o.emergencyPoints, 0, 10, DEFAULT_RISK_FRAMEWORK.emergencyPoints),
    keywordPoints:
      o.keywordPoints && typeof o.keywordPoints === "object"
        ? (o.keywordPoints as Record<string, number>)
        : { ...DEFAULT_RISK_FRAMEWORK.keywordPoints },
    defaultKeywordPoints: clampInt(
      o.defaultKeywordPoints,
      0,
      10,
      DEFAULT_RISK_FRAMEWORK.defaultKeywordPoints,
    ),
    triageSeverityPoints: {
      critical: clampInt(
        o.triageSeverityPoints?.critical,
        0,
        10,
        DEFAULT_RISK_FRAMEWORK.triageSeverityPoints.critical,
      ),
      high: clampInt(o.triageSeverityPoints?.high, 0, 10, DEFAULT_RISK_FRAMEWORK.triageSeverityPoints.high),
    },
    pendingTriageMultiplier: clampFloat(
      o.pendingTriageMultiplier,
      0,
      1,
      DEFAULT_RISK_FRAMEWORK.pendingTriageMultiplier,
    ),
    bands,
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function clampFloat(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function riskLabelForScore(framework: RiskFramework, score: number): string {
  for (const band of framework.bands) {
    if (score >= band.min) return band.label;
  }
  return framework.bands[framework.bands.length - 1]?.label ?? "Lower";
}

export function computeStatisticalRisk(input: {
  framework: RiskFramework;
  keywordHits: string[];
  triageFlags: RiskTriageFlagInput[];
  emergency: boolean;
}): StatisticalRiskResult {
  const fw = input.framework;
  const breakdown: RiskBreakdownLine[] = [];
  let raw = fw.baselinePoints;

  breakdown.push({ component: "Baseline intake score", points: fw.baselinePoints });

  const seenKw = new Set<string>();
  for (const label of input.keywordHits) {
    if (seenKw.has(label)) continue;
    seenKw.add(label);
    const pts = fw.keywordPoints[label] ?? fw.defaultKeywordPoints;
    raw += pts;
    breakdown.push({ component: `Keyword: ${label}`, points: pts });
  }

  for (const flag of input.triageFlags) {
    if (flag.status === "dismissed") continue;
    const base =
      flag.severity === "critical" ? fw.triageSeverityPoints.critical : fw.triageSeverityPoints.high;
    const mult = flag.status === "confirmed" ? 1 : fw.pendingTriageMultiplier;
    const pts = Math.round(base * mult * 10) / 10;
    raw += pts;
    const statusNote = flag.status === "confirmed" ? "confirmed" : "pending";
    breakdown.push({
      component: `Triage: ${flag.label} (${statusNote})`,
      points: pts,
    });
  }

  if (input.emergency) {
    raw += fw.emergencyPoints;
    breakdown.push({ component: "Emergency escalation active", points: fw.emergencyPoints });
  }

  const score = Math.min(fw.scaleMax, Math.max(fw.scaleMin, Math.round(raw)));
  const label = riskLabelForScore(fw, score);
  const contributingFactors = breakdown
    .filter((b) => b.points > 0)
    .map((b) => `${b.component} (+${b.points})`);

  if (contributingFactors.length === 0) {
    contributingFactors.push(`Baseline only (total ${score}/${fw.scaleMax})`);
  }

  return {
    score,
    label,
    rawTotal: Math.round(raw * 10) / 10,
    contributingFactors,
    breakdown,
  };
}
