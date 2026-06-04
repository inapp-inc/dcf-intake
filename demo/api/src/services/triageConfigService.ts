import { query } from "../db/pool.js";

export interface KeywordPatternConfig {
  label: string;
  pattern: string;
  flags?: string;
}

export interface TriageIndicatorConfig {
  id: string;
  label: string;
  severity: "high" | "critical";
}

export interface TriageConfig {
  keywordPatterns: KeywordPatternConfig[];
  triageIndicators: TriageIndicatorConfig[];
  /** Confirmed triage flags at or above this count trigger escalation messaging */
  escalationThreshold: number;
}

export const DEFAULT_TRIAGE_CONFIG: TriageConfig = {
  keywordPatterns: [
    { label: "weapon", pattern: "\\b(gun|firearm|weapon|knife|pistol|rifle)\\b", flags: "i" },
    { label: "injury", pattern: "\\b(bruise|bruising|hit|beat|abuse|hurt)\\b", flags: "i" },
    { label: "removal", pattern: "\\b(removal|removed|foster)\\b", flags: "i" },
  ],
  triageIndicators: [
    { id: "young_child", label: "Very young child in household", severity: "high" },
    { id: "weapon", label: "Weapon present", severity: "critical" },
    { id: "prior_removal", label: "Prior removal history", severity: "high" },
    { id: "perp_in_home", label: "Perpetrator currently in home", severity: "high" },
    { id: "imminent_fear", label: "Reporter expressing imminent fear", severity: "critical" },
  ],
  escalationThreshold: 2,
};

const CONFIG_KEY = "triage";

function slugIndicatorId(id: string): string {
  return id
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizeKeywordPatterns(patterns: KeywordPatternConfig[]): KeywordPatternConfig[] {
  const out: KeywordPatternConfig[] = [];
  for (const item of patterns) {
    const label = item.label?.trim();
    const pattern = item.pattern?.trim();
    if (!label || !pattern) continue;
    out.push({ label, pattern, flags: item.flags?.trim() || "i" });
  }
  return out.length ? out : DEFAULT_TRIAGE_CONFIG.keywordPatterns;
}

function normalizeTriageIndicators(
  indicators: TriageIndicatorConfig[],
): TriageIndicatorConfig[] {
  const seen = new Set<string>();
  const out: TriageIndicatorConfig[] = [];
  for (const item of indicators) {
    const id = slugIndicatorId(item.id ?? "");
    const label = item.label?.trim() ?? "";
    if (!id || !label) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      severity: item.severity === "critical" ? "critical" : "high",
    });
  }
  return out.length ? out : DEFAULT_TRIAGE_CONFIG.triageIndicators;
}

function normalizeConfig(raw: unknown): TriageConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_TRIAGE_CONFIG };
  const obj = raw as Partial<TriageConfig>;
  return {
    keywordPatterns:
      Array.isArray(obj.keywordPatterns) && obj.keywordPatterns.length
        ? normalizeKeywordPatterns(obj.keywordPatterns)
        : DEFAULT_TRIAGE_CONFIG.keywordPatterns,
    triageIndicators:
      Array.isArray(obj.triageIndicators) && obj.triageIndicators.length
        ? normalizeTriageIndicators(obj.triageIndicators)
        : DEFAULT_TRIAGE_CONFIG.triageIndicators,
    escalationThreshold:
      typeof obj.escalationThreshold === "number" && obj.escalationThreshold >= 1
        ? Math.min(10, Math.floor(obj.escalationThreshold))
        : DEFAULT_TRIAGE_CONFIG.escalationThreshold,
  };
}

export async function getTriageConfig(): Promise<TriageConfig> {
  try {
    const { rows } = await query<{ value_json: string }>(
      "SELECT value_json FROM system_config WHERE key = $1",
      [CONFIG_KEY],
    );
    if (!rows[0]?.value_json) return { ...DEFAULT_TRIAGE_CONFIG };
    try {
      return normalizeConfig(JSON.parse(rows[0].value_json));
    } catch {
      return { ...DEFAULT_TRIAGE_CONFIG };
    }
  } catch {
    return { ...DEFAULT_TRIAGE_CONFIG };
  }
}

export async function saveTriageConfig(config: TriageConfig): Promise<TriageConfig> {
  const normalized = normalizeConfig(config);
  try {
    await query(
      `INSERT INTO system_config (key, value_json, updated_at)
       VALUES ($1, $2, datetime('now'))
       ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`,
      [CONFIG_KEY, JSON.stringify(normalized)],
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("no such table")) {
      throw new Error("system_config table missing — restart API to run migrations");
    }
    throw err;
  }
  return normalized;
}
