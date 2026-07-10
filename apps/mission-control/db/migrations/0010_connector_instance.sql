ALTER TABLE evidence_records
  ADD COLUMN IF NOT EXISTS connector_instance_id TEXT;

CREATE INDEX IF NOT EXISTS idx_evidence_workspace_connector_instance
  ON evidence_records(workspace_id, connector_instance_id);
