import { Router } from "express";
import { query } from "../db/pool.js";
import { requireRoles, paramId } from "../middleware/auth.js";

const router = Router();

router.get("/audit/cases/:caseId", requireRoles("supervisor", "admin"), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const { rows } = await query<{
      id: string;
      case_id: string;
      event_type: string;
      actor_id: string;
      actor_role: string;
      payload: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT id, case_id, event_type, actor_id, actor_role, payload, created_at
       FROM audit_events WHERE case_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [caseId],
    );
    res.json(
      rows.map((r) => ({
        id: r.id,
        caseId: r.case_id,
        eventType: r.event_type,
        actorId: r.actor_id,
        actorRole: r.actor_role,
        payload: r.payload,
        createdAt: r.created_at,
      })),
    );
  } catch (e) {
    next(e);
  }
});

export default router;
