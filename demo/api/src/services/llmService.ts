import { config } from "../config.js";

export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

/** Chat completion — Hugging Face Inference (default) or local Ollama. */
export async function llmChat(
  system: string,
  user: string,
  opts?: { maxTokens?: number },
): Promise<string> {
  if (config.llm.provider === "ollama") {
    return ollamaChat(system, user);
  }
  return huggingFaceChat(system, user, 2, opts?.maxTokens ?? 2048);
}

async function huggingFaceChat(
  system: string,
  user: string,
  retries = 2,
  maxTokens = 2048,
): Promise<string> {
  const { apiBase, model, apiToken } = config.llm.huggingface;
  if (!apiToken) {
    throw new LlmError("HF_API_TOKEN is required when LLM_PROVIDER=huggingface");
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(`${apiBase.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(config.llm.requestTimeoutMs),
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });

      if (r.status === 503 && attempt < retries) {
        await sleep(3000 * (attempt + 1));
        continue;
      }

      if (!r.ok) {
        const body = await r.text().catch(() => "");
        throw new LlmError(`Hugging Face error ${r.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
      }

      const data = (await r.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(2000);
    }
  }
  throw lastErr instanceof LlmError ? lastErr : new LlmError(String(lastErr));
}

async function ollamaChat(system: string, user: string): Promise<string> {
  const { baseUrl, model } = config.llm.ollama;
  const r = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(config.llm.requestTimeoutMs),
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    throw new LlmError(`Ollama error ${r.status}`);
  }
  const data = (await r.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}

let llmHealthCache: { status: "up" | "down" | "degraded"; at: number } | null = null;
const LLM_HEALTH_CACHE_MS = 60_000;

export async function llmHealthCheck(): Promise<"up" | "down" | "degraded"> {
  const now = Date.now();
  if (llmHealthCache && now - llmHealthCache.at < LLM_HEALTH_CACHE_MS) {
    return llmHealthCache.status;
  }
  if (config.llm.provider === "ollama") {
    try {
      const r = await fetch(`${config.llm.ollama.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      const status = r.ok ? "up" : "degraded";
      llmHealthCache = { status, at: now };
      return status;
    } catch {
      llmHealthCache = { status: "down", at: now };
      return "down";
    }
  }

  if (!config.llm.huggingface.apiToken) {
    llmHealthCache = { status: "down", at: now };
    return "down";
  }
  try {
    const r = await fetch(`${config.llm.huggingface.apiBase.replace(/\/$/, "")}/models`, {
      headers: { Authorization: `Bearer ${config.llm.huggingface.apiToken}` },
      signal: AbortSignal.timeout(8000),
    });
    const status = r.ok ? "up" : "degraded";
    llmHealthCache = { status, at: now };
    return status;
  } catch {
    llmHealthCache = { status: "down", at: now };
    return "down";
  }
}

export function llmModelLabel(): string {
  return config.llm.provider === "ollama"
    ? config.llm.ollama.model
    : config.llm.huggingface.model;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
