-- 0034: Persist pilot readiness on the strategy profile.
-- The workflow scorer owns gate evaluation and writes pilot_ready + pilot_gates.
-- PATCH /api/strategy-profile enforces a single field (pilot_ready) when a
-- selectedWorkflow is committed. See docs/WORKFLOW_TWIN_SCORER.md.

ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS pilot_ready BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS pilot_gates JSONB NOT NULL DEFAULT '[]'::jsonb;
