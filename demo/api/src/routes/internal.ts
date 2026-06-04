import { Router } from "express";
import { z } from "zod";
import { paramId } from "../middleware/auth.js";
import * as formRepo from "../repositories/form51aRepository.js";
import { writeAudit } from "../services/auditService.js";
import { publishCaseEvent } from "../services/redisClient.js";
import { config } from "../config.js";
import type { SectionId } from "../domain/form51a/fieldCatalog.js";

/** Mounted at /internal in app.ts — X-Internal-Key is enforced on the mount, not here. */
const router = Router();

const mergeSchema = z.object({
  fields: z.array(
    z.object({
      sectionId: z.enum(["child", "incident", "reporter", "household", "filing"]),
      fieldId: z.string().min(1),
      value: z
        .union([z.string(), z.number(), z.boolean(), z.null()])
        .transform((v) => (v == null ? "" : String(v))),
      confidence: z.coerce.number(),
      threshold: z.coerce.number().optional(),
    }),
  ),
});

router.post("/cases/:caseId/nlp-merge", async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: "BAD_REQUEST",
        message: parsed.error.message,
        details: parsed.error.flatten(),
      });
      return;
    }
    await formRepo.mergeNlpFields(
      caseId,
      parsed.data.fields.map((f) => ({
        sectionId: f.sectionId as SectionId,
        fieldId: f.fieldId,
        value: f.value,
        confidence: f.confidence,
        threshold: f.threshold ?? config.nlpConfidenceThreshold,
      })),
    );
    const { syncIntakeToDocument } = await import("../services/form51aDocumentService.js");
    await syncIntakeToDocument(caseId);
    await writeAudit({
      caseId,
      actorId: "ai-worker",
      actorRole: "screener",
      eventType: "nlp.extraction",
      payload: { fieldCount: parsed.data.fields.length },
    });
    await publishCaseEvent(caseId, { type: "form.field.updated", source: "nlp" });
    await publishCaseEvent(caseId, {
      type: "form.checkpoint.changed",
      checkpointStatus: "ready_for_review",
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/events", async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const event = req.body as Record<string, unknown>;
    if (!event?.type) {
      res.status(400).json({ code: "BAD_REQUEST", message: "event.type required" });
      return;
    }
    publishCaseEvent(caseId, event);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/audit", async (req, res, next) => {
  try {
    const { caseId, eventType, stage } = req.body as {
      caseId?: string;
      eventType: string;
      stage?: string;
    };
    await writeAudit({
      caseId,
      actorId: "ai-worker",
      actorRole: "screener",
      eventType,
      payload: { stage },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
