ALTER TABLE evidence_records
  ADD COLUMN IF NOT EXISTS department VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_evidence_workspace_department
  ON evidence_records(workspace_id, department);
