import { toBindValue } from "./values.js";

/** Adapt PostgreSQL-oriented SQL to SQLite for the demo stack. */
export function toSqlite(text: string): string {
  return text
    .replace(/::jsonb/gi, "")
    .replace(/::int/gi, "")
    .replace(/::text/gi, "")
    .replace(/::uuid/gi, "")
    .replace(/COUNT\(\*\)::text/gi, "CAST(COUNT(*) AS TEXT)")
    .replace(/\bnow\(\)/gi, "datetime('now')")
    .replace(/NULLS LAST/gi, "")
    .replace(/NULLS FIRST/gi, "");
}

/**
 * PostgreSQL $1, $2 can repeat; SQLite needs one ? per occurrence with duplicated bind values.
 */
export function prepareQuery(
  text: string,
  params?: unknown[],
): { sql: string; args: (string | number | bigint | Buffer | null)[] } {
  const sql = toSqlite(text);
  const list = params ?? [];
  if (!/\$\d+/.test(text)) {
    return { sql, args: list.map(toBindValue) };
  }
  const order: number[] = [];
  const converted = sql.replace(/\$(\d+)/g, (_, num) => {
    const index = parseInt(num, 10) - 1;
    order.push(index);
    return "?";
  });
  const args = order.map((i) => toBindValue(list[i]));
  return { sql: converted, args };
}
