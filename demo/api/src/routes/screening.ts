import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { query } from "../db/pool.js";
import { requireRoles, paramId } from "../middleware/auth.js";
import { requireCaseAccess } from "../middleware/caseAccess.js";
import { assertHumanAction } from "../services/policyEngine.js";
import { writeAudit } from "../services/auditService.js";
import * as formRepo from "../repositories/form51aRepository.js";

const router = Router();

router.get("/screening/pending", requireRoles("supervisor"), async (_req, res, next) => {
  try {
    const { rows } = await query<{
      caseId: string;
      externalId: string;
      childDisplay: string | null;
      riskScore: number | null;
      emergency: boolean;
      screenerName: string | null;
      updatedAt: Date;
      triageFlagCount: number;
    }>(
      `SELECT id AS "caseId", external_id AS "externalId", child_display AS "childDisplay",
              risk_score AS "riskScore", emergency, screener_name AS "screenerName", updated_at AS "updatedAt",
              (SELECT COUNT(*)::int FROM triage_flags tf WHERE tf.case_id = cases.id) AS "triageFlagCount"
       FROM cases WHERE status = 'pending_review' ORDER BY emergency DESC, updated_at ASC`,
    );

    const items = await Promise.all(
      rows.map(async (r) => {
        let aiSummary = "";
        let aiRecommendation = "";
        const { rows: flagRows } = await query<{
          id: string;
          label: string;
          severity: string;
          evidence: string | null;
          status: string;
        }>(
          `SELECT id, label, severity, evidence, status FROM triage_flags
           WHERE case_id = $1 ORDER BY
             CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
             created_at ASC`,
          [r.caseId],
        );
        const triageFlags = flagRows.map((f) => ({
          id: f.id,
          label: f.label,
          severity: f.severity,
          evidence: f.evidence ?? undefined,
          status: f.status,
        }));
        const { rows: docs } = await query<{ content: Record<string, unknown> }>(
          `SELECT content FROM case_documents
           WHERE case_id = $1 AND doc_type = 'supervisor_summary' ORDER BY created_at DESC LIMIT 1`,
          [r.caseId],
        );
        if (docs[0]?.content) {
          aiSummary = String(docs[0].content.summary ?? "");
          const sections = (docs[0].content.sections as { title?: string; body?: string }[]) ?? [];
          if (r.emergency) {
            aiRecommendation = "Screen In — Emergency (2-Hour Response)";
          } else if ((r.riskScore ?? 0) >= 13) {
            aiRecommendation = "Screen In — Priority Response";
          } else {
            aiRecommendation = "Screen In — Non-Emergency";
          }
          if (!aiSummary && sections[0]?.body) aiSummary = sections[0].body;
        } else {
          aiSummary = "AI supervisor summary pending — review Initial Report form and risk score.";
          aiRecommendation = r.emergency
            ? "Screen In — Emergency (2-Hour Response)"
            : "Review required — advisory only";
        }
        if (triageFlags.length) {
          const flagLines = triageFlags
            .map((f) => `• ${f.label}${f.evidence ? ` (${f.evidence})` : ""} [${f.severity}]`)
            .join("\n");
          aiRecommendation = `${aiRecommendation}\n\nTriage indicators (${triageFlags.length}):\n${flagLines}`;
        }
        return {
          caseId: r.caseId,
          externalId: r.externalId,
          childDisplay: r.childDisplay ?? "Unknown child",
          riskScore: r.riskScore ?? 0,
          emergency: r.emergency,
          aiSummary,
          aiRecommendation,
          screenerName: r.screenerName ?? "Screener",
          submittedAt: r.updatedAt,
          triageFlagCount: r.triageFlagCount ?? 0,
          triageFlags,
        };
      }),
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

const DECISION_LABELS: Record<string, string> = {
  approve_screen_in: "Screen In",
  screen_out: "Screen Out",
  request_clarification: "Request Clarification",
};

router.get("/screening/screen-in", requireRoles("supervisor"), async (_req, res, next) => {
  try {
    const { rows } = await query<{
      caseId: string;
      externalId: string | null;
      childDisplay: string | null;
      status: string;
      riskScore: number | null;
      emergency: boolean;
      decision: string;
      notes: string | null;
      decidedBy: string;
      decidedAt: string;
    }>(
      `SELECT c.id AS "caseId", c.external_id AS "externalId", c.child_display AS "childDisplay",
              c.status, c.risk_score AS "riskScore", c.emergency,
              sd.decision, sd.notes, sd.decided_by AS "decidedBy", sd.created_at AS "decidedAt"
       FROM cases c
       INNER JOIN screening_decisions sd ON sd.id = (
         SELECT id FROM screening_decisions WHERE case_id = c.id ORDER BY created_at DESC LIMIT 1
       )
       WHERE sd.decision = 'approve_screen_in'
       ORDER BY sd.created_at DESC`,
    );

    const items = await Promise.all(
      rows.map(async (r) => {
        const { rows: draftRows } = await query<{ id: string }>(
          `SELECT id FROM report_51b_versions WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [r.caseId],
        );
        return {
          caseId: r.caseId,
          externalId: r.externalId ?? undefined,
          childDisplay: r.childDisplay ?? "Unknown child",
          status: r.status,
          riskScore: r.riskScore ?? 0,
          emergency: r.emergency,
          decision: r.decision,
          decisionLabel: DECISION_LABELS[r.decision] ?? r.decision,
          notes: r.notes ?? undefined,
          decidedBy: r.decidedBy,
          decidedAt: r.decidedAt,
          hasReport51b: Boolean(draftRows[0]),
        };
      }),
    );
    res.json(items);
  } catch (e) {
    next(e);
  }
});

const decisionSchema = z.object({
  decision: z.enum(["approve_screen_in", "screen_out", "request_clarification"]),
  rationale: z.string().min(5).optional(),
  responseType: z.string().optional(),
});

router.post("/screening/:caseId/decision", requireRoles("supervisor"), requireCaseAccess(), async (req, res, next) => {
  try {
    assertHumanAction("screening.decision", req.user!.role);
    const caseId = paramId(req, "caseId");
    const parsed = decisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
      return;
    }
    const { decision, rationale, responseType } = parsed.data;

    const statusMap = {
      approve_screen_in: "assigned",
      screen_out: "screened_out",
      request_clarification: "needs_clarification",
    } as const;

    await query(
      `INSERT INTO screening_decisions (id, case_id, decision, notes, decided_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), caseId, decision, rationale ?? "", req.user!.displayName],
    );
    await query("UPDATE cases SET status = $2, updated_at = now() WHERE id = $1", [
      caseId,
      statusMap[decision],
    ]);

    await writeAudit({
      caseId,
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      eventType: "screening.decision",
      payload: { decision, responseType },
    });

    const form = await formRepo.loadForm51A(caseId);
    const { rows } = await query("SELECT * FROM cases WHERE id = $1", [caseId]);
    const c = rows[0] as Record<string, unknown>;
    res.json({
      caseId: c.id,
      externalId: c.external_id,
      childDisplay: c.child_display,
      status: statusMap[decision],
      form51aCheckpointStatus: form.checkpointStatus,
      riskScore: c.risk_score,
      emergency: c.emergency,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
