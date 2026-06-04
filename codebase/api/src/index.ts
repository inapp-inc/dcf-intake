import http from "http";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { bootstrapMinio } from "./services/minioBootstrap.js";
import { getRedis } from "./services/redisClient.js";
import { attachCaseWebSocket } from "./ws/caseEvents.js";
import { validateDatabaseConfig, validateProductionConfig } from "./middleware/validateConfig.js";

async function main() {
  validateDatabaseConfig();
  validateProductionConfig();
  await bootstrapMinio().catch((err) => console.warn("MinIO bootstrap warning:", err.message));
  await getRedis().catch((err) => console.warn("Redis connect warning:", err.message));

  const app = createApp();
  const server = http.createServer(app);
  attachCaseWebSocket(server);
  server.listen(config.port, () => {
    console.log(`DCF AIT API listening on :${config.port} (WS /ws/cases/:caseId)`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
