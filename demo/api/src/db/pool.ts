import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "../config.js";
import { normalizeRows } from "./rows.js";
import { prepareQuery, toSqlite } from "./sql.js";

function resolveDbPath(url: string): string {
  if (url.startsWith("sqlite:")) {
    const path = url.replace(/^sqlite:\/\//, "").replace(/^sqlite:/, "");
    return path.startsWith("//") ? path.slice(1) : path;
  }
  return url;
}

const dbPath = resolveDbPath(config.databaseUrl);
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function getDatabase(): Database.Database {
  return db;
}

/** Run a migration file (multiple statements) atomically. */
export function execMigration(sql: string): void {
  db.exec(toSqlite(sql));
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[] }> {
  const { sql, args } = prepareQuery(text, params);
  const stmt = db.prepare(sql);
  const head = sql.trimStart().slice(0, 12).toUpperCase();
  const returnsRows =
    head.startsWith("SELECT") ||
    head.startsWith("WITH") ||
    sql.toUpperCase().includes(" RETURNING ");

  if (returnsRows) {
    return { rows: normalizeRows(stmt.all(...args) as T[]) };
  }

  stmt.run(...args);
  return { rows: [] as T[] };
}

export const pool = {
  query,
  async end() {
    db.close();
  },
};
