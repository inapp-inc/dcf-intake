import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-internal-key"];
  if (key !== config.internalApiKey) {
    res.status(403).json({ code: "FORBIDDEN", message: "Invalid internal key" });
    return;
  }
  next();
}
