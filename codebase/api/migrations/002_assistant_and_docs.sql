CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  msg_type VARCHAR(16) NOT NULL,
  message TEXT NOT NULL,
  field_jump VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_case ON assistant_messages(case_id, created_at);

CREATE TABLE IF NOT EXISTS case_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  doc_type VARCHAR(64) NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  validated BOOLEAN NOT NULL DEFAULT false,
  model_version VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
