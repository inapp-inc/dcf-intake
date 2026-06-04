import { Router } from "express";
import { createClient } from "redis";
import { pool } from "../db/pool.js";
import { config } from "../config.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { createMinioClient } from "../services/minioBootstrap.js";

const router = Router();
router.use(requireAuth);

router.get("/admin/health", requireRoles("admin"), async (_req, res) => {
  const components: { name: string; status: "up" | "down" | "degraded" }[] = [];
  const uptime = process.uptime();
  const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

  try {
    await pool.query("SELECT 1");
    components.push({ name: "PostgreSQL", status: "up" });
  } catch {
    components.push({ name: "PostgreSQL", status: "down" });
  }

  try {
    const redis = createClient({ url: config.redisUrl });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    components.push({ name: "Redis", status: "up" });
  } catch {
    components.push({ name: "Redis", status: "down" });
  }

  try {
    const minio = createMinioClient();
    await minio.bucketExists(config.minio.bucket);
    components.push({ name: "MinIO", status: "up" });
  } catch {
    components.push({ name: "MinIO", status: "down" });
  }

  try {
    const r = await fetch(`${config.ollama.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
    components.push({ name: "Ollama", status: r.ok ? "up" : "degraded" });
  } catch {
    components.push({ name: "Ollama", status: "down" });
  }

  components.push({ name: "ai-worker (Whisper)", status: "up" });

  res.json({ uptime: uptimeStr, components });
});

router.get("/admin/models", requireRoles("admin"), async (_req, res) => {
  res.json([
    {
      name: "ASR — faster-whisper",
      version: process.env.WHISPER_MODEL ?? "base",
      status: "active",
      metric: "Runs in ai-worker container",
    },
    {
      name: `LLM — Ollama (${config.ollama.model})`,
      version: config.ollama.model,
      status: "active",
      metric: "Single SLM for NLP, triage, risk, documents, assistant",
    },
    {
      name: "Background integrations",
      version: "mock-v1",
      status: "active",
      metric: "5 parallel mock sources (not AI)",
    },
  ]);
});

export default router;
