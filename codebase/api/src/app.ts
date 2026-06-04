import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
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
  api.use(healthRouter);
  api.use(authRouter);
  api.use(casesRouter);
  api.use(form51aRouter);
  api.use(intakeRouter);
  api.use(internalRouter);
  api.use(screeningRouter);
  api.use(investigationRouter);
  api.use(auditRouter);
  api.use(adminRouter);

  app.use("/api/v1", api);
  app.use(errorHandler);
  return app;
}
