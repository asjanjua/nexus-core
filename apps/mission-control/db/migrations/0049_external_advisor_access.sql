-- Migration 0049: external_advisor_access
-- Extends reviewer_seats with time-limited external advisor access.
-- Advisors get scope-bounded, time-boxed access without full membership.
--
-- access_type: 'member' (default, existing behavior) or 'advisor'.
--   Advisors have time-limited, scope-restricted access.
-- access_scope: JSON array of room/evidence IDs the advisor can view.
--   NULL or empty = all rooms/evidence (full workspace scope).
--   Advisors typically get 'viewer' member_role + specific scope.
-- access_expires_at: mandatory for advisors, NULL for members.
--   After expiry, the seat is automatically revoked.

ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS access_type VARCHAR(16) NOT NULL DEFAULT 'member';

ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS access_scope JSONB DEFAULT '[]'::jsonb;

ALTER TABLE reviewer_seats
  ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMPTZ;

-- Index for finding expired advisor seats to revoke.
CREATE INDEX IF NOT EXISTS reviewer_seats_access_expires
  ON reviewer_seats (access_expires_at)
  WHERE access_type = 'advisor' AND status = 'accepted';
