import type { Request, Response, NextFunction } from "express";
import { query } from "../db/pool.js";
import { paramId } from "./auth.js";
import type { UserRole } from "../domain/form51a/types.js";

const WORKER_WRITE_ALLOWED = new Set(["assigned", "report_submitted"]);

export class CaseAccessError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function loadCaseStatus(caseId: string): Promise<string | null> {
  const { rows } = await query<{ status: string }>("SELECT status FROM cases WHERE id = $1", [caseId]);
  return rows[0]?.status ?? null;
}

/** Read access: workers may read any case; admin blocked from narrative. */
export async function assertCaseReadAccess(caseId: string, role: UserRole): Promise<void> {
  if (role === "admin") {
    throw new CaseAccessError("System Admin cannot access case narrative data", 403, "FORBIDDEN");
  }

  const status = await loadCaseStatus(caseId);
  if (!status) {
    throw new CaseAccessError("Case not found", 404, "NOT_FOUND");
  }
}

/** Write access: workers limited to assigned cases; admin blocked. */
export async function assertCaseWriteAccess(caseId: string, role: UserRole): Promise<void> {
  if (role === "admin") {
    throw new CaseAccessError("System Admin cannot access case narrative data", 403, "FORBIDDEN");
  }

  const status = await loadCaseStatus(caseId);
  if (!status) {
    throw new CaseAccessError("Case not found", 404, "NOT_FOUND");
  }

  if (role === "worker" && !WORKER_WRITE_ALLOWED.has(status)) {
    throw new CaseAccessError("Case not assigned to field worker", 403, "FORBIDDEN");
  }
}

/** @deprecated use assertCaseReadAccess or assertCaseWriteAccess */
export async function assertCaseAccess(caseId: string, role: UserRole): Promise<void> {
  await assertCaseWriteAccess(caseId, role);
}

export function requireCaseAccess(paramName = "caseId", mode: "read" | "write" = "write") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const caseId = paramId(req, paramName);
      if (!req.user) {
        res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
        return;
      }
      if (mode === "read") {
        await assertCaseReadAccess(caseId, req.user.role);
      } else {
        await assertCaseWriteAccess(caseId, req.user.role);
      }
      next();
    } catch (e) {
      if (e instanceof CaseAccessError) {
        res.status(e.status).json({ code: e.code, message: e.message });
        return;
      }
      next(e);
    }
  };
}
