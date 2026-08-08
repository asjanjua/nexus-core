-- Migration 0056: vantage_judgments (separate from 0055 for rollback granularity)
--
-- The Advisor Judgment Log. The registry boundary "advisor-judgment-visible"
-- requires that every recommendation posture identifies the human reviewer,
-- the material caveats, and the evidence behind the judgment. Until now that
-- was enforced only at the moment of handoff, on a payload assembled in a form
-- and never stored.
--
-- So the guarantee held for the packet and not for the reasoning: a firm could
-- satisfy it at 4pm and have no record of who concluded what, or when, or on
-- what basis. This table is that record.
--
-- WHY advisor IS NOT NULL. An unattributed judgment is the exact failure the
-- boundary exists to prevent — a machine's coverage output quietly becoming
-- "the team's view". The column refuses to store one rather than leaving it to
-- a caller to remember.
--
-- WHY superseded_by RATHER THAN UPDATE. Advisors change their minds, and the
-- change is the interesting part. Overwriting a judgment destroys the sequence
-- a regulator or an IC would want to read. New rows supersede old ones and
-- nothing is edited in place.

CREATE TABLE IF NOT EXISTS vantage_judgments (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  deal_id       TEXT        NOT NULL REFERENCES vantage_deals(id),
  -- The checklist item or red flag this judgment is about. Free text so a
  -- judgment can also cover a theme the checklist has no row for.
  subject       TEXT        NOT NULL,
  -- The named human. Not the system, not a team, not a role.
  advisor       TEXT        NOT NULL,
  -- What they concluded, in their words. Not an enum: forcing a judgment into
  -- proceed/hold/stop is the investment decision Vantage must not make.
  position      TEXT        NOT NULL,
  -- What would change their mind. Empty string is allowed and meaningful;
  -- the UI asks for it explicitly rather than letting it default silently.
  caveats       TEXT        NOT NULL DEFAULT '',
  -- Evidence ids the judgment rests on, so the reasoning stays traceable to
  -- documents rather than to memory.
  evidence_refs JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Points at a later judgment on the same subject. NULL means current.
  superseded_by TEXT,
  created_by    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vantage_judgments_deal
  ON vantage_judgments (deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS vantage_judgments_workspace
  ON vantage_judgments (workspace_id, created_at DESC);

COMMENT ON TABLE vantage_judgments IS
  'Append-only advisor judgments. Never updated in place; a revision supersedes its predecessor so the sequence survives.';
