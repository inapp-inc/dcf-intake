import { Router } from "express";
import { z } from "zod";
import { requireAuth, signToken } from "../middleware/auth.js";
import type { UserRole } from "../domain/form51a/types.js";

const router = Router();

const loginSchema = z.object({
  role: z.enum(["screener", "supervisor", "worker", "admin"]),
  displayName: z.string().optional(),
  areaOffice: z.string().optional(),
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
