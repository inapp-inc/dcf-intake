-- Case search, linking, and identity indexes

ALTER TABLE cases ADD COLUMN child_match_key TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_external_id ON cases(external_id);
CREATE INDEX IF NOT EXISTS idx_cases_child_display ON cases(child_display);
CREATE INDEX IF NOT EXISTS idx_cases_child_match_key ON cases(child_match_key);
