ALTER TABLE feedback_reports ADD COLUMN status     TEXT NOT NULL DEFAULT 'open';
ALTER TABLE feedback_reports ADD COLUMN resolved_by TEXT;
ALTER TABLE feedback_reports ADD COLUMN resolved_at TEXT;

CREATE INDEX idx_feedback_status ON feedback_reports(status);
