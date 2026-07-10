CREATE TABLE IF NOT EXISTS strategy_profiles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  buyer_lane VARCHAR(32) NOT NULL DEFAULT 'evaluator',
  role VARCHAR(64),
  sector VARCHAR(64),
  company_size VARCHAR(32),
  priority VARCHAR(16) DEFAULT 'medium',
  sponsor_name VARCHAR(128),
  sponsor_email VARCHAR(255),
  reviewer_name VARCHAR(128),
  reviewer_email VARCHAR(255),
  governance_posture VARCHAR(32) DEFAULT 'standard',
  selected_workflow VARCHAR(64),
  readiness_scores JSONB DEFAULT '{}'::jsonb,
  readiness_band VARCHAR(16),
  external_ref VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_strategy_profiles_workspace
  ON strategy_profiles(workspace_id);

CREATE INDEX IF NOT EXISTS idx_strategy_profiles_buyer_lane
  ON strategy_profiles(buyer_lane);
