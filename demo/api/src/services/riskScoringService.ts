import { v4 as uuidv4 } from "uuid";
import { computeStatisticalRisk } from "../domain/risk/framework.js";
import { query } from "../db/pool.js";
import { getTriageConfig } from "./triageConfigService.js";
import { getRiskFramework } from "./riskFrameworkService.js";

function compileKeywordPatterns(patterns: { label: string; pattern: string; flags?: string }[]) {
  return patterns.map((p) => ({
    label: p.label,
    re: new RegExp(p.pattern, p.flags ?? "i"),
  }));
}

export function scanKeywordHits(
  transcript: string,
  patterns: { label: string; pattern: string; flags?: string }[],
): string[] {
  const hits: string[] = [];
  for (const { label, re } of compileKeywordPatterns(patterns)) {
    if (re.test(transcript)) hits.push(label);
  }
  return hits;
}

export async function computeCaseStatisticalRisk(
  caseId: string,
  transcript: string,
): Promise<{
  score: number;
  label: string;
  contributingFactors: string[];
  breakdown: { component: string; points: number }[];
  rawTotal: number;
  modelVersion: string;
}> {
  const framework = await getRiskFramework();
  const triageCfg = await getTriageConfig();

  const { rows: caseRows } = await query<{ emergency: number }>(
    "SELECT emergency FROM cases WHERE id = $1",
    [caseId],
  );
  const emergency = Boolean(caseRows[0]?.emergency);

  const { rows: flagRows } = await query<{ label: string; severity: string; status: string }>(
    `SELECT label, severity, status FROM triage_flags WHERE case_id = $1`,
    [caseId],
  );

  const keywordHits = scanKeywordHits(transcript, triageCfg.keywordPatterns);
  const result = computeStatisticalRisk({
    framework,
    keywordHits,
    triageFlags: flagRows,
    emergency,
  });

  return {
    ...result,
    modelVersion: framework.version,
  };
}

export async function persistStatisticalRisk(
  caseId: string,
  result: Awaited<ReturnType<typeof computeCaseStatisticalRisk>>,
): Promise<void> {
  await query(
    `INSERT INTO risk_assessments (id, case_id, score, contributing_factors, model_version)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      uuidv4(),
      caseId,
      result.score,
      JSON.stringify(result.contributingFactors),
      result.modelVersion,
    ],
  );
  await query("UPDATE cases SET risk_score = $2, updated_at = datetime('now') WHERE id = $1", [
    caseId,
    result.score,
  ]);
}
