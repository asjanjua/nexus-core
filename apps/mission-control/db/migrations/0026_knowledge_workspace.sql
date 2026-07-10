CREATE TYPE knowledge_note_status AS ENUM ('active', 'archived', 'deleted');
CREATE TYPE knowledge_source_kind AS ENUM ('manual', 'import', 'sync', 'automation', 'mcp');
CREATE TYPE knowledge_link_type AS ENUM ('note', 'evidence', 'entity', 'workflow_twin', 'decision', 'recommendation');

CREATE TABLE IF NOT EXISTS knowledge_notes (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  title varchar(200) NOT NULL,
  path text NOT NULL,
  body text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  sensitivity sensitivity NOT NULL DEFAULT 'internal',
  status knowledge_note_status NOT NULL DEFAULT 'active',
  source_kind knowledge_source_kind NOT NULL DEFAULT 'manual',
  frontmatter jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  entity_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  workflow_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  embedding vector(1536),
  created_by text NOT NULL,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_links (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  source_note_id text NOT NULL REFERENCES knowledge_notes(id) ON DELETE CASCADE,
  target_type knowledge_link_type NOT NULL,
  target_id text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_sync_events (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  type varchar(80) NOT NULL,
  path text,
  note_id text,
  status varchar(40) NOT NULL,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_notes_workspace_path_idx
  ON knowledge_notes (workspace_id, lower(path));

CREATE INDEX IF NOT EXISTS knowledge_notes_workspace_updated_idx
  ON knowledge_notes (workspace_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS knowledge_links_workspace_source_idx
  ON knowledge_links (workspace_id, source_note_id);

CREATE INDEX IF NOT EXISTS knowledge_links_workspace_target_idx
  ON knowledge_links (workspace_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS knowledge_sync_events_workspace_created_idx
  ON knowledge_sync_events (workspace_id, created_at DESC);
