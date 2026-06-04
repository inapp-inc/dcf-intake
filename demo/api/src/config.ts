export const config = {
  port: parseInt(process.env.PORT ?? "8080", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "sqlite:////data/ait.db",
  artifactDir: process.env.ARTIFACT_DIR ?? "/data/artifacts",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me-min-32-characters-long",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigin: process.env.CORS_ORIGIN ?? "https://localhost",
  llm: {
    provider: (process.env.LLM_PROVIDER ?? "huggingface") as "huggingface" | "ollama",
    requestTimeoutMs: parseInt(
      process.env.LLM_REQUEST_TIMEOUT_MS ?? process.env.OLLAMA_REQUEST_TIMEOUT_MS ?? "600000",
      10,
    ),
    huggingface: {
      apiBase: process.env.HF_API_BASE ?? "https://router.huggingface.co/v1",
      model: process.env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
      apiToken: process.env.HF_API_TOKEN ?? process.env.HUGGINGFACE_API_KEY ?? "",
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
      model: process.env.OLLAMA_MODEL ?? "llama3.2:3b",
    },
  },
  /** @deprecated use config.llm — kept for gradual migration */
  get ollama() {
    return {
      baseUrl: this.llm.ollama.baseUrl,
      model: this.llm.ollama.model,
      requestTimeoutMs: this.llm.requestTimeoutMs,
    };
  },
  auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS ?? "90", 10),
  internalApiKey: process.env.INTERNAL_API_KEY ?? "dev-internal-key-change-me",
  nlpConfidenceThreshold: parseFloat(process.env.NLP_CONFIDENCE_THRESHOLD ?? "0.65"),
  asr: {
    model: process.env.HF_ASR_MODEL ?? "openai/whisper-large-v3",
    apiUrl: process.env.HF_ASR_API_URL ?? "",
    requestTimeoutMs: parseInt(process.env.ASR_REQUEST_TIMEOUT_MS ?? "600000", 10),
  },
};
