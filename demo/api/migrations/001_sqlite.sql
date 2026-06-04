-- DCF AIT demo stack — SQLite schema (independent demo/ copy)

CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  form51a_checkpoint_status TEXT NOT NULL DEFAULT 'not_started',
  emergency INTEGER NOT NULL DEFAULT 0,
  child_display TEXT,
  area_office TEXT,
  risk_score INTEGER,
  triage_flag_count INTEGER NOT NULL DEFAULT 0,
  field_notes TEXT NOT NULL DEFAULT '',
  screener_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS form_51a_fields (
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  label TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0,
  value TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'human',
  ai_confidence REAL,
  confirmed_by_human INTEGER NOT NULL DEFAULT 0,
  missing INTEGER NOT NULL DEFAULT 0,
  multiline INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (case_id, section_id, field_id)
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL CHECK (speaker IN ('S', 'C')),
  text TEXT NOT NULL,
  offset_ms INTEGER,
  keyword_flag INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS triage_flags (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  indicator_id TEXT NOT NULL,
  label TEXT NOT NULL,
  severity TEXT NOT NULL,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 20),
  contributing_factors TEXT NOT NULL DEFAULT '[]',
  model_version TEXT,
  overridden INTEGER NOT NULL DEFAULT 0,
  override_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS background_check_runs (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_summary TEXT,
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS screening_decisions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  notes TEXT,
  decided_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS briefings (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS report_51b_versions (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  actor_id TEXT,
  actor_role TEXT,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_state (
  case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  current_stage TEXT,
  stages TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS assistant_messages (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  msg_type TEXT NOT NULL,
  message TEXT NOT NULL,
  field_jump TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS case_documents (
  id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '{}',
  validated INTEGER NOT NULL DEFAULT 0,
  model_version TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_status_updated ON cases(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_assistant_case ON assistant_messages(case_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pipeline_jobs_status ON pipeline_jobs(status, id);
