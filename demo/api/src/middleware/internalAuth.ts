import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const raw = req.headers["x-internal-key"];
  const key = Array.isArray(raw) ? raw[0] : raw;
  if (!key || key !== config.internalApiKey) {
    res.status(403).json({ code: "FORBIDDEN", message: "Invalid internal key" });
    return;
  }
  next();
}
