-- U3: searchable per-agent output log and rollback-ready history.

CREATE TABLE IF NOT EXISTS agent_outputs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_id VARCHAR(120) NOT NULL,
  agent_version INTEGER NOT NULL DEFAULT 1,
  role_key VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  input_summary TEXT NOT NULL,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence INTEGER NOT NULL,
  output_version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  replaced_by_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_workspace_agent_created
  ON agent_outputs (workspace_id, agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_workspace_active
  ON agent_outputs (workspace_id, is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_workspace_role_agent_active
  ON agent_outputs (workspace_id, role_key, agent_id, is_active);
