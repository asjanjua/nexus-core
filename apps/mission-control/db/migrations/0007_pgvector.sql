-- Migration 0007: real pgvector column + HNSW index
--
-- Prerequisites:
--   Run against POSTGRES_URL_NON_POOLING (bypasses PgBouncer — DDL requires
--   a direct connection, not a pooled one).
--
-- What this does:
--   1. Enables the pgvector extension (pre-installed on Vercel Postgres / Neon).
--   2. Drops the JSONB embedding stub that was used as a placeholder in V1.
--   3. Adds a real vector(1536) column for OpenAI text-embedding-3-small output.
--   4. Builds an HNSW index for approximate cosine-similarity search.
--      m=16, ef_construction=128 are the standard balanced defaults for 1536-dim.
--      CONCURRENTLY avoids an exclusive table lock in production.
--   5. Adds the composite indexes from 0006 that were missing on evidence_records
--      and audit_events (recommendations index was already in 0006).
--
-- After running:
--   Set NEXUS_VECTOR_SEARCH=enabled and OPENAI_API_KEY in Vercel env vars
--   to activate the vector retrieval path. Without those vars the app
--   stays on keyword search — the column simply sits NULL until populated.

-- 1. Extension ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Drop JSONB stub, add real vector column ---------------------------------
ALTER TABLE evidence_records DROP COLUMN IF EXISTS embedding;
ALTER TABLE evidence_records ADD COLUMN embedding vector(1536);

-- 3. HNSW index --------------------------------------------------------------
-- Build CONCURRENTLY to avoid a full table lock.
-- In psql you cannot run CONCURRENTLY inside a transaction block;
-- run this statement on its own if your migration runner wraps in BEGIN/COMMIT.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_embedding_hnsw
  ON evidence_records
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- 4. Composite indexes -------------------------------------------------------
-- Approval queue and evidence list filter by workspace + status constantly.
CREATE INDEX IF NOT EXISTS idx_evidence_workspace_status
  ON evidence_records (workspace_id, ingestion_status);

-- Audit trail queries filter by workspace and sort by time.
CREATE INDEX IF NOT EXISTS idx_audit_workspace_created
  ON audit_events (workspace_id, created_at DESC);
