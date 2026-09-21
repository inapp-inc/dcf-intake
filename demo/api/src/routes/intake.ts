import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { query } from "../db/pool.js";
import { writeAudit } from "../services/auditService.js";
import { llmChat } from "../services/llmService.js";
import {
  HF_MAX_ASSISTANT_CONTEXT_CHARS,
  HF_MAX_ASSISTANT_USER_CHARS,
  HF_MAX_TRANSCRIPT_CHARS,
  truncateForLlm,
} from "../utils/llmPrompt.js";
import * as formRepo from "../repositories/form51aRepository.js";
import type { Form51A } from "../domain/form51a/types.js";

function buildAssistantContext(
  form: Form51A,
  transcriptLines: { speaker: string; text: string }[],
): string {
  const fieldLines: string[] = [];
  for (const section of Object.values(form.sections)) {
    for (const [fieldId, f] of Object.entries(section.fields)) {
      if (f.value.trim()) {
        fieldLines.push(`${fieldId}: ${f.value.trim()}`);
      }
    }
  }
  const transcript = truncateForLlm(
    transcriptLines
      .map((l) =>
        l.speaker === "L" ? l.text : `${l.speaker === "S" ? "Screener" : "Caller"}: ${l.text}`,
      )
      .join("\n"),
    HF_MAX_TRANSCRIPT_CHARS,
  );
  return truncateForLlm(
    [
      `Checkpoint: ${form.checkpointStatus}`,
      fieldLines.length ? `Form fields:\n${fieldLines.join("\n")}` : "Form fields: (none populated yet)",
      transcript ? `Transcript:\n${transcript}` : "Transcript: (not available)",
    ].join("\n\n"),
    HF_MAX_ASSISTANT_CONTEXT_CHARS,
  );
}

const router = Router();

router.get("/cases/:caseId/transcript", requireRoles("screener", "supervisor", "worker"), requireCaseAccess("caseId", "read"), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "transcript.accessed",
    });
    const { rows } = await query<{
      speaker: string;
      text: string;
      keywordFlag: boolean;
    }>(
      `SELECT speaker, text, keyword_flag AS "keywordFlag"
       FROM transcript_segments WHERE case_id = $1 ORDER BY offset_ms NULLS LAST, created_at`,
      [caseId],
    );
    res.json({ segments: rows });
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId/risk", requireRoles("screener", "supervisor", "worker"), requireCaseAccess("caseId", "read"), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { riskLabelForScore } = await import("../domain/risk/framework.js");
    const { getRiskFramework } = await import("../services/riskFrameworkService.js");
    const framework = await getRiskFramework();
    const { rows } = await query<{
      score: number;
      contributing_factors: string[];
      model_version: string;
    }>(
      `SELECT score, contributing_factors, model_version FROM risk_assessments
       WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [caseId],
    );
    if (rows[0]) {
      const score = rows[0].score;
      const label = riskLabelForScore(framework, score);
      res.json({
        status: "ready",
        score,
        label,
        modelVersion: rows[0].model_version,
        contributingFactors: rows[0].contributing_factors,
        advisoryOnly: true,
      });
      return;
    }

    const { rows: pipeRows } = await query<{ stages: Record<string, string> }>(
      `SELECT stages FROM pipeline_state WHERE case_id = $1`,
      [caseId],
    );
    const riskStage = pipeRows[0]?.stages?.risk;
    const status =
      riskStage === "running" || riskStage === "pending"
        ? "running"
        : riskStage === "failed"
          ? "failed"
          : "pending";

    res.json({
      status,
      score: null,
      label: status === "running" ? "Scoring…" : status === "failed" ? "Unavailable" : "Pending",
      contributingFactors:
        status === "failed"
          ? ["Risk scoring did not complete — pipeline will retry on next intake or contact support."]
          : [],
      advisoryOnly: true,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/risk/recompute", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query<{ speaker: string; text: string }>(
      `SELECT speaker, text FROM transcript_segments WHERE case_id = $1 ORDER BY offset_ms NULLS LAST, created_at`,
      [caseId],
    );
    if (!rows.length) {
      res.status(400).json({ code: "NO_TRANSCRIPT", message: "No transcript — upload audio first." });
      return;
    }
    const transcript = rows
      .map((r) => `${r.speaker === "S" ? "Screener" : "Caller"}: ${r.text}`)
      .join("\n");
    const { computeCaseStatisticalRisk, persistStatisticalRisk } = await import(
      "../services/riskScoringService.js"
    );
    const result = await computeCaseStatisticalRisk(caseId, transcript);
    await persistStatisticalRisk(caseId, result);
    res.json({ ok: true, score: result.score, label: result.label, message: "Statistical risk score updated" });
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/risk/override", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const reason = String(req.body?.reason ?? "");
    if (reason.length < 10) {
      res.status(400).json({ code: "BAD_REQUEST", message: "reason min 10 chars" });
      return;
    }
    const { rows } = await query(
      `SELECT score FROM risk_assessments WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [caseId],
    );
    await query(
      `UPDATE risk_assessments SET overridden = 1, override_reason = $2 WHERE case_id = $1`,
      [caseId, reason],
    );
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "risk.override",
      payload: { priorScore: rows[0]?.score, reason },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId/triage-flags", requireRoles("screener", "supervisor", "worker"), requireCaseAccess("caseId", "read"), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query(
      `SELECT id, label, severity, evidence, status FROM triage_flags WHERE case_id = $1`,
      [caseId],
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

