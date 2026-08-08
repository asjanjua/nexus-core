-- Migration 0058: nucleus_deliverables (separate from 0057 for rollback granularity)
--
-- A deliverable is the thing a client eventually sees. The release boundary
-- already enforced by /api/nucleus/client-release requires a named partner and
-- a complete disclosure triple — source coverage, reviewer status, and
-- unresolved caveats — before anything leaves.
--
-- Until now that triple was assembled in a form at the moment of release and
-- never stored, so the guarantee held for the packet and not for the work. A
-- firm could satisfy it and have no record of what was disclosed.
--
-- WHY unresolved_caveats IS NULLABLE JSONB AND NOT DEFAULTED TO '[]'.
-- The API draws a distinction the schema has to preserve: an EMPTY ARRAY means
-- "we checked and there are none", an ABSENT value means "nobody answered".
-- Defaulting to '[]' would silently convert every unanswered deliverable into
-- a positive assurance that there are no caveats, which is the single most
-- dangerous lie this table could tell a client.
--
-- released_at IS THE ONLY LIFECYCLE. There is no draft/approved enum, because
-- Nucleus does not approve client advice — a named partner does, and the
-- record of that is the release row plus the audit event.

CREATE TABLE IF NOT EXISTS nucleus_deliverables (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT        NOT NULL,
  engagement_id       TEXT        NOT NULL REFERENCES nucleus_engagements(id),
  title               TEXT        NOT NULL,
  -- Disclosure triple. All three nullable at draft; all three required at
  -- release, enforced by the API rather than by NOT NULL so a partially
  -- prepared deliverable can still be saved.
  source_coverage     TEXT,
  reviewer_status     TEXT,
  unresolved_caveats  JSONB,
  -- Set when the deliverable was released to the client, with the partner who
  -- took responsibility at that moment.
  released_at         TIMESTAMPTZ,
  released_by_partner TEXT,
  created_by          TEXT        NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nucleus_deliverables_engagement
  ON nucleus_deliverables (engagement_id, created_at DESC);

CREATE INDEX IF NOT EXISTS nucleus_deliverables_workspace
  ON nucleus_deliverables (workspace_id, created_at DESC);

COMMENT ON COLUMN nucleus_deliverables.unresolved_caveats IS
  'NULL means nobody has answered. An empty array means checked, none outstanding. These must never render the same way to a client.';
