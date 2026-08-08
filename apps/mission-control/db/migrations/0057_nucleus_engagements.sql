-- Migration 0057: nucleus_engagements
--
-- NUMBERED 0057, NOT 0055. The sibling branch feat/vantage-deep-routes adds
-- 0055 and 0056 at the same time. Two branches claiming one number is a merge
-- conflict that resolves silently — whichever lands second gets renamed by a
-- human under time pressure, and the migration runner tracks filenames. Left a
-- gap on purpose.
--
-- A Nucleus engagement is a client assignment run under a firm's own
-- methodology. It exists so a deliverable can belong to something, and so the
-- reviewer console has a scope. Deliberately thin: Nucleus is not the firm's
-- practice management system and must not look like one.
--
-- NO BILLING, NO RATES, NO UTILISATION. The temptation is obvious and the
-- consequence is not: the moment this table holds commercial data it becomes
-- the firm's system of record, and a governance platform that also owns
-- billing has a conflict when a caveat is inconvenient.

CREATE TABLE IF NOT EXISTS nucleus_engagements (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  -- The partner firm's reference, and the client it is for.
  reference     TEXT        NOT NULL,
  client_name   TEXT        NOT NULL,
  -- Which methodology arc this engagement runs. Matches
  -- NucleusEngagementArc in lib/nucleus-engagement-workflow.ts.
  method_arc    VARCHAR(32) NOT NULL DEFAULT 'profile',
  -- The partner who owns client advice. Nullable at intake, mandatory before
  -- anything is released: /api/nucleus/client-release refuses without one.
  partner       TEXT,
  scope_note    TEXT,
  archived_at   TIMESTAMPTZ,
  created_by    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nucleus_engagements_workspace
  ON nucleus_engagements (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS nucleus_engagements_unique_live_ref
  ON nucleus_engagements (workspace_id, lower(reference))
  WHERE archived_at IS NULL;

COMMENT ON TABLE nucleus_engagements IS
  'A client assignment under a partner firm methodology. Holds no billing or commercial data by design.';
