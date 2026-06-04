import { asBoolean, parseJsonValue } from "./values.js";

const BOOL_COLUMNS = new Set([
  "emergency",
  "keyword_flag",
  "keywordflag",
  "required",
  "confirmed_by_human",
  "confirmedbyhuman",
  "missing",
  "multiline",
  "validated",
  "overridden",
]);

const JSON_COLUMNS = new Set([
  "content",
  "payload",
  "stages",
  "contributing_factors",
  "contributingfactors",
]);

function normalizeKey(key: string): string {
  return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/** Coerce SQLite INTEGER/JSON TEXT columns into API-friendly shapes. */
export function normalizeRow<T extends Record<string, unknown>>(row: T): T {
  const out = { ...row } as Record<string, unknown>;
  for (const [key, value] of Object.entries(row)) {
    const norm = normalizeKey(key);
    if (BOOL_COLUMNS.has(norm)) {
      out[key] = asBoolean(value);
      continue;
    }
    if (JSON_COLUMNS.has(norm)) {
      if (norm === "contributing_factors" || norm === "contributingfactors") {
        out[key] = parseJsonValue<unknown[]>(value, []);
      } else if (norm === "stages") {
        out[key] = parseJsonValue<Record<string, string>>(value, {});
      } else if (norm === "payload") {
        out[key] = parseJsonValue<Record<string, unknown>>(value, {});
      } else {
        out[key] = parseJsonValue<Record<string, unknown>>(value, {});
      }
    }
  }
  return out as T;
}

export function normalizeRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows.map((r) => normalizeRow(r));
}
