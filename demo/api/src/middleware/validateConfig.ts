import { config } from "../config.js";

export function validateDatabaseConfig(): void {
  const url = config.databaseUrl.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  if (!url.startsWith("sqlite:") && !/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error(`DATABASE_URL must be sqlite:// or postgresql://; got "${url.split(":")[0]}"`);
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
  if (config.llm.provider === "huggingface" && !config.llm.huggingface.apiToken) {
    throw new Error("HF_API_TOKEN must be set in production when LLM_PROVIDER=huggingface");
  }
}
