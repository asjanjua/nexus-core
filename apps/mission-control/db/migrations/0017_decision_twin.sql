-- Migration 0017: Decision & Action Twin (Phase 8A)
-- Extends decisions table with brief linkage, deadline, and priority.
-- Adds actions table for decision-level action items with owner, due date, and blocker flag.

-- Extend decisions (existing table — add columns safely)
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS source_output_id TEXT REFERENCES agent_outputs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deadline         DATE,
  ADD COLUMN IF NOT EXISTS priority         VARCHAR(16) NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS decisions_workspace_idx ON decisions (workspace_id);
CREATE INDEX IF NOT EXISTS decisions_status_idx    ON decisions (workspace_id, status);

-- Actions table — items flowing from a decision
CREATE TABLE IF NOT EXISTS actions (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  decision_id   TEXT        NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  action_text   TEXT        NOT NULL,
  owner         VARCHAR(120) NOT NULL,
  due_date      DATE,
  is_blocker    BOOLEAN     NOT NULL DEFAULT FALSE,
  status        VARCHAR(32) NOT NULL DEFAULT 'open',   -- open | done | deferred | cancelled
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS actions_decision_idx  ON actions (decision_id);
CREATE INDEX IF NOT EXISTS actions_workspace_idx ON actions (workspace_id);
CREATE INDEX IF NOT EXISTS actions_status_idx    ON actions (workspace_id, status);
