import type { Request, Response, NextFunction } from "express";
import { query } from "../db/pool.js";
import { paramId } from "./auth.js";
import type { UserRole } from "../domain/form51a/types.js";

const WORKER_ALLOWED = new Set(["assigned", "report_submitted"]);

export class CaseAccessError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function assertCaseAccess(caseId: string, role: UserRole): Promise<void> {
  if (role === "admin") {
    throw new CaseAccessError("IT Admin cannot access case narrative data", 403, "FORBIDDEN");
  }

  const { rows } = await query<{ status: string }>("SELECT status FROM cases WHERE id = $1", [caseId]);
  if (!rows[0]) {
    throw new CaseAccessError("Case not found", 404, "NOT_FOUND");
  }

  if (role === "worker" && !WORKER_ALLOWED.has(rows[0].status)) {
    throw new CaseAccessError("Case not assigned to field worker", 403, "FORBIDDEN");
  }
}

export function requireCaseAccess(paramName = "caseId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const caseId = paramId(req, paramName);
      if (!req.user) {
        res.status(401).json({ code: "UNAUTHORIZED", message: "Not authenticated" });
        return;
      }
      await assertCaseAccess(caseId, req.user.role);
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
