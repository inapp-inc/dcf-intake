import { Router } from "express";
import { z } from "zod";
import { requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { query } from "../db/pool.js";
import * as formRepo from "../repositories/form51aRepository.js";
import { completeForm51aCheckpoint } from "../usecases/form51a/completeCheckpoint.js";
import {
  documentToOfficialPayload,
  getDocumentForOfficialForm,
  saveOfficialFormFields,
  syncIntakeToDocument,
} from "../services/form51aDocumentService.js";
import { renderOfficial51AHtml, officialFormSaveUrl } from "../adapters/officialFormRenderer.js";
import { writeAudit } from "../services/auditService.js";
import { enqueuePipelineJob } from "../services/redisClient.js";

const router = Router();

async function officialFormContext(caseId: string) {
  const { rows: caseRows } = await query<{ external_id: string | null; risk_score: number | null }>(
    "SELECT external_id, risk_score FROM cases WHERE id = $1",
    [caseId],
  );
  const { rows: riskRows } = await query<{ contributing_factors: string[] }>(
    `SELECT contributing_factors FROM risk_assessments WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [caseId],
  );
  return {
    externalId: caseRows[0]?.external_id ?? undefined,
    riskScore: caseRows[0]?.risk_score ?? null,
    riskFactors: riskRows[0]?.contributing_factors ?? [],
  };
}

router.get("/cases/:caseId/form51a", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const form = await formRepo.loadForm51A(caseId);
    res.json(form);
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId/form51a/document", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const ctx = await officialFormContext(caseId);
    const doc = await getDocumentForOfficialForm(caseId, ctx);
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  fields: z.array(
    z.object({
      sectionId: z.enum(["child", "incident", "reporter", "household", "filing"]),
      fieldId: z.string(),
      value: z.string(),
    }),
  ),
});

router.patch("/cases/:caseId/form51a", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
      return;
    }
    const caseId = paramId(req, "caseId");
    await formRepo.updateFields(caseId, parsed.data.fields);
    const status = await formRepo.getCheckpointStatus(caseId);
    if (status === "not_started" || status === "ai_populating") {
      await formRepo.setCheckpointStatus(caseId, "incomplete");
    }
    const ctx = await officialFormContext(caseId);
    await syncIntakeToDocument(caseId, ctx);
    const form = await formRepo.loadForm51A(caseId);
    res.json(form);
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/form51a/confirm-section", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const sectionId = req.body?.sectionId;
    if (!sectionId) {
      res.status(400).json({ code: "BAD_REQUEST", message: "sectionId required" });
      return;
    }
    const caseId = paramId(req, "caseId");
    await formRepo.confirmSection(caseId, sectionId);
    res.json(await formRepo.loadForm51A(caseId));
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/form51a/reextract", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
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
    const cleanText = rows
      .map((r) => `${r.speaker === "S" ? "Screener" : "Caller"}: ${r.text}`)
      .join("\n");
    await formRepo.resetPipelineStage(caseId, "nlp", "pending");
    await formRepo.setCheckpointStatus(caseId, "ai_populating");
    await enqueuePipelineJob(caseId, "nlp", { cleanText, force: true, reextract: true });
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "form51a.reextract",
    });
    res.json({ ok: true, message: "Field re-extraction queued" });
  } catch (e) {
    next(e);
  }
});

router.post("/cases/:caseId/form51a/complete-checkpoint", requireRoles("screener"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const result = await completeForm51aCheckpoint(caseId);
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "form51a.checkpoint.completed",
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId/form51a/official", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "form51a.official.opened",
    });
    const form = await formRepo.loadForm51A(caseId);
    const ctx = await officialFormContext(caseId);
    const doc = await getDocumentForOfficialForm(caseId, ctx);
    const payload = documentToOfficialPayload(doc);
    const draft = form.checkpointStatus !== "complete" && form.checkpointStatus !== "locked";
    const html = renderOfficial51AHtml(payload, {
      draft,
      caseLabel: ctx.externalId ?? caseId.slice(0, 8),
      caseId,
      saveUrl: officialFormSaveUrl(caseId),
    });
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'",
    );
    res.type("html").send(html);
  } catch (e) {
    next(e);
  }
});

const saveOfficialSchema = z.object({
  fields: z.record(z.union([z.string(), z.boolean()])),
});

router.post(
  "/cases/:caseId/form51a/official/save",
  requireRoles("screener", "supervisor", "worker"),
  requireCaseAccess(),
  async (req, res, next) => {
    try {
      const parsed = saveOfficialSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
        return;
      }
      const caseId = paramId(req, "caseId");
      const doc = await saveOfficialFormFields(caseId, parsed.data.fields);
      await writeAudit({
        caseId,
        actorId: req.user!.userId,
        actorRole: req.user!.role,
        eventType: "form51a.official.saved",
      });
      res.json({ ok: true, document: doc });
    } catch (e) {
      next(e);
    }
  },
);

router.get("/cases/:caseId/form51a/official/field-map", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const ctx = await officialFormContext(caseId);
    const doc = await getDocumentForOfficialForm(caseId, ctx);
    res.json(documentToOfficialPayload(doc));
  } catch (e) {
    next(e);
  }
});

export default router;
