import http from "http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { bootstrapMinio } from "./services/minioBootstrap.js";
import { attachCaseWebSocket } from "./ws/caseEvents.js";
import { validateDatabaseConfig, validateProductionConfig } from "./middleware/validateConfig.js";

async function main() {
  validateDatabaseConfig();
  validateProductionConfig();
  await runMigrations();
  await bootstrapMinio().catch((err) => console.warn("Artifact store warning:", err.message));

  const app = createApp();
  const server = http.createServer(app);
  // Demo: long-running uploads + cloud LLM (do not cut off at default ~5 min)
  server.requestTimeout = 0;
  server.headersTimeout = 3_700_000;
  server.keepAliveTimeout = 3_700_000;
  attachCaseWebSocket(server);
  server.listen(config.port, config.host, () => {
    console.log(
      `Child welfare intake demo API listening on ${config.host}:${config.port} (SQLite, WS /ws/cases/:caseId)`,
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
