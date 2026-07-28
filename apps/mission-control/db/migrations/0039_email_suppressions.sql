-- Migration 0039: honour unsubscribe requests.
--
-- GET /api/email/unsubscribe wrote an audit event, rendered a page saying "You
-- will no longer receive scheduled briefs by email", and suppressed nothing.
-- `synthesis_email_unsubscribed` was written in one place and read in none, and
-- the send loop in lib/services/synthesis-schedule.ts iterated
-- schedule.emailTargets with no suppression check. The page was making a
-- promise the system did not keep.
--
-- Suppression is keyed on (workspace, email) rather than being a flag on the
-- schedule row: a recipient may appear in several schedules within a workspace,
-- and unsubscribing from briefs should cover all of them without the caller
-- having to know which schedule the link came from.
--
-- Rows are kept after a resubscribe rather than deleted, so the record of when
-- someone opted out and when they came back survives. `active` carries the
-- current state.

CREATE TABLE IF NOT EXISTS email_suppressions (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL,
  -- Stored lower-cased; callers normalise at the boundary so the DB and the
  -- no-DB fallback agree on what counts as the same address.
  email         VARCHAR(320) NOT NULL,
  -- Why the address is suppressed. 'unsubscribe' today; a bounce or complaint
  -- handler would add its own reason without a schema change.
  reason        VARCHAR(32) NOT NULL DEFAULT 'unsubscribe',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per address per workspace; re-unsubscribing updates in place.
CREATE UNIQUE INDEX IF NOT EXISTS email_suppressions_workspace_email_idx
  ON email_suppressions (workspace_id, email);

-- The send loop asks "who in this workspace is suppressed" before every batch.
CREATE INDEX IF NOT EXISTS email_suppressions_active_idx
  ON email_suppressions (workspace_id, active);
