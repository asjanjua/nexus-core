DO $$
BEGIN
  CREATE TYPE sensitivity AS ENUM ('public', 'internal', 'confidential', 'restricted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ingestion_status AS ENUM ('queued', 'triaged', 'quarantined', 'processed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE recommendation_status AS ENUM ('draft', 'in_review', 'approved', 'rejected', 'promoted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE decision_status AS ENUM ('open', 'decided', 'superseded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email VARCHAR(320) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  password_hash TEXT,
  password_salt TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  role VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  source_type VARCHAR(64) NOT NULL,
  source_path TEXT NOT NULL,
  source_uri TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS evidence_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  source_id TEXT,
  source_type VARCHAR(64) NOT NULL,
  source_path TEXT NOT NULL,
  source_uri TEXT,
  source_timestamp TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash VARCHAR(128) NOT NULL,
  sensitivity sensitivity NOT NULL,
  extraction_confidence INTEGER NOT NULL,
  ingestion_status ingestion_status NOT NULL,
  freshness_hours INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  embedding JSONB
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type VARCHAR(64) NOT NULL,
  name VARCHAR(200) NOT NULL,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  owner VARCHAR(120) NOT NULL,
  status recommendation_status NOT NULL,
  confidence INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  owner VARCHAR(120) NOT NULL,
  rationale TEXT NOT NULL,
  status decision_status NOT NULL,
  decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  recommendation_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  type VARCHAR(120) NOT NULL,
  actor VARCHAR(120) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_workspace_ingested
  ON evidence_records (workspace_id, ingested_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_workspace_status
  ON evidence_records (workspace_id, ingestion_status);

CREATE INDEX IF NOT EXISTS idx_recommendations_workspace_updated
  ON recommendations (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_workspace_created
  ON audit_events (workspace_id, created_at DESC);
