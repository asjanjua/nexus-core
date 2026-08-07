-- Migration 0052: connector_sync_runs
-- Tracks every connector sync execution: status, duration,
-- records ingested, errors. Powers the Connector Ops dashboard
-- and retry/freshness visibility.

CREATE TABLE IF NOT EXISTS connector_sync_runs (
  id              TEXT PRIMARY KEY,
  connector_id    TEXT NOT NULL REFERENCES connectors(id),
  workspace_id    TEXT NOT NULL,
  status          VARCHAR(32) NOT NULL DEFAULT 'running',
  -- running | success | failed | partial
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  duration_ms     INTEGER,
  records_ingested INTEGER DEFAULT 0,
  records_failed  INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message   TEXT,
  error_code      VARCHAR(64),
  retry_count     INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,
  trigger_type    VARCHAR(32) NOT NULL DEFAULT 'manual',
  -- manual | cron | webhook | retry
  metadata        JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS connector_sync_runs_connector
  ON connector_sync_runs (connector_id, started_at DESC);

CREATE INDEX IF NOT EXISTS connector_sync_runs_retry
  ON connector_sync_runs (next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
