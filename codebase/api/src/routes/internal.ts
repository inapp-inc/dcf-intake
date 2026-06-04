import { Router } from "express";
import { z } from "zod";
import { requireInternalKey } from "../middleware/internalAuth.js";
import { paramId } from "../middleware/auth.js";
import * as formRepo from "../repositories/form51aRepository.js";
import { writeAudit } from "../services/auditService.js";
import { publishCaseEvent } from "../services/redisClient.js";
import { config } from "../config.js";
import type { SectionId } from "../domain/form51a/fieldCatalog.js";

const router = Router();
router.use(requireInternalKey);

const mergeSchema = z.object({
  fields: z.array(
    z.object({
      sectionId: z.enum(["child", "incident", "reporter", "household"]),
      fieldId: z.string(),
      value: z.string(),
      confidence: z.number(),
      threshold: z.number().optional(),
    }),
  ),
});

router.post("/internal/cases/:caseId/nlp-merge", async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const parsed = mergeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
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

router.post("/internal/audit", async (req, res, next) => {
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