const triageSchema = z.object({
  flagId: z.string().uuid(),
  action: z.enum(["confirm", "dismiss"]),
  dismissalReason: z.string().optional(),
});

router.post("/cases/:caseId/triage-decisions", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const parsed = triageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
      return;
    }
    const { flagId, action, dismissalReason } = parsed.data;
    if (action === "dismiss" && (!dismissalReason || dismissalReason.length < 5)) {
      res.status(400).json({ code: "BAD_REQUEST", message: "dismissalReason required" });
      return;
    }
    const status = action === "confirm" ? "confirmed" : "dismissed";
    const { rows } = await query(
      `UPDATE triage_flags SET status = $3 WHERE id = $1 AND case_id = $2 RETURNING *`,
      [flagId, caseId, status],
    );
    if (!rows[0]) {
      res.status(404).json({ code: "NOT_FOUND", message: "Flag not found" });
      return;
    }
    const confirmed = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM triage_flags WHERE case_id = $1 AND status = 'confirmed'`,
      [caseId],
    );
    if (parseInt(confirmed.rows[0].count, 10) >= 2) {
      await query("UPDATE cases SET emergency = 1 WHERE id = $1", [caseId]);
    }
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

router.get(
  "/cases/:caseId/background-checks",
  requireRoles("screener", "supervisor", "worker"),
  requireCaseAccess(),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const { rows } = await query<{ source: string; status: string; result_summary: string | null }>(
        `SELECT source AS name, status, result_summary FROM background_check_runs WHERE case_id = $1`,
        [caseId],
      );
      res.json({
        sources: rows.map((r) => ({
          name: r.source,
          status: r.status,
          recordFound: r.result_summary?.toLowerCase().includes("found") ?? null,
        })),
        summaryAvailable: rows.length > 0 && rows.every((r) => r.status === "complete"),
      });
    } catch (e) {
      next(e);
    }
  },
);

router.get("/cases/:caseId/assistant-messages", requireRoles("screener", "supervisor", "worker"), requireCaseAccess("caseId", "read"), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query<{
      id: string;
      msg_type: string;
      message: string;
      field_jump: string | null;
    }>(
      `SELECT id, msg_type, message, field_jump FROM assistant_messages
       WHERE case_id = $1 ORDER BY created_at`,
      [caseId],
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        type: r.msg_type,
        message: r.message,
        fieldJump: r.field_jump ?? undefined,
      })),
    );
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/assistant-messages", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const userMsg = String(req.body?.message ?? "").trim();
    if (!userMsg) {
      res.status(400).json({ code: "BAD_REQUEST", message: "message required" });
      return;
    }
    if (userMsg.length > HF_MAX_ASSISTANT_USER_CHARS) {
      res.status(400).json({
        code: "BAD_REQUEST",
        message: `Message too long (max ${HF_MAX_ASSISTANT_USER_CHARS} characters)`,
      });
      return;
    }
    await query(
      `INSERT INTO assistant_messages (id, case_id, msg_type, message) VALUES ($1, $2, 'user', $3)`,
      [uuidv4(), caseId, userMsg],
    );
    const form = await formRepo.loadForm51A(caseId);
    const { rows: transcriptRows } = await query<{ speaker: string; text: string }>(
      `SELECT speaker, text FROM transcript_segments WHERE case_id = $1 ORDER BY offset_ms NULLS LAST, created_at`,
      [caseId],
    );
    const context = buildAssistantContext(form, transcriptRows);
    let reply: string;
    try {
      reply = await llmChat(
        "You are the child welfare intake assistant. Be concise. Answer from the transcript and form fields provided. Reference form completeness and triage when relevant. No legal determinations.",
        `${context}\n\nUser question: ${userMsg}`,
        { maxTokens: 512 },
      );
    } catch (err) {
      console.warn("Assistant LLM call failed:", err instanceof Error ? err.message : err);
      reply = "Assistant is temporarily unavailable. Please continue manual review.";
    }
    const replyId = uuidv4();
    await query(
      `INSERT INTO assistant_messages (id, case_id, msg_type, message) VALUES ($1, $2, 'info', $3)`,
      [replyId, caseId, reply],
    );
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "assistant.interaction",
    });
    res.json({ id: replyId, type: "info", message: reply });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/cases/:caseId/supervisor-summary",
  requireRoles("screener", "supervisor", "worker"),
  requireCaseAccess(),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const { rows } = await query<{
        content: Record<string, unknown>;
        validated: boolean;
        model_version: string | null;
      }>(
        `SELECT content, validated, model_version FROM case_documents
         WHERE case_id = $1 AND doc_type = 'supervisor_summary'
         ORDER BY created_at DESC LIMIT 1`,
        [caseId],
      );
      if (!rows[0]) {
        res.status(404).json({ code: "NOT_FOUND", message: "Supervisor summary not ready" });
        return;
      }
      res.json({
        ...rows[0].content,
        validated: rows[0].validated,
        modelVersion: rows[0].model_version,
        advisoryOnly: true,
      });
    } catch (e) {
      next(e);
    }
  },
);

router.get("/cases/:caseId/pipeline", requireRoles("screener", "supervisor", "worker"), requireCaseAccess("caseId", "read"), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query<{ current_stage: string; stages: Record<string, string> }>(
      `SELECT current_stage, stages FROM pipeline_state WHERE case_id = $1`,
      [caseId],
    );
    if (!rows[0]) {
      res.json({ currentStage: "pending", stages: {} });
      return;
    }
    res.json({ currentStage: rows[0].current_stage, stages: rows[0].stages });
  } catch (e) {
    next(e);
  }
});

router.get(
  "/cases/:caseId/audio/artifacts",
  requireRoles("screener", "supervisor", "worker"),
  requireCaseAccess("caseId", "read"),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const { listCaseAudioArtifacts } = await import("../services/audioRetentionService.js");
      const artifacts = await listCaseAudioArtifacts(caseId);
      res.json({
        artifacts: artifacts.map((a) => ({
          id: a.id,
          source: a.source,
          sessionId: a.sessionId,
          chunkIndex: a.chunkIndex,
          byteSize: a.byteSize,
          transcribed: a.transcribed,
          createdAt: a.createdAt,
          label:
            a.source === "live"
              ? `Live segment ${a.chunkIndex != null ? a.chunkIndex + 1 : ""}`.trim()
              : "Uploaded recording",
        })),
      });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  "/cases/:caseId/audio/artifacts/:artifactId",
  requireRoles("screener", "supervisor", "worker"),
  requireCaseAccess("caseId", "read"),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const artifactId = paramId(req, "artifactId");
      const { getCaseAudioArtifact, readArtifactBytes } = await import("../services/audioRetentionService.js");
      const artifact = await getCaseAudioArtifact(caseId, artifactId);
      if (!artifact) {
        res.status(404).json({ code: "NOT_FOUND", message: "Audio artifact not found" });
        return;
      }
      const bytes = readArtifactBytes(artifact.audioKey);
      const ext = artifact.audioKey.split(".").pop()?.toLowerCase() ?? "webm";
      const mime =
        ext === "mp3" || ext === "mpeg"
          ? "audio/mpeg"
          : ext === "wav"
            ? "audio/wav"
            : ext === "m4a" || ext === "mp4"
              ? "audio/mp4"
              : "audio/webm";
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Length", String(bytes.length));
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.send(bytes);
    } catch (e) {
      next(e);
    }
  },
);

export default router;
