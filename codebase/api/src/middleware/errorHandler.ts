import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";
import { safeLogPayload } from "../lib/piiRedact.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const e = err as { status?: number; code?: string; message?: string; [k: string]: unknown };
  const status = e.status ?? 500;
  const body: Record<string, unknown> = {
    code: e.code ?? "INTERNAL_ERROR",
    message: e.message ?? "Internal server error",
  };
  if (e.missingFields) body.missingFields = e.missingFields;
  if (e.unconfirmedAiFields) body.unconfirmedAiFields = e.unconfirmedAiFields;
  if (e.checkpointStatus) body.checkpointStatus = e.checkpointStatus;
  if (status >= 500) {
    const msg = err instanceof Error ? err.message : safeLogPayload(err);
    console.error("API error:", msg);
    if (config.nodeEnv !== "production" && err instanceof Error && err.stack) {
      console.error(err.stack);
    }
  }
  res.status(status).json(body);
}
