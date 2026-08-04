-- 0041: Entity relationships — the graph edges Nexus never persisted.
-- Entities were extracted per document (entities + evidence_entity_links) but
-- never connected to each other, so retrieval could only do similarity search,
-- never "this vendor relates to this risk which relates to this decision."
-- One row per (workspace, source entity, target entity, relation type), reinforced
-- (occurrence_count incremented, evidence_refs appended) each time the pair is
-- seen again rather than duplicated — company memory compounds, per design principle 5.

CREATE TABLE IF NOT EXISTS entity_relationships (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL,
  source_entity_id  TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id  TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type     VARCHAR(32) NOT NULL DEFAULT 'co_occurs',
  evidence_refs     JSONB NOT NULL DEFAULT '[]',
  occurrence_count  INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- source_entity_id is always the lexicographically smaller id (canonicalized at
-- the application layer) so the same pair never gets stored in both directions.
CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_relationships_pair
  ON entity_relationships(workspace_id, source_entity_id, target_entity_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_source
  ON entity_relationships(workspace_id, source_entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_relationships_target
  ON entity_relationships(workspace_id, target_entity_id);
