-- Migration 0045: Nexus Room Portfolio
--
-- Durable room configuration replacing the static onboarding role-state
-- controls. Every workspace sees the complete curated portfolio from day one,
-- but a room is not active until an administrator confirms the owner, evidence
-- scope, agent pack, and human-authority boundary.
--
-- Lifecycle: a room is "active" once an admin activates it, "staged" when it
-- has configuration but is not yet live, and "inactive" when deactivated.
-- The Executive Command room is mandatory and created at workspace provision
-- time with lifecycle_state = "active".
--
-- Product rooms (board, submission, deal, engagement) are discoverable in the
-- portfolio but retain their separate vertical workflow and authority
-- boundaries; activation hands into the vertical rather than creating a
-- generic C-suite dashboard.
--
-- See docs/NEXUS_ROOM_PORTFOLIO_ACTIVATION.md for the full policy and
-- implementation sequence.

CREATE TABLE IF NOT EXISTS rooms (
  id               TEXT PRIMARY KEY,
  workspace_id     TEXT NOT NULL,
  template         TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  owner_user_id    TEXT,
  evidence_scope   TEXT,
  agent_pack       TEXT,
  lifecycle_state  TEXT NOT NULL DEFAULT 'active',
  boundary_acknowledged BOOLEAN NOT NULL DEFAULT false,
  activated_at     TIMESTAMPTZ,
  activated_by     TEXT,
  deactivated_at   TIMESTAMPTZ,
  deactivated_by   TEXT,
  dual_hat_owner_id TEXT,
  custom_name_source TEXT,
  metadata         JSONB,
  audit_trail      JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One room per template per workspace (a workspace cannot have two Finance
-- rooms, but a custom room starting from the Finance template is allowed
-- because it carries a distinct custom name).
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_workspace_template
  ON rooms (workspace_id, template)
  WHERE custom_name_source IS NULL;

-- Fast lookup of active rooms for navigation derivation.
CREATE INDEX IF NOT EXISTS idx_rooms_workspace_lifecycle
  ON rooms (workspace_id, lifecycle_state);

-- Seed: every existing workspace gets the mandatory Executive Command room
-- pre-provisioned. The workspace administrator activates other rooms through
-- the /rooms UI. Onboarding role-state data (from WorkspaceProfile.roleStates)
-- is not migrated here — that is a separate activation step the administrator
-- performs.
INSERT INTO rooms (id, workspace_id, template, display_name, lifecycle_state, boundary_acknowledged)
SELECT
  'room_' || gen_random_uuid()::text,
  w.id,
  'executive',
  'Executive Command',
  'active',
  true
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM rooms r WHERE r.workspace_id = w.id AND r.template = 'executive'
);

-- Every future workspace will get its Executive Command room seeded at
-- provision time in the application layer (repository.provisionWorkspace)
-- rather than by a trigger, so the provision call is the single source of
-- truth for what a new workspace starts with.
