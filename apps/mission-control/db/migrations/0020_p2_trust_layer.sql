-- P2 trust layer: prompt registry, eval results, and workspace AI policy controls.

ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS allowed_providers jsonb NOT NULL DEFAULT '["anthropic","deepseek","openai_compatible"]'::jsonb,
  ADD COLUMN IF NOT EXISTS local_only_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sensitivity_ceiling sensitivity NOT NULL DEFAULT 'confidential',
  ADD COLUMN IF NOT EXISTS approval_required_threshold integer NOT NULL DEFAULT 70;

CREATE TABLE IF NOT EXISTS prompt_registry (
  key text PRIMARY KEY,
  version varchar(32) NOT NULL,
  owner varchar(120) NOT NULL,
  description text NOT NULL,
  template text NOT NULL,
  changelog jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_updated timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eval_runs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  total integer NOT NULL,
  passed integer NOT NULL,
  failed integer NOT NULL,
  pass_rate integer NOT NULL,
  avg_confidence integer NOT NULL,
  avg_latency_ms integer NOT NULL,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS eval_runs_workspace_created
  ON eval_runs (workspace_id, created_at DESC);
