CREATE TABLE IF NOT EXISTS workflow_twins (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner VARCHAR(120),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_twins_workspace_status
  ON workflow_twins(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_workflow_twins_workspace_type
  ON workflow_twins(workspace_id, type);

CREATE TABLE IF NOT EXISTS workflow_twin_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  twin_id TEXT NOT NULL REFERENCES workflow_twins(id) ON DELETE CASCADE,
  twin_type VARCHAR(64) NOT NULL,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_output_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence INTEGER NOT NULL DEFAULT 70,
  status VARCHAR(32) NOT NULL DEFAULT 'generated',
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_workflow_twin_runs_workspace_run_at
  ON workflow_twin_runs(workspace_id, run_at DESC);

CREATE INDEX IF NOT EXISTS idx_workflow_twin_runs_twin_run_at
  ON workflow_twin_runs(twin_id, run_at DESC);
