/** Limit text sent to Hugging Face to control token cost. */
export const HF_MAX_TRANSCRIPT_CHARS = 14_000;
export const HF_MAX_ASSISTANT_USER_CHARS = 2_000;
export const HF_MAX_ASSISTANT_CONTEXT_CHARS = 12_000;

export function truncateForLlm(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}\n\n[… truncated for model context limit …]`;
}
