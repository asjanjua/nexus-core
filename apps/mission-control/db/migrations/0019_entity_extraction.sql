-- Migration 0019: Entity extraction foundation
-- Adds evidence/entity links so Company Memory can trace every entity to source evidence.

CREATE TABLE IF NOT EXISTS evidence_entity_links (
  id          TEXT PRIMARY KEY,
  workspace_id TEXT      NOT NULL,
  evidence_id  TEXT      NOT NULL REFERENCES evidence_records(id) ON DELETE CASCADE,
  entity_id    TEXT      NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  confidence   INTEGER   NOT NULL DEFAULT 70,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evidence_id, entity_id)
);

CREATE INDEX IF NOT EXISTS entities_workspace_type_name_idx
  ON entities (workspace_id, type, name);

CREATE INDEX IF NOT EXISTS evidence_entity_links_workspace_idx
  ON evidence_entity_links (workspace_id);

CREATE INDEX IF NOT EXISTS evidence_entity_links_evidence_idx
  ON evidence_entity_links (evidence_id);

CREATE INDEX IF NOT EXISTS evidence_entity_links_entity_idx
  ON evidence_entity_links (entity_id);
