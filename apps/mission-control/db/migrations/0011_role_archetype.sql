ALTER TABLE workspace_profiles
  ADD COLUMN IF NOT EXISTS company_archetype TEXT,
  ADD COLUMN IF NOT EXISTS archetype_version TEXT,
  ADD COLUMN IF NOT EXISTS brief_language_mode TEXT NOT NULL DEFAULT 'formal',
  ADD COLUMN IF NOT EXISTS location_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS role_states JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_workspace_profiles_archetype
  ON workspace_profiles(company_archetype);
