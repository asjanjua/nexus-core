-- Migration 0030: department-scoped agent output versioning
-- Adds a nullable department column so saveAgentOutput's version chain can
-- key on (workspace, agent, role, department) instead of (workspace, agent,
-- role) alone. Fixes a collision where two departments/board packs sharing
-- the same role (e.g. "board") would overwrite each other's active output.
-- NULL department behaves as before this column existed.

ALTER TABLE agent_outputs
  ADD COLUMN IF NOT EXISTS department VARCHAR(120);
