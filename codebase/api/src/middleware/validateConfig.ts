import { config } from "../config.js";

/** DCF AIT uses PostgreSQL only (ADR-DCF-0003). SQLite is not supported. */
export function validateDatabaseConfig(): void {
  const url = config.databaseUrl.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required — PostgreSQL only (SQLite is not supported)");
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    const scheme = url.includes(":") ? url.split(":")[0] : "unknown";
    throw new Error(
      `DATABASE_URL must be a PostgreSQL connection string (postgresql://…); got scheme "${scheme}"`,
    );
  }
}

export function validateProductionConfig(): void {
  if (config.nodeEnv !== "production") return;

  const insecureDefaults = [
    "dev-only-change-me-min-32-characters-long",
    "dev-internal-key-change-me",
    "change-me-jwt-secret-min-32-chars",
  ];

  if (insecureDefaults.includes(config.jwtSecret)) {
    throw new Error("JWT_SECRET must be set to a strong value in production");
  }
  if (insecureDefaults.includes(config.internalApiKey)) {
    throw new Error("INTERNAL_API_KEY must be set in production");
  }
}
