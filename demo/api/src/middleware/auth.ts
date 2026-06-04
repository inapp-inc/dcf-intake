import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import type { UserRole } from "../domain/form51a/types.js";

export interface AuthUser {
  userId: string;
  role: UserRole;
  displayName: string;
  areaOffice?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { sub: user.userId, role: user.role, displayName: user.displayName, areaOffice: user.areaOffice },
    config.jwtSecret,
    { expiresIn: "8h" },
  );
}

export function paramId(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : String(v);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const queryToken =
    typeof req.query.access_token === "string" && req.query.access_token.length > 0
      ? req.query.access_token
      : null;
  const raw = header?.startsWith("Bearer ") ? header.slice(7) : queryToken;
  if (!raw) {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Missing bearer token" });
    return;
  }
  try {
    const payload = jwt.verify(raw, config.jwtSecret) as jwt.JwtPayload;
    req.user = {
      userId: String(payload.sub),
      role: payload.role as UserRole,
      displayName: String(payload.displayName ?? "Demo User"),
      areaOffice: payload.areaOffice as string | undefined,
    };
    next();
  } catch {
    res.status(401).json({ code: "UNAUTHORIZED", message: "Invalid token" });
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ code: "FORBIDDEN", message: "Insufficient role" });
      return;
    }
    next();
  };
}
