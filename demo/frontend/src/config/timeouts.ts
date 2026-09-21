/** Demo stack (cloud HF ASR + LLM) — longer than production defaults. */
export const TIMEOUT_MS = {
  auth: 30_000,
  default: 120_000,
  upload: 600_000,
  liveChunk: 120_000,
  ai: 600_000,
} as const;

/** Poll case/pipeline while AI pipeline runs (ms). */
export const PIPELINE_POLL_MS = 6_000;

/** Faster poll during live demo call (transcript + form + assistant). */
export const LIVE_POLL_MS = 3_500;

export const TIMEOUT_MESSAGE =
  "Request timed out. The demo AI pipeline may still be running — wait a moment and refresh.";
