import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import * as formRepo from "../repositories/form51aRepository.js";
import { completeForm51aCheckpoint } from "../usecases/form51a/completeCheckpoint.js";
import { mapReport51aToOfficialFields } from "../adapters/officialFormMapper.js";
import { renderOfficial51AHtml } from "../adapters/officialFormRenderer.js";
import { writeAudit } from "../services/auditService.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const router = Router();
router.use(requireAuth);

router.get("/cases/:caseId/form51a", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const form = await formRepo.loadForm51A(paramId(req, "caseId"));
    res.json(form);
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  fields: z.array(
    z.object({
      sectionId: z.enum(["child", "incident", "reporter", "household"]),
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
    const payload = mapReport51aToOfficialFields(form);
    const draft = form.checkpointStatus !== "complete" && form.checkpointStatus !== "locked";
    const html = renderOfficial51AHtml(payload, { draft });
    res.type("html").send(html);
  } catch (e) {
    next(e);
  }
});

router.get("/cases/:caseId/form51a/official/field-map", requireRoles("screener", "supervisor", "worker"), requireCaseAccess(), async (req, res, next) => {
  try {
    const form = await formRepo.loadForm51A(paramId(req, "caseId"));
    res.json(mapReport51aToOfficialFields(form));
  } catch (e) {
    next(e);
  }
});

export default router;
