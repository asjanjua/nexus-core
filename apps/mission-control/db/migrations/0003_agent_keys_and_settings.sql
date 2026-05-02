-- Migration 0003: Add evidence_refs + affected_entity_ids to recommendations,
--                 add agent_keys table, add workspace_settings table

-- Fix recommendations table
ALTER TABLE recommendations
  ADD COLUMN IF NOT EXISTS evidence_refs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS affected_entity_ids   jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Agent keys for OAuth / machine-to-machine access
CREATE TABLE IF NOT EXISTS agent_keys (
  id              text        PRIMARY KEY,
  workspace_id    text        NOT NULL,
  name            varchar(200) NOT NULL,
  prefix          varchar(8)  NOT NULL,
  key_hash        text        NOT NULL,
  scopes          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  active          boolean     NOT NULL DEFAULT true,
  expires_at      timestamptz,
  last_used_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_keys_workspace_idx ON agent_keys (workspace_id);

-- Workspace settings
CREATE TABLE IF NOT EXISTS workspace_settings (
  workspace_id          text        PRIMARY KEY,
  name                  varchar(200) NOT NULL,
  timezone              varchar(64)  NOT NULL DEFAULT 'UTC',
  llm_provider          varchar(64)  NOT NULL DEFAULT 'anthropic',
  llm_model             varchar(120) NOT NULL DEFAULT 'claude-opus-4-6',
  quarantine_threshold  integer     NOT NULL DEFAULT 55,
  default_sensitivity   sensitivity NOT NULL DEFAULT 'internal',
  slack_enabled         boolean     NOT NULL DEFAULT false,
  teams_enabled         boolean     NOT NULL DEFAULT false,
  updated_at            timestamptz NOT NULL DEFAULT now()
);
