import { config } from "../config.js";

export async function ollamaChat(system: string, user: string): Promise<string> {
  const r = await fetch(`${config.ollama.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollama.model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!r.ok) {
    throw new Error(`Ollama error ${r.status}`);
  }
  const data = (await r.json()) as { message?: { content?: string } };
  return data.message?.content ?? "";
}
