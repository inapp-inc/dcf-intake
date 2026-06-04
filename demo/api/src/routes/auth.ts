import { Router } from "express";
import { z } from "zod";
import { findDemoUser } from "../domain/demoUsers.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import type { UserRole } from "../domain/form51a/types.js";

const router = Router();

const loginSchema = z.object({
  role: z.enum(["screener", "supervisor", "worker", "admin"]),
  displayName: z.string().optional(),
  areaOffice: z.string().optional(),
});

const credentialLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/auth/login", (req, res) => {
  const parsed = credentialLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "BAD_REQUEST", message: "Username and password required" });
    return;
  }
  const account = findDemoUser(parsed.data.username, parsed.data.password);
  if (!account) {
    res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Invalid username or password" });
    return;
  }
  const user = {
    userId: `demo-${account.role}`,
    role: account.role,
    displayName: account.displayName,
    areaOffice: account.areaOffice,
  };
  res.json({
    accessToken: signToken(user),
    expiresIn: 28800,
    role: account.role,
    displayName: account.displayName,
  });
});

router.post("/auth/demo-login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "BAD_REQUEST", message: parsed.error.message });
    return;
  }
  const { role, displayName, areaOffice } = parsed.data;
  const user = {
    userId: `demo-${role}`,
    role: role as UserRole,
    displayName: displayName ?? role.charAt(0).toUpperCase() + role.slice(1),
    areaOffice,
  };
  res.json({
    accessToken: signToken(user),
    expiresIn: 28800,
    role,
  });
});

router.get("/auth/me", requireAuth, (req, res) => {
  res.json({
    userId: req.user!.userId,
    displayName: req.user!.displayName,
    role: req.user!.role,
    areaOffice: req.user!.areaOffice,
  });
});

export default router;
