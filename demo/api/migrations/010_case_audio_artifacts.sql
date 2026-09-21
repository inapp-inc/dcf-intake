-- Retain intake audio (live chunks + uploads) until supervisor screening decision.

CREATE TABLE IF NOT EXISTS case_audio_artifacts (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  audio_key TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('live', 'upload')),
  session_id TEXT,
  chunk_index INTEGER,
  byte_size INTEGER NOT NULL DEFAULT 0,
  retained INTEGER NOT NULL DEFAULT 1,
  transcribed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_case_audio_case ON case_audio_artifacts(case_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_audio_key ON case_audio_artifacts(case_id, audio_key);
