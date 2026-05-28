-- feedback_reports: operator-facing bug reports and feature requests
CREATE TABLE feedback_reports (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL CHECK(type IN ('bug', 'feature_request')),
  screen          TEXT,
  tried           TEXT,
  expected        TEXT,
  happened        TEXT,
  impact          TEXT,
  proposed_change TEXT,
  justification   TEXT,
  reported_by     TEXT NOT NULL,
  created_at      TEXT NOT NULL
);

CREATE INDEX idx_feedback_created_at ON feedback_reports(created_at);
CREATE INDEX idx_feedback_type ON feedback_reports(type);
