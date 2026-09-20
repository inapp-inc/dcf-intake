import express from "express";
import cors from "cors";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/auth.js";
import { requireInternalKey } from "./middleware/internalAuth.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import casesRouter from "./routes/cases.js";
import form51aRouter from "./routes/form51a.js";
import intakeRouter from "./routes/intake.js";
import internalRouter from "./routes/internal.js";
import screeningRouter from "./routes/screening.js";
import investigationRouter from "./routes/investigation.js";
import auditRouter from "./routes/audit.js";
import adminRouter from "./routes/admin.js";
import liveRouter from "./routes/live.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OFFICIAL_FORM_JS = readFileSync(join(__dirname, "../public/initial-report-form.js"), "utf8");

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(securityHeaders);
  const corsOrigins = config.corsOrigin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: corsOrigins.length > 1 ? corsOrigins : corsOrigins[0],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  const api = express.Router();

  // Public HTTP routes (no global JWT middleware on this router).
  api.use(healthRouter);
  api.use(authRouter);
  api.get("/static/initial-report-form.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
    );
    res.send(OFFICIAL_FORM_JS);
  });

  // Worker callbacks — path-scoped so JWT middleware never runs on /internal/*.
  api.use("/internal", requireInternalKey, internalRouter);

  // All user-facing routes share one JWT gate (do not add router.use(requireAuth) in route modules).
  const protectedApi = express.Router();
  protectedApi.use(requireAuth);
  protectedApi.use(casesRouter);
  protectedApi.use(form51aRouter);
  protectedApi.use(intakeRouter);
  protectedApi.use(liveRouter);
  protectedApi.use(screeningRouter);
  protectedApi.use(investigationRouter);
  protectedApi.use(auditRouter);
  protectedApi.use(adminRouter);
  api.use(protectedApi);

  app.use("/api/v1", api);
  app.use(errorHandler);
  return app;
}
