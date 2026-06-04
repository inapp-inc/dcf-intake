/** Redact common PII patterns before writing to application logs. */
const PATTERNS: [RegExp, string][] = [
  [/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN]"],
  [/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]"],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]"],
  [/\b\d{1,5}\s+\w+\s+(St|Street|Ave|Road|Rd|Dr)\b/gi, "[ADDRESS]"],
];

export function redactPii(text: string): string {
  let out = text;
  for (const [re, rep] of PATTERNS) {
    out = out.replace(re, rep);
  }
  return out;
}

export function safeLogPayload(payload: unknown): string {
  try {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    return redactPii(raw).slice(0, 500);
  } catch {
    return "[unserializable]";
  }
}
