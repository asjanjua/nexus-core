-- Migration 0016: learning_signals
-- Captures user feedback (approve / edit / reject / thumbs_up / thumbs_down) on agent outputs.
-- Drives agent quality improvement reporting for regulated-sector pilots.

CREATE TABLE IF NOT EXISTS learning_signals (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  agent_id      VARCHAR(120) NOT NULL,
  output_id     TEXT        NOT NULL REFERENCES agent_outputs(id) ON DELETE CASCADE,
  signal_type   VARCHAR(32) NOT NULL,   -- approve | edit | reject | thumbs_up | thumbs_down
  edited_content TEXT,                  -- populated only for signal_type = 'edit'
  actor         VARCHAR(120) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS learning_signals_workspace_idx  ON learning_signals (workspace_id);
CREATE INDEX IF NOT EXISTS learning_signals_output_idx     ON learning_signals (output_id);
CREATE INDEX IF NOT EXISTS learning_signals_agent_idx      ON learning_signals (agent_id);
CREATE INDEX IF NOT EXISTS learning_signals_type_idx       ON learning_signals (signal_type);
