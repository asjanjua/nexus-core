-- Migration 0047: workspace_member_role
-- Extends reviewer_seats with a workspace-level member role for
-- P4 team management. The existing `role` column (approval-policy
-- scope) remains independent — a member can be a "contributor" at
-- the workspace level while having an "approver" role for a policy.
--
-- Roles: owner, admin, executive, reviewer, contributor, viewer.
-- Default: 'reviewer' for backward compatibility with existing seats.

ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS member_role VARCHAR(32) NOT NULL DEFAULT 'reviewer';

-- Index for listing workspace members by role.
CREATE INDEX IF NOT EXISTS reviewer_seats_member_role
  ON reviewer_seats (workspace_id, member_role);
