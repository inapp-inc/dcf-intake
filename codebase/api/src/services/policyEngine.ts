import type { UserRole } from "../domain/form51a/types.js";

/** Human-in-the-loop — no automated legal determinations (ADR-DCF-0005). */

const FORBIDDEN_AUTO_ACTIONS = new Set([
  "auto_screen_in",
  "auto_screen_out",
  "auto_removal",
  "auto_determination",
]);

export function assertHumanAction(action: string, actorRole: UserRole): void {
  if (FORBIDDEN_AUTO_ACTIONS.has(action)) {
    throw new PolicyError(`Automated action '${action}' is not permitted`);
  }
  if (actorRole === "admin") {
    throw new PolicyError("IT Admin cannot perform case determination actions");
  }
}

export class PolicyError extends Error {
  status = 403;
  code = "POLICY_VIOLATION";
}
