-- Migration 0032: time-boxed workspace expiry (Vantage per-deal, Meridian
-- per-submission workspaces)
--
-- Adds a nullable expires_at deadline distinct from trial_ends_at (a
-- deliberate business deadline, not a billing trial). Reuses the existing
-- 'suspended' status rather than widening workspace_status, so expiry
-- behaves identically to payment-failure suspension: access blocked,
-- reversible, no data touched. Actual data deletion is a separate,
-- deliberately-triggered action (see repository.purgeWorkspaceData) and is
-- never run by the expiry cron automatically.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
