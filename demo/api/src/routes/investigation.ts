import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { writeAudit } from "../services/auditService.js";
import { createMinioClient } from "../services/minioBootstrap.js";
import { getFieldNotes } from "../services/fieldNotesService.js";
import { enqueuePipelineJob } from "../services/redisClient.js";
import {
  approveDraft,
  complianceCheck,
  generateDraft,
  getLatestDraft,
  saveFieldNotes,
} from "../services/report51bService.js";
import { getOrCreateBriefing } from "../services/briefingService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();

router.get("/cases/:caseId/briefing", requireRoles("worker", "supervisor"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const briefing = await getOrCreateBriefing(caseId);
    res.json(briefing);
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/briefing/opened", requireRoles("worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    await query(
      `UPDATE cases SET briefing_opened_at = COALESCE(briefing_opened_at, datetime('now')), updated_at = datetime('now') WHERE id = $1`,
      [caseId],
    );
    const { rows } = await query<{ briefing_opened_at: string | null }>(
      `SELECT briefing_opened_at FROM cases WHERE id = $1`,
      [caseId],
    );
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "briefing.opened",
    });
    res.json({ ok: true, briefingOpenedAt: rows[0]?.briefing_opened_at ?? null });
  } catch (e) {
    next(e);
  }
});

const notesSchema = z.object({
  text: z.string().optional(),
  voiceMemoObjectKey: z.string().optional(),
});

router.get("/cases/:caseId/field-notes", requireRoles("worker", "supervisor"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    res.json(await getFieldNotes(caseId));
  } catch (e) {
    next(e);
  }
});

router.post(
  "/cases/:caseId/field-memo/audio",
  requireRoles("worker"),
  requireCaseAccess(),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const caseId = paramId(req, "caseId");
      if (!req.file?.buffer?.length) {
        res.status(400).json({ code: "BAD_REQUEST", message: "Multipart field 'file' required" });
        return;
      }

      const ext =
        req.file.originalname?.includes(".")
          ? req.file.originalname.split(".").pop()!.toLowerCase()
          : req.file.mimetype?.includes("mpeg")
            ? "mp3"
            : req.file.mimetype?.includes("mp4") || req.file.mimetype?.includes("m4a")
              ? "m4a"
              : "wav";
      const key = `field-memo/input/${caseId}/${Date.now()}.${ext}`;
      const store = createMinioClient();
      await store.putObject(key, req.file.buffer, req.file.mimetype || "application/octet-stream");

      const { rows: ps } = await query<{ stages: string }>(
        "SELECT stages FROM pipeline_state WHERE case_id = $1",
        [caseId],
      );
      const stages = ps[0]?.stages ? (JSON.parse(ps[0].stages) as Record<string, string>) : {};
      stages.field_memo = "pending";

      await query(
        `INSERT INTO pipeline_state (case_id, current_stage, stages)
         VALUES ($1, 'field_memo', $2)
         ON CONFLICT (case_id) DO UPDATE SET
           current_stage = 'field_memo',
           stages = $2,
           updated_at = datetime('now')`,
        [caseId, JSON.stringify(stages)],
      );

      await enqueuePipelineJob(caseId, "field_memo_transcribe", { audioKey: key });
      await writeAudit({
        caseId,
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        eventType: "field_memo.uploaded",
        payload: { audioKey: key, bytes: req.file.size, filename: req.file.originalname },
      });

      res.status(202).json({
        fieldMemoStatus: "pending",
        audioKey: key,
        message: "Voice memo queued for transcription",
      });
    } catch (e) {
      next(e);
    }
  },
);

router.post("/cases/:caseId/field-notes", requireRoles("worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const parsed = notesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
      return;
    }
    const text = parsed.data.text ?? "";
    await saveFieldNotes(caseId, text);
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "field_notes.saved",
      payload: { hasVoiceMemo: Boolean(parsed.data.voiceMemoObjectKey) },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/report51b/draft", requireRoles("worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const fieldNotes = String(req.body?.fieldNotes ?? "");
    if (fieldNotes) await saveFieldNotes(caseId, fieldNotes);
    const draft = await generateDraft(caseId, fieldNotes);
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "report51b.draft.generated",
    });
    res.json(draft);
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId/report51b/draft", requireRoles("worker", "supervisor"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const draft = await getLatestDraft(caseId);
    if (!draft) {
      res.status(404).json({ code: "NOT_FOUND", message: "No 51B draft" });
      return;
    }
    res.json(draft);
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/report51b/approve", requireRoles("worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const approved = Boolean(req.body?.approved);
    if (!approved) {
      res.status(400).json({ code: "BAD_REQUEST", message: "approved must be true" });
      return;
    }
    await approveDraft(caseId, req.user!.displayName, req.body?.editedContent as string | undefined);
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "report51b.approved",
    });
    res.json({ ok: true, status: "worker_approved" });
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/report51b/compliance-check", requireRoles("worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const content = String(req.body?.content ?? "");
    let text = content;
    if (!text) {
      const draft = await getLatestDraft(caseId);
      text = draft?.content ?? "";
    }
    res.json(complianceCheck(text));
  } catch (e) {
    next(e);
  }
});

export default router;
