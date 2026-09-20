-- Live demo call session + Live speaker label for transcript segments

ALTER TABLE cases ADD COLUMN live_session_status TEXT NOT NULL DEFAULT 'idle';
ALTER TABLE cases ADD COLUMN live_session_id TEXT;
ALTER TABLE cases ADD COLUMN live_started_at TEXT;

-- SQLite: recreate transcript_segments to allow speaker 'L' (Live)
PRAGMA foreign_keys = OFF;

CREATE TABLE transcript_segments_new (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('S', 'C', 'L')),
  text TEXT NOT NULL,
  offset_ms INTEGER,
  keyword_flag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO transcript_segments_new (id, case_id, speaker, text, offset_ms, keyword_flag, created_at)
SELECT id, case_id, speaker, text, offset_ms, keyword_flag, created_at FROM transcript_segments;

DROP TABLE transcript_segments;

ALTER TABLE transcript_segments_new RENAME TO transcript_segments;

CREATE INDEX IF NOT EXISTS idx_transcript_case ON transcript_segments(case_id, offset_ms, created_at);

PRAGMA foreign_keys = ON;
