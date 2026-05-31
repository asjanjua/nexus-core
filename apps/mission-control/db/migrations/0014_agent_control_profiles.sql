-- Migration 0014: Agent Control Profiles (passports)
-- Server-enforced per-agent data, tool, action, escalation, and audit controls.

DO $$ BEGIN
  CREATE TYPE agent_control_status AS ENUM ('draft', 'active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_right AS ENUM ('retrieve', 'summarize', 'draft', 'recommend', 'prepare_for_approval');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_risk_rating AS ENUM ('low', 'medium', 'high', 'regulated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_approval_level AS ENUM ('owner', 'partner', 'client', 'board');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_review_cadence AS ENUM ('per_output', 'weekly', 'monthly', 'event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_log_level AS ENUM ('actions', 'actions_sources', 'full');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS agent_control_profiles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_key VARCHAR(120) NOT NULL,
  name VARCHAR(200) NOT NULL,
  purpose TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status agent_control_status NOT NULL DEFAULT 'draft',
  allowed_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_sensitivity sensitivity NOT NULL DEFAULT 'internal',
  cross_entity_access BOOLEAN NOT NULL DEFAULT FALSE,
  allowed_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  forbidden_tools JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_controlled_apis JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_right action_right NOT NULL DEFAULT 'recommend',
  hard_stops JSONB NOT NULL DEFAULT '[]'::jsonb,
  escalation_triggers JSONB NOT NULL DEFAULT '[]'::jsonb,
  approval_level agent_approval_level NOT NULL DEFAULT 'owner',
  risk_rating agent_risk_rating NOT NULL DEFAULT 'medium',
  review_cadence agent_review_cadence NOT NULL DEFAULT 'per_output',
  watcher_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
  log_level agent_log_level NOT NULL DEFAULT 'full',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, agent_key, version)
);

CREATE INDEX IF NOT EXISTS idx_acp_workspace_agent_status
  ON agent_control_profiles (workspace_id, agent_key, status);

