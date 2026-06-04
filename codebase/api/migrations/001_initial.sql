-- DCF AIT demo — initial schema (SEED-001)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(32) UNIQUE,
  status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
  form51a_checkpoint_status VARCHAR(32) NOT NULL DEFAULT 'not_started',
  emergency BOOLEAN NOT NULL DEFAULT false,
  child_display VARCHAR(255),
  area_office VARCHAR(128),
  risk_score INTEGER,
  triage_flag_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS form_51a_fields (
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  section_id VARCHAR(32) NOT NULL,
  field_id VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  value TEXT NOT NULL DEFAULT '',
  source VARCHAR(16) NOT NULL DEFAULT 'human',
  ai_confidence DOUBLE PRECISION,
  confirmed_by_human BOOLEAN NOT NULL DEFAULT false,
  missing BOOLEAN NOT NULL DEFAULT false,
  multiline BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (case_id, section_id, field_id)
);

CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  speaker CHAR(1) NOT NULL CHECK (speaker IN ('S', 'C')),
  text TEXT NOT NULL,
  offset_ms INTEGER,
  keyword_flag BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS triage_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  indicator_id VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  severity VARCHAR(32) NOT NULL,
  evidence TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 20),
  contributing_factors JSONB NOT NULL DEFAULT '[]',
  model_version VARCHAR(128),
  overridden BOOLEAN NOT NULL DEFAULT false,
  override_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS background_check_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  result_summary TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS screening_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  decision VARCHAR(32) NOT NULL,
  notes TEXT,
  decided_by VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_51b_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  approved_by VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID,
  actor_id VARCHAR(128),
  actor_role VARCHAR(32),
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pipeline_state (
  case_id UUID PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  current_stage VARCHAR(64),
  stages JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(case_id, created_at DESC);
