import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { writeAudit } from "../services/auditService.js";
import {
  approveDraft,
  complianceCheck,
  generateDraft,
  getLatestDraft,
  saveFieldNotes,
} from "../services/report51bService.js";
import { getOrCreateBriefing } from "../services/briefingService.js";

const router = Router();
router.use(requireAuth);

router.get("/cases/:caseId/briefing", requireRoles("worker", "supervisor"), requireCaseAccess(), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const briefing = await getOrCreateBriefing(caseId);
    res.json(briefing);
  } catch (e) {
    next(e);
  }
});

const notesSchema = z.object({
  text: z.string().optional(),
  voiceMemoObjectKey: z.string().optional(),
});

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
