CREATE TABLE IF NOT EXISTS synthesis_schedules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  cron VARCHAR(64) NOT NULL DEFAULT '0 7 * * 1',
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  roles JSONB NOT NULL DEFAULT '["ceo"]'::jsonb,
  delivery JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,
  email_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  slack_channel TEXT,
  last_run_at TIMESTAMPTZ,
  last_status VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_synthesis_schedules_workspace
  ON synthesis_schedules(workspace_id);

CREATE INDEX IF NOT EXISTS idx_synthesis_schedules_enabled
  ON synthesis_schedules(enabled);
