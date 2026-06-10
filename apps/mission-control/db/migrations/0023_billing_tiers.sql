-- Migration 0023: Billing tiers and usage metering
-- Adds plan columns to workspaces and creates plan_definitions table with seed data.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS plan VARCHAR(32) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS monthly_token_limit BIGINT NOT NULL DEFAULT 500000,
  ADD COLUMN IF NOT EXISTS monthly_token_used BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + interval '1 month'),
  ADD COLUMN IF NOT EXISTS plan_changed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS plan_definitions (
  plan_key              VARCHAR(32)  PRIMARY KEY,
  label                 VARCHAR(64)  NOT NULL,
  price_cents           INTEGER      NOT NULL DEFAULT 0,
  monthly_tokens        BIGINT       NOT NULL,
  max_roles             INTEGER      NOT NULL,
  max_evidence          INTEGER      NOT NULL,
  max_team              INTEGER      NOT NULL,
  max_connectors        INTEGER      NOT NULL,
  max_api_keys          INTEGER      NOT NULL,
  ask_daily_limit       INTEGER,
  scheduled_synthesis   BOOLEAN      NOT NULL DEFAULT false,
  synthesis_max_cadence VARCHAR(16),
  email_delivery        BOOLEAN      NOT NULL DEFAULT false,
  slack_delivery        BOOLEAN      NOT NULL DEFAULT false,
  exports_enabled       BOOLEAN      NOT NULL DEFAULT false,
  decision_extraction   BOOLEAN      NOT NULL DEFAULT false,
  custom_passports      BOOLEAN      NOT NULL DEFAULT false,
  data_residency        BOOLEAN      NOT NULL DEFAULT false,
  api_access            BOOLEAN      NOT NULL DEFAULT false,
  watermark             BOOLEAN      NOT NULL DEFAULT true
);

INSERT INTO plan_definitions VALUES
  ('free',       'Free',       0,      500000,   1,   50,   1,  0,  0,  10,   false, NULL,      false, false, false, false, false, false, false, true)
  ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO plan_definitions VALUES
  ('pro',        'Pro',        49900,  5000000,  5,   1000, 1,  0,  3,  NULL, true,  'weekly',  false, false, true,  false, false, false, true,  false)
  ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO plan_definitions VALUES
  ('business',   'Business',   250000, 25000000, 10,  5000, 5,  3,  10, NULL, true,  'daily',   true,  false, true,  true,  true,  false, true,  false)
  ON CONFLICT (plan_key) DO NOTHING;

INSERT INTO plan_definitions VALUES
  ('enterprise', 'Enterprise', 0,      0,        -1,  -1,   -1, -1, -1, NULL, true,  'daily',   true,  true,  true,  true,  true,  true,  true,  false)
  ON CONFLICT (plan_key) DO NOTHING;

-- Migrate existing active workspaces with Stripe subscriptions to business plan
UPDATE workspaces
  SET plan = 'business', monthly_token_limit = 25000000
  WHERE status = 'active' AND stripe_subscription_id IS NOT NULL;

-- Migrate existing pilot workspaces to business plan
UPDATE workspaces
  SET plan = 'business', monthly_token_limit = 25000000
  WHERE status = 'pilot';

-- Expire past-trial workspaces to free (soft conversion, no suspension)
UPDATE workspaces
  SET plan = 'free', status = 'active'
  WHERE status = 'trial' AND trial_ends_at < NOW();
