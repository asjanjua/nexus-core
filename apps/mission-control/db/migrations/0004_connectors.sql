-- Migration 0004: Connector installs table
-- Stores one row per (workspace, connector type) install.
-- Credentials are stored encrypted; see lib/crypto.ts for the cipher.

CREATE TABLE IF NOT EXISTS connectors (
  id                     TEXT PRIMARY KEY,
  workspace_id           TEXT NOT NULL,
  type                   VARCHAR(64) NOT NULL,
  status                 VARCHAR(32) NOT NULL DEFAULT 'pending',
  installed_by           TEXT NOT NULL,
  installed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sync_at           TIMESTAMPTZ,
  sync_error             TEXT,
  encrypted_credentials  TEXT,
  config                 JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_connectors_workspace ON connectors (workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connectors_workspace_type ON connectors (workspace_id, type);
