import { Router } from "express";
import { pool } from "../db/pool.js";
import { config } from "../config.js";
import { requireRoles } from "../middleware/auth.js";
import { createMinioClient } from "../services/minioBootstrap.js";
import { llmHealthCheck, llmModelLabel } from "../services/llmService.js";
import {
  DEFAULT_TRIAGE_CONFIG,
  getTriageConfig,
  saveTriageConfig,
  type TriageConfig,
} from "../services/triageConfigService.js";
import { DEFAULT_RISK_FRAMEWORK } from "../domain/risk/framework.js";
import { getRiskFramework, saveRiskFramework } from "../services/riskFrameworkService.js";

const router = Router();

router.get("/admin/health", requireRoles("admin"), async (_req, res, next) => {
  try {
    const components: { name: string; status: "up" | "down" | "degraded" }[] = [];
    const uptime = process.uptime();
    const uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;

    try {
      await pool.query("SELECT 1");
      components.push({ name: "SQLite", status: "up" });
    } catch {
      components.push({ name: "SQLite", status: "down" });
    }

    components.push({ name: "Job queue (SQLite)", status: "up" });

    try {
      const store = createMinioClient();
      await store.bucketExists();
      components.push({ name: "Artifact store", status: "up" });
    } catch {
      components.push({ name: "Artifact store", status: "down" });
    }

    const llmStatus = await llmHealthCheck();
    const llmName = config.llm.provider === "ollama" ? "Ollama" : "Hugging Face";
    components.push({ name: llmName, status: llmStatus });

    components.push({ name: "ai-worker (pipeline)", status: "up" });

    res.json({ uptime: uptimeStr, components });
  } catch (e) {
    next(e);
  }
});

router.get("/admin/models", requireRoles("admin"), async (_req, res) => {
  res.json([
    {
      name: `ASR — Hugging Face (${config.asr.model})`,
      version: config.asr.model,
      status: "active",
      metric: "Cloud Whisper via HF Inference — no local ASR RAM",
    },
    {
      name: `LLM — ${config.llm.provider === "ollama" ? "Ollama" : "Hugging Face"} (${llmModelLabel()})`,
      version: llmModelLabel(),
      status: "active",
      metric: "Cloud HF Inference or local Ollama for NLP, triage, documents, assistant (risk is statistical, not LLM)",
    },
    {
      name: "Background integrations",
      version: "mock-v1",
      status: "active",
      metric: "5 parallel mock sources (not AI)",
    },
  ]);
});

router.get("/admin/triage-config", requireRoles("admin"), async (_req, res, next) => {
  try {
    const config = await getTriageConfig();
    res.json({ config, defaults: DEFAULT_TRIAGE_CONFIG });
  } catch (e) {
    next(e);
  }
});

router.put("/admin/triage-config", requireRoles("admin"), async (req, res, next) => {
  try {
    const body = req.body as TriageConfig;
    const config = await saveTriageConfig(body);
    res.json({ config });
  } catch (e) {
    next(e);
  }
});

router.get("/admin/risk-framework", requireRoles("admin"), async (_req, res, next) => {
  try {
    const config = await getRiskFramework();
    res.json({ config, defaults: DEFAULT_RISK_FRAMEWORK });
  } catch (e) {
    next(e);
  }
});

router.put("/admin/risk-framework", requireRoles("admin"), async (req, res, next) => {
  try {
    const config = await saveRiskFramework(req.body);
    res.json({ config });
  } catch (e) {
    next(e);
  }
});

export default router;
