-- 0035: Reviewer seats — identity-bound reviewer role per workspace.
-- First slice of the reviewer-seat build (TASKS.md P1, start-by 2026-07-21):
-- invite flow with single-use hashed invite codes, acceptance binds the seat
-- to a Clerk user id. Approvals and the pilotReady reviewer gate can then be
-- bound to an accepted seat instead of a free-text reviewer name.

CREATE TABLE IF NOT EXISTS reviewer_seats (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  email VARCHAR(320) NOT NULL,
  name VARCHAR(160),
  invite_code_hash VARCHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'invited', -- invited | accepted | revoked
  clerk_user_id TEXT,                            -- bound on acceptance
  invited_by TEXT NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviewer_seats_invite
  ON reviewer_seats(invite_code_hash);

CREATE INDEX IF NOT EXISTS idx_reviewer_seats_workspace
  ON reviewer_seats(workspace_id);

-- One live (non-revoked) accepted seat per workspace in V1.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviewer_seats_accepted_per_workspace
  ON reviewer_seats(workspace_id)
  WHERE status = 'accepted';
