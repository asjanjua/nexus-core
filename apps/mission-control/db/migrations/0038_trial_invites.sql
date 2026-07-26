-- Migration 0038: Pinavia-issued trial invites.
--
-- Distinct from reviewer_seats (0035) on purpose. A reviewer seat is issued BY
-- a customer workspace INTO that same workspace, and is scoped by workspace_id.
-- A trial invite is issued by Pinavia staff to someone who has no workspace at
-- all yet, so it cannot carry a workspace_id at creation time.
--
-- redeemed_workspace_id is therefore nullable and filled in at redemption, once
-- the invitee has signed up and Clerk has given them an org (provisionWorkspace
-- uses the Clerk org id AS the workspace id, so no workspace can exist before
-- sign-up).
--
-- The invite code is stored only as a sha256 hash, matching reviewer_seats. The
-- plain code exists once, in the POST response and the invite email.

CREATE TABLE IF NOT EXISTS trial_invites (
  id                    TEXT PRIMARY KEY,
  email                 VARCHAR(320) NOT NULL,
  name                  VARCHAR(160),
  company               VARCHAR(200),
  -- Free-text note for the inviting operator: which conversation this came out
  -- of, what they asked to see. Never shown to the invitee.
  note                  TEXT,
  -- Which demo pack to seed on redemption. Null seeds nothing.
  demo_pack             VARCHAR(64),
  invite_code_hash      VARCHAR(64) NOT NULL,
  status                VARCHAR(16) NOT NULL DEFAULT 'invited',
  -- Clerk user id and workspace, both known only after redemption.
  redeemed_by           TEXT,
  redeemed_workspace_id TEXT,
  invited_by            TEXT NOT NULL,
  -- Trial length in days, captured per-invite so extending one prospect does
  -- not require changing a global default.
  trial_days            INTEGER NOT NULL DEFAULT 30,
  redeemed_at           TIMESTAMPTZ,
  revoked_at            TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Redemption looks the invite up by code hash only, so this index carries the
-- hot path. Not unique: a revoked-then-reissued code collision is astronomically
-- unlikely, but a unique constraint would turn one into a 500 instead of a miss.
CREATE INDEX IF NOT EXISTS trial_invites_code_hash_idx
  ON trial_invites (invite_code_hash);

-- Portal list view: newest first.
CREATE INDEX IF NOT EXISTS trial_invites_created_at_idx
  ON trial_invites (created_at DESC);
