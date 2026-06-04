/** Values sent to better-sqlite3 (no boolean/object/undefined). */
export function toBindValue(value: unknown): string | number | bigint | Buffer | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" || typeof value === "bigint" || Buffer.isBuffer(value)) return value;
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value);
}

export function asBoolean(value: unknown): boolean {
  if (value === true || value === 1 || value === "1") return true;
  return false;
}

export function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}
