import { Router } from "express";
import { pool } from "../db/pool.js";
import { createMinioClient } from "../services/minioBootstrap.js";
import { config } from "../config.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
const pkg = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../package.json"), "utf8"),
);

router.get("/health", async (_req, res) => {
  const checks: Record<string, string> = { api: "ok" };
  try {
    await pool.query("SELECT 1");
    checks.postgres = "ok";
  } catch {
    checks.postgres = "fail";
  }
  try {
    const minio = createMinioClient();
    await minio.bucketExists(config.minio.bucket);
    checks.minio = "ok";
  } catch {
    checks.minio = "fail";
  }
  const ok = Object.values(checks).every((v) => v === "ok");
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", version: pkg.version, checks });
});

export default router;
