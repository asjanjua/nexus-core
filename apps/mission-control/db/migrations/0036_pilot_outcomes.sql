-- 0036: Pilot outcomes — the afterlife record for a selected pilot workflow.
-- P2 "pilot afterlife surface": after a workspace commits a selectedWorkflow,
-- this row captures the operator's expand / hold / stop decision as first-class
-- data. Run cadence and shadow-ROI are NOT duplicated here — they are derived
-- from workflow-twin runs and workflow-twin config.shadowMeasurements. This
-- table records only the lifecycle decision and its note/actor.

CREATE TABLE IF NOT EXISTS pilot_outcomes (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  workflow_name TEXT NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'running', -- running | expand | hold | stop
  note          TEXT,
  decided_by    TEXT,
  decided_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One outcome record per workflow per workspace.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pilot_outcomes_workspace_workflow
  ON pilot_outcomes(workspace_id, workflow_name);
