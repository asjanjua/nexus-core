-- Migration 0008: workspace_profiles table
-- Stores company context for each workspace, used to personalise LLM prompts
-- in dashboards, ask queries, and recommendation generation.

CREATE TABLE IF NOT EXISTS workspace_profiles (
  workspace_id       TEXT PRIMARY KEY,
  company_name       VARCHAR(200),
  sector             VARCHAR(64),
  subsector          VARCHAR(64),
  business_model     VARCHAR(120),
  company_stage      VARCHAR(32),
  employee_band      VARCHAR(32),
  region             VARCHAR(120),
  primary_goals      JSONB     NOT NULL DEFAULT '[]',
  risk_profile       VARCHAR(32),
  priority_roles     JSONB     NOT NULL DEFAULT '[]',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
