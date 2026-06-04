-- Track when a field worker first opens the pre-visit briefing (demo).

ALTER TABLE cases ADD COLUMN briefing_opened_at TEXT;
