-- Production cron audit only. Apply via reviewed migration before deployment,
-- or let the scheduled handler initialize this table idempotently.
CREATE TABLE IF NOT EXISTS cron_import_runs (
  run_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL CHECK(status IN ('running','success','error')),
  accounts INTEGER,
  received INTEGER,
  inserted INTEGER,
  duplicates INTEGER,
  error_category TEXT
);
CREATE INDEX IF NOT EXISTS idx_cron_import_runs_started_at ON cron_import_runs(started_at DESC);
