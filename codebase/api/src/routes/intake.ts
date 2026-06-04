import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { query } from "../db/pool.js";
import { writeAudit } from "../services/auditService.js";
import { ollamaChat } from "../services/ollamaService.js";
import * as formRepo from "../repositories/form51aRepository.js";

const router = Router();
router.use(requireAuth);

router.get("/cases/:caseId/transcript", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
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

router.get("/cases/:caseId/risk", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query<{
      score: number;
      contributing_factors: string[];
      model_version: string;
    }>(
      `SELECT score, contributing_factors, model_version FROM risk_assessments
       WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [caseId],
    );
    if (!rows[0]) {
      res.status(404).json({ code: "NOT_FOUND", message: "Risk assessment not ready" });
      return;
    }
    const score = rows[0].score;
    const label = score >= 15 ? "High" : score >= 10 ? "Moderate" : "Lower";
    res.json({
      score,
      label,
      modelVersion: rows[0].model_version,
      contributingFactors: rows[0].contributing_factors,
      advisoryOnly: true,
    });
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
      `UPDATE risk_assessments SET overridden = true, override_reason = $2 WHERE case_id = $1`,
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

router.get("/cases/:caseId/triage-flags", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
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
      await query("UPDATE cases SET emergency = true WHERE id = $1", [caseId]);
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

router.get("/cases/:caseId/assistant-messages", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
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
    await query(
      `INSERT INTO assistant_messages (case_id, msg_type, message) VALUES ($1, 'user', $2)`,
      [caseId, userMsg],
    );
    const form = await formRepo.loadForm51A(caseId);
    let reply: string;
    try {
      reply = await ollamaChat(
        "You are the DCF AIT intake assistant. Be concise. Reference form completeness and triage. No legal determinations.",
        `Case form checkpoint: ${form.checkpointStatus}. User: ${userMsg}`,
      );
    } catch {
      reply = "Assistant is temporarily unavailable. Please continue manual review.";
    }
    const { rows } = await query<{ id: string }>(
      `INSERT INTO assistant_messages (case_id, msg_type, message) VALUES ($1, 'info', $2) RETURNING id`,
      [caseId, reply],
    );
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "assistant.interaction",
    });
    res.json({ id: rows[0].id, type: "info", message: reply });
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

router.get("/cases/:caseId/pipeline", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
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

export default router;
