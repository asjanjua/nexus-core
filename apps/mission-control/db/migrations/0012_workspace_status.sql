-- Migration 0012: workspace status, trial mode, and LLM usage tracking
--
-- Adds:
--   workspaces.status         — trial | pilot | active | suspended | cancelled
--   workspaces.trial_ends_at  — UTC timestamp; NULL when not in trial
--   llm_usage                 — per-workspace token cost tracking

-- 1. Workspace status enum
DO $$ BEGIN
  CREATE TYPE workspace_status AS ENUM ('trial', 'pilot', 'active', 'suspended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add status and trial columns to workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS status workspace_status NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 3. Default existing workspaces to 'active' so existing pilots are not disrupted
UPDATE workspaces SET status = 'active' WHERE status = 'trial';

-- 4. LLM usage tracking table
CREATE TABLE IF NOT EXISTS llm_usage (
  id             TEXT PRIMARY KEY,
  workspace_id   TEXT NOT NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  day            DATE NOT NULL,
  model          TEXT NOT NULL,
  route          TEXT NOT NULL,
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  cost_usd_micro INTEGER NOT NULL DEFAULT 0  -- cost in millionths of a USD for integer storage
);

CREATE INDEX IF NOT EXISTS llm_usage_workspace_day ON llm_usage (workspace_id, day);
CREATE INDEX IF NOT EXISTS llm_usage_day ON llm_usage (day);
