import { Router } from "express";
import { pool } from "../db/pool.js";
import { bucketReady } from "../services/artifactStore.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../package.json"), "utf8"),
);

router.get("/health", async (_req, res) => {
  const checks: Record<string, string> = { api: "ok", stack: "demo-sqlite" };
  try {
    await pool.query("SELECT 1");
    checks.sqlite = "ok";
  } catch {
    checks.sqlite = "fail";
  }
  try {
    if (await bucketReady()) checks.artifacts = "ok";
    else checks.artifacts = "fail";
  } catch {
    checks.artifacts = "fail";
  }
  const ok = Object.values(checks).every((v) => v === "ok" || v === "demo-sqlite");
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", version: pkg.version, checks });
});

export default router;
