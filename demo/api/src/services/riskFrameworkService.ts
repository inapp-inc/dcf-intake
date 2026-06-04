import { DEFAULT_RISK_FRAMEWORK, normalizeRiskFramework, type RiskFramework } from "../domain/risk/framework.js";
import { query } from "../db/pool.js";

const CONFIG_KEY = "risk_framework";

export async function getRiskFramework(): Promise<RiskFramework> {
  const { rows } = await query<{ value_json: string }>(
    "SELECT value_json FROM system_config WHERE key = $1",
    [CONFIG_KEY],
  );
  if (!rows[0]?.value_json) return { ...DEFAULT_RISK_FRAMEWORK };
  try {
    return normalizeRiskFramework(JSON.parse(rows[0].value_json));
  } catch {
    return { ...DEFAULT_RISK_FRAMEWORK };
  }
}

export async function saveRiskFramework(body: unknown): Promise<RiskFramework> {
  const config = normalizeRiskFramework(body);
  await query(
    `INSERT INTO system_config (key, value_json, updated_at)
     VALUES ($1, $2, datetime('now'))
     ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json, updated_at = datetime('now')`,
    [CONFIG_KEY, JSON.stringify(config)],
  );
  return config;
}
