-- Migration 0029: DB-driven Stripe price IDs for plan_definitions
-- Lets pro/business Stripe prices be configured per-row instead of hardcoded
-- env vars. Column is nullable: stripe.ts falls back to STRIPE_PRICE_PRO /
-- STRIPE_PRICE_BUSINESS when unset, so existing deployments keep working
-- until this column is populated.

ALTER TABLE plan_definitions
  ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(128);
