export const config = {
  port: parseInt(process.env.PORT ?? "8080", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me-min-32-characters-long",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "https://localhost",
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "aitminio",
    secretKey: process.env.MINIO_SECRET_KEY ?? "change-me-minio-secret",
    bucket: process.env.MINIO_BUCKET ?? "ait-artifacts",
    useSsl: process.env.MINIO_USE_SSL === "true",
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
    model: process.env.OLLAMA_MODEL ?? "llama3.2:3b",
  },
  auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS ?? "90", 10),
  internalApiKey: process.env.INTERNAL_API_KEY ?? "dev-internal-key-change-me",
  nlpConfidenceThreshold: parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD ?? "0.65"),
};
