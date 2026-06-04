-- Key-value system configuration (triage keywords, thresholds, etc.)

CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
