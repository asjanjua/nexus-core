-- 0040: Meridian regulatory scope — the first persisted object in the
-- Submission Room. Determines which requirement set applies before any
-- evidence is assessed, so everything downstream (requirement library,
-- coverage, gaps, filing pack) reads from this row.
--
-- One scope per workspace. A workspace testing a second jurisdiction is a
-- second workspace, not a second row: mixing SECP and SBP requirement sets in
-- one scope is precisely the leak the jurisdiction-pack rules forbid.
--
-- Deliberately NOT stored here: anything that asserts regulatory conclusion.
-- This table records what the user selected, never what Meridian decided.

CREATE TABLE IF NOT EXISTS meridian_scope (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL,

  -- Scope arc, screen 1: regulatory scope
  jurisdiction      VARCHAR(80)  NOT NULL,
  regulator         VARCHAR(120) NOT NULL,
  license_type      VARCHAR(120) NOT NULL,
  license_status    VARCHAR(40)  NOT NULL,
  filing_objective  TEXT         NOT NULL,
  deadline          DATE,
  -- Free text by design. The reviewer becomes identity-bound at the
  -- pre-submission sign-off gate, not at scope-setting time.
  reviewer_name     VARCHAR(160),

  -- Scope arc, screen 2: license profile
  applicant_name    VARCHAR(200),
  ownership_posture TEXT,
  directors_note    TEXT,
  regulated_activities TEXT,

  created_by        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One scope per workspace; re-submitting updates the same row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_meridian_scope_workspace
  ON meridian_scope(workspace_id);
