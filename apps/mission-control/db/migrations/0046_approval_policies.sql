-- Migration 0046: Approval Policies — multi-level, N-of-M, sequential chains.
--
-- Extends the reviewer_seats model (0035) with role, level, and team scoping
-- and adds an approval_policies table so a workspace can move from "one bound
-- reviewer approves everything" to configurable approval rules.
--
-- Existing behavior is preserved: absent policy = single mode = today's
-- single-reviewer check. No existing approval flow changes until an admin
-- explicitly sets a non-single policy.
--
-- See docs/APPROVAL_POLICIES_SPEC.md for the full spec.

-- 1. Extend reviewer_seats with role, level, and team scoping.
ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS role  text,
  ADD COLUMN IF NOT EXISTS level integer,
  ADD COLUMN IF NOT EXISTS team  text;

-- Backfill existing accepted seats as generic reviewers (preserves behavior).
UPDATE reviewer_seats
   SET role = 'reviewer'
 WHERE status = 'accepted'
   AND role IS NULL;

-- 2. New approval_policies table — one active row per workspace, versioned.
CREATE TABLE IF NOT EXISTS approval_policies (
  id               TEXT PRIMARY KEY,
  workspace_id     TEXT NOT NULL,
  mode             TEXT NOT NULL DEFAULT 'single',
  required_count   INTEGER,
  required_roles   JSONB,
  allow_break_glass BOOLEAN NOT NULL DEFAULT true,
  status           TEXT NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One active policy per workspace. Superseded rows keep status = 'superseded'.
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_policies_active
  ON approval_policies (workspace_id)
  WHERE status = 'active';
