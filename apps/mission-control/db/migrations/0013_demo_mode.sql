-- Migration 0013: demo mode flag on workspace_settings
-- Disables real ingestion and shows a Demo badge during sales demos.

ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS demo_mode BOOLEAN NOT NULL DEFAULT FALSE;
