-- Structured 51A form document (official form field model per case)

CREATE TABLE IF NOT EXISTS form_51a_documents (
  case_id TEXT PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  document_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
