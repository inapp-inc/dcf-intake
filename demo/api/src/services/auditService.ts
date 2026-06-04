import { v4 as uuidv4 } from "uuid";
import { query } from "../db/pool.js";
import type { UserRole } from "../domain/form51a/types.js";

export async function writeAudit(params: {
  caseId?: string;
  actorId: string;
  actorRole: UserRole;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO audit_events (id, case_id, actor_id, actor_role, event_type, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      uuidv4(),
      params.caseId ?? null,
      params.actorId,
      params.actorRole,
      params.eventType,
      JSON.stringify(params.payload ?? {}),
    ],
  );
}
