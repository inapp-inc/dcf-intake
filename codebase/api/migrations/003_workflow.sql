-- SEED-004 workflow columns

ALTER TABLE cases ADD COLUMN IF NOT EXISTS field_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS screener_name VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_cases_status_updated ON cases(status, updated_at DESC);
