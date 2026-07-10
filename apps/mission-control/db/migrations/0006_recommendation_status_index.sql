-- Migration 0006: add recommendation workspace/status index
--
-- Why:
-- Recommendation feeds and approval-oriented views frequently filter by
-- workspace and status together. This keeps those queries fast as the pilot
-- grows beyond a small in-memory style dataset.

CREATE INDEX IF NOT EXISTS idx_recommendations_workspace_status
  ON recommendations (workspace_id, status);
