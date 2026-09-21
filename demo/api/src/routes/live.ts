import { Router } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import { requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { writeAudit } from "../services/auditService.js";
import { createMinioClient } from "../services/minioBootstrap.js";
import { registerCaseAudioArtifact } from "../services/audioRetentionService.js";
import { enqueuePipelineJob } from "../services/redisClient.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

async function getCaseLiveState(caseId: string) {
  const { rows } = await query<{
    live_session_status: string;
    live_session_id: string | null;
    live_started_at: string | null;
  }>(
    `SELECT live_session_status, live_session_id, live_started_at FROM cases WHERE id = $1`,
    [caseId],
  );
  return rows[0] ?? null;
}

async function pipelineHasActiveUpload(caseId: string): Promise<boolean> {
  const { rows } = await query<{ stages: string | null }>(
    "SELECT stages FROM pipeline_state WHERE case_id = $1",
    [caseId],
  );
  if (!rows[0]?.stages) return false;
  const stages = JSON.parse(rows[0].stages) as Record<string, string>;
  const tx = stages.transcription;
  return tx === "pending" || tx === "running";
}

router.get(
  "/cases/:caseId/live/status",
  requireRoles("screener"),
  requireCaseAccess(),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const state = await getCaseLiveState(caseId);
      if (!state) {
        res.status(404).json({ code: "NOT_FOUND", message: "Case not found" });
        return;
      }
      const { rows: chunkRows } = await query<{ count: number }>(
        "SELECT COUNT(*) AS count FROM transcript_segments WHERE case_id = $1 AND speaker = 'L'",
        [caseId],
      );
      res.json({
        status: state.live_session_status,
        sessionId: state.live_session_id,
        startedAt: state.live_started_at,
        chunkCount: chunkRows[0]?.count ?? 0,
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/cases/:caseId/live/start",
  requireRoles("screener"),
  requireCaseAccess(),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const state = await getCaseLiveState(caseId);
      if (!state) {
        res.status(404).json({ code: "NOT_FOUND", message: "Case not found" });
        return;
      }
      if (state.live_session_status === "recording") {
        res.status(409).json({ code: "CONFLICT", message: "Live session already recording" });
        return;
      }
      if (await pipelineHasActiveUpload(caseId)) {
        res.status(409).json({
          code: "CONFLICT",
          message: "File upload transcription in progress — wait or use a new case",
        });
        return;
      }

      const sessionId = uuidv4();
      await query(
        `UPDATE cases SET live_session_status = 'recording', live_session_id = $2,
         live_started_at = datetime('now'), updated_at = datetime('now') WHERE id = $1`,
        [caseId, sessionId],
      );
      await query(
        `INSERT INTO pipeline_state (case_id, current_stage, stages)
         VALUES ($1, 'live_transcription', $2)
         ON CONFLICT (case_id) DO UPDATE SET
           current_stage = 'live_transcription',
           stages = $2,
           updated_at = datetime('now')`,
        [caseId, JSON.stringify({ live_transcription: "running", transcription: "running" })],
      );

      await query(
        `INSERT INTO assistant_messages (id, case_id, msg_type, message)
         VALUES ($1, $2, 'info', $3)`,
        [
          uuidv4(),
          caseId,
          "Live demo call started. Transcript, form fields, and pending required items will update in the sidebar every few seconds as audio is processed.",
        ],
      );

      await writeAudit({
        caseId,
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        eventType: "live.session.started",
        payload: { sessionId },
      });

      res.status(201).json({
        sessionId,
        status: "recording",
        currentStage: "live_transcription",
        stages: { live_transcription: "running", transcription: "running" },
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/cases/:caseId/live/chunks",
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

      const state = await getCaseLiveState(caseId);
      if (!state || state.live_session_status !== "recording" || !state.live_session_id) {
        res.status(409).json({ code: "CONFLICT", message: "No active live recording session" });
        return;
      }

      const chunkIndex = Number(req.body?.chunkIndex ?? 0);
      const durationMs = Number(req.body?.durationMs ?? 0);
      const sessionId = String(req.body?.sessionId ?? state.live_session_id);
      if (sessionId !== state.live_session_id) {
        res.status(409).json({ code: "CONFLICT", message: "Session ID mismatch" });
        return;
      }

      const key = `audio/live/${caseId}/${sessionId}/${String(chunkIndex).padStart(5, "0")}.webm`;
      const store = createMinioClient();
      await store.putObject(key, req.file.buffer, req.file.mimetype || "audio/webm");
      await registerCaseAudioArtifact({
        caseId,
        audioKey: key,
        source: "live",
        sessionId,
        chunkIndex,
        byteSize: req.file.buffer.length,
      });

      await enqueuePipelineJob(caseId, "live_chunk", {
        audioKey: key,
        chunkIndex,
        durationMs,
        sessionId,
      });

      res.status(202).json({ ok: true, chunkIndex, audioKey: key });
    } catch (e) {
      next(e);
    }
  },
);

router.post(
  "/cases/:caseId/live/end",
  requireRoles("screener"),
  requireCaseAccess(),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      const state = await getCaseLiveState(caseId);
      if (!state || state.live_session_status !== "recording") {
        res.status(409).json({ code: "CONFLICT", message: "No active live recording session" });
        return;
      }

      const sessionId = state.live_session_id;
      await query(
        `UPDATE cases SET live_session_status = 'ended', updated_at = datetime('now') WHERE id = $1`,
        [caseId],
      );

      await enqueuePipelineJob(caseId, "live_end", { sessionId });

      await writeAudit({
        caseId,
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        eventType: "live.session.ended",
        payload: { sessionId },
      });

      res.status(202).json({
        ok: true,
        status: "ended",
        sessionId,
        message: "Finalizing transcript and running triage…",
      });
    } catch (e) {
      next(e);
    }
  },
);

export default router;
