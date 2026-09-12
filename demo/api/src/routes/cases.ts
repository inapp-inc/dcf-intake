import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { writeAudit } from "../services/auditService.js";
import { seedFormFieldsForCase } from "../repositories/form51aRepository.js";
import { submitCaseToSupervisor } from "../usecases/form51a/submitToSupervisor.js";
import { createMinioClient } from "../services/minioBootstrap.js";
import { config } from "../config.js";
import { enqueuePipelineJob } from "../services/redisClient.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.get("/cases", requireRoles("screener", "supervisor", "worker", "admin"), async (req, res, next) => {
  try {
    if (req.user!.role === "admin") {
      const { rows } = await query(
        `SELECT id AS "caseId", external_id AS "externalId", child_display AS "childDisplay", status,
                form51a_checkpoint_status AS "form51aCheckpointStatus",
                risk_score AS "riskScore", triage_flag_count AS "triageFlagCount",
                emergency, updated_at AS "updatedAt", briefing_opened_at AS "briefingOpenedAt",
                (SELECT status FROM report_51b_versions r WHERE r.case_id = cases.id
                 ORDER BY r.created_at DESC LIMIT 1) AS "report51bStatus"
         FROM cases ORDER BY updated_at DESC LIMIT 100`,
      );
      res.json({ items: rows });
      return;
    }
    const statusFilter = req.query.status as string | undefined;
    let sql = `SELECT id AS "caseId", external_id AS "externalId", child_display AS "childDisplay", status,
              form51a_checkpoint_status AS "form51aCheckpointStatus",
              risk_score AS "riskScore", triage_flag_count AS "triageFlagCount",
              emergency, updated_at AS "updatedAt", briefing_opened_at AS "briefingOpenedAt",
              (SELECT status FROM report_51b_versions r WHERE r.case_id = cases.id
               ORDER BY r.created_at DESC LIMIT 1) AS "report51bStatus"
       FROM cases`;
    const params: string[] = [];
    if (req.user!.role === "worker") {
      sql += ` WHERE status IN ('assigned', 'report_submitted')`;
    } else if (statusFilter) {
      sql += ` WHERE status = $1`;
      params.push(statusFilter);
    }
    sql += ` ORDER BY updated_at DESC LIMIT 100`;
    const { rows } = await query(sql, params);
    res.json({ items: rows });
  } catch (e) {
    next(e);
  }
});

router.post("/cases", requireRoles("screener"), async (req, res, next) => {
  try {
    const id = uuidv4();
    const externalId = `IR-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const emergency = Boolean(req.body?.emergencyHint);
    await query(
      `INSERT INTO cases (id, external_id, emergency, area_office)
       VALUES ($1, $2, $3, $4)`,
      [id, externalId, emergency ? 1 : 0, req.user!.areaOffice ?? "Springfield"],
    );
    await seedFormFieldsForCase(id);
    await writeAudit({
      caseId: id,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "case.created",
    });
    res.status(201).json({
      caseId: id,
      externalId,
      status: "in_progress",
      form51aCheckpointStatus: "not_started",
      emergency,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query("SELECT * FROM cases WHERE id = $1", [caseId]);
    if (!rows[0]) {
      res.status(404).json({ code: "NOT_FOUND", message: "Case not found" });
      return;
    }
    const c = rows[0] as Record<string, unknown>;
    res.json({
      caseId: c.id,
      externalId: c.external_id,
      childDisplay: c.child_display,
      status: c.status,
      form51aCheckpointStatus: c.form51a_checkpoint_status,
      riskScore: c.risk_score,
      triageFlagCount: c.triage_flag_count,
      emergency: c.emergency,
      briefingOpenedAt: c.briefing_opened_at ?? null,
      report51bStatus:
        (
          await query<{ status: string }>(
            `SELECT status FROM report_51b_versions WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [caseId],
          )
        ).rows[0]?.status ?? null,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/cases/:caseId/audio",
  requireRoles("screener"),
  requireCaseAccess(),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      if (!req.file?.buffer?.length) {
        res.status(400).json({ code: "BAD_REQUEST", message: "Multipart field 'file' required" });
        return;
      }
      const { rows: caseRows } = await query("SELECT id FROM cases WHERE id = $1", [caseId]);
      if (!caseRows[0]) {
        res.status(404).json({ code: "NOT_FOUND", message: "Case not found" });
        return;
      }

      const ext =
        req.file.originalname?.includes(".")
          ? req.file.originalname.split(".").pop()!
          : req.file.mimetype?.includes("mpeg")
            ? "mp3"
            : "wav";
      const key = `audio/input/${caseId}/${Date.now()}.${ext}`;
      const store = createMinioClient();
      await store.putObject(key, req.file.buffer, req.file.mimetype || "application/octet-stream");

      await query(
        `INSERT INTO pipeline_state (case_id, current_stage, stages)
         VALUES ($1, 'transcription', $2)
         ON CONFLICT (case_id) DO UPDATE SET
           current_stage = 'transcription',
           stages = $2,
           updated_at = datetime('now')`,
        [caseId, JSON.stringify({ transcription: "pending" })],
      );

      await enqueuePipelineJob(caseId, "transcribe", { audioKey: key });
      await writeAudit({
        caseId,
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        eventType: "audio.uploaded",
        payload: { audioKey: key, bytes: req.file.size },
      });

      res.status(202).json({
        currentStage: "transcription",
        stages: { transcription: "pending" },
        audioKey: key,
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post("/cases/:caseId/submit", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const result = await submitCaseToSupervisor(caseId);
    await query("UPDATE cases SET screener_name = $2 WHERE id = $1", [
      caseId,
      req.user!.displayName,
    ]);
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "case.submitted",
    });
    const { rows } = await query(
      `SELECT id AS "caseId", external_id AS "externalId", status, child_display AS "childDisplay",
              form51a_checkpoint_status AS "form51aCheckpointStatus", risk_score AS "riskScore",
              emergency, triage_flag_count AS "triageFlagCount"
       FROM cases WHERE id = $1`,
      [caseId],
    );
    res.json({ ...result, ...rows[0] });
  } catch (e) {
    next(e);
  }
});

export default router;
