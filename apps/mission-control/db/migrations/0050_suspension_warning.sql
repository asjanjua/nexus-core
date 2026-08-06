-- Migration 0050: suspension_warning
-- Adds suspensionWarnedAt to workspaces so the daily suspension
-- checker can send exactly one warning email at 3 days past due,
-- then suspend at 7 days. Without this, every cron tick resends
-- the warning.

ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS suspension_warned_at TIMESTAMPTZ;
