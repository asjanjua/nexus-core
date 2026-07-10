-- 0033: Readiness -> lane inheritance pipeline
-- 1. readiness_submissions: pending anonymous assessment records with single-use claim codes.
-- 2. strategy_profiles: lane lifecycle columns (initial lane, change audit fields).
-- Ref: docs/LANE_ASSIGNMENT_SPEC.md

CREATE TABLE IF NOT EXISTS readiness_submissions (
  id TEXT PRIMARY KEY,
  claim_code_hash VARCHAR(64) NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  total INTEGER NOT NULL,
  band VARCHAR(32) NOT NULL,
  sector VARCHAR(64),
  company_size VARCHAR(32),
  role VARCHAR(64),
  assigned_lane VARCHAR(32) NOT NULL DEFAULT 'evaluator',
  lane_confidence VARCHAR(16) NOT NULL DEFAULT 'low',
  email VARCHAR(320),
  consumed_at TIMESTAMPTZ,
  consumed_by_workspace_id TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_readiness_submissions_claim
  ON readiness_submissions(claim_code_hash);

CREATE INDEX IF NOT EXISTS idx_readiness_submissions_email
  ON readiness_submissions(email);

ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS initial_lane VARCHAR(32);
ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS lane_change_reason VARCHAR(255);
ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS lane_confidence VARCHAR(16);
ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS lane_changed_by VARCHAR(32);
ALTER TABLE strategy_profiles ADD COLUMN IF NOT EXISTS lane_changed_at TIMESTAMPTZ;
