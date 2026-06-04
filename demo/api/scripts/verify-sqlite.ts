/**
 * Smoke-test SQLite bindings and migrations (run: npx tsx scripts/verify-sqlite.ts).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const dbPath = join(mkdtempSync(join(tmpdir(), "dcf-ait-")), "test.db");
process.env.DATABASE_URL = `sqlite://${dbPath}`;

const { execMigration, pool } = await import("../src/db/pool.js");
const { readFileSync, readdirSync } = await import("node:fs");
const { dirname, join: pathJoin } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const migrationsDir = pathJoin(dirname(fileURLToPath(import.meta.url)), "../migrations");

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
  execMigration(readFileSync(pathJoin(migrationsDir, file), "utf8"));
  await pool.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
}

const id = "00000000-0000-4000-8000-000000000001";
await pool.query(
  `INSERT INTO cases (id, external_id, emergency) VALUES ($1, $2, $3)`,
  [id, "51A-TEST-1", true],
);

const { rows } = await pool.query<{ emergency: boolean }>("SELECT emergency FROM cases WHERE id = $1", [id]);
if (rows[0]?.emergency !== true) throw new Error("boolean read failed");

await pool.query(
  `UPDATE cases SET emergency = $2 WHERE id = $1 AND id = $1`,
  [id, false],
);

await pool.query(
  `INSERT INTO risk_assessments (id, case_id, score, contributing_factors)
   VALUES ($1, $2, $3, $4)`,
  ["r1", id, 12, JSON.stringify(["factor-a"])],
);

const risk = await pool.query<{ contributing_factors: string[] }>(
  "SELECT contributing_factors FROM risk_assessments WHERE case_id = $1",
  [id],
);
if (!Array.isArray(risk.rows[0]?.contributing_factors) || risk.rows[0].contributing_factors[0] !== "factor-a") {
  throw new Error("JSON read failed");
}

await pool.end();
rmSync(dbPath, { force: true });
rmSync(dirname(dbPath), { recursive: true, force: true });
console.log("SQLite verify OK");
