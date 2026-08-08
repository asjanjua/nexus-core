-- Migration 0055: vantage_deals
--
-- The Deal Room hub has listed "Deal Room Setup" as a planned route since
-- Vantage shipped, because there was nowhere to put a deal. Every Vantage
-- screen therefore ran against "the workspace" as though a firm only ever
-- looks at one target at a time, and the hub filled the gap with an invented
-- deal name ("Fintech acquisition · GCC EMI target").
--
-- WHAT A DEAL IS HERE. Deliberately thin. It is a named scope with a checklist
-- type and an IC date — enough to say which review a finding belongs to and
-- when the committee sits. It is NOT a CRM record, a valuation, or a pipeline
-- stage. Vantage does not own the commercial process and must not look like it
-- does.
--
-- NO STATUS COLUMN, ON PURPOSE. The obvious field would be
-- approved/rejected/on-hold, and Vantage's registry boundary forbids exactly
-- that: it "must not mark a deal as approved, investable, or rejected". A
-- column that cannot legally hold the value everyone would expect it to hold
-- is a trap for the next developer. Lifecycle beyond `archived` belongs to the
-- investment committee, off-system.

CREATE TABLE IF NOT EXISTS vantage_deals (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  -- Client-facing name. Often a codename; treated as free text.
  name          TEXT        NOT NULL,
  -- Which checklist the reviews for this deal run against. Matches the
  -- DealType union in lib/agents/vantage-diligence-analysis.ts.
  deal_type     VARCHAR(32) NOT NULL DEFAULT 'fintech_ma',
  -- When the investment committee sits. Nullable: a deal often exists before a
  -- date is set, and a fabricated deadline is worse than an absent one.
  ic_date       TIMESTAMPTZ,
  -- The human accountable for the diligence, not for the decision.
  lead          TEXT,
  notes         TEXT,
  -- Soft close. Deals are referenced by judgments and audit records, so a hard
  -- delete would orphan the trail this product exists to keep.
  archived_at   TIMESTAMPTZ,
  created_by    TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vantage_deals_workspace
  ON vantage_deals (workspace_id, created_at DESC);

-- Two live deals in one workspace must not share a name, or a judgment logged
-- against "Project Falcon" is ambiguous. Archived rows are excluded so a name
-- can be reused after a deal closes.
CREATE UNIQUE INDEX IF NOT EXISTS vantage_deals_unique_live_name
  ON vantage_deals (workspace_id, lower(name))
  WHERE archived_at IS NULL;

COMMENT ON TABLE vantage_deals IS
  'A named diligence scope. Carries no approval state by design: Vantage must not mark a deal investable or rejected.';
