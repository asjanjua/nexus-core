-- Migration 0024: Orchestration Dispatcher job queue
-- Adds the dispatch_jobs table used by lib/services/dispatcher.ts
-- Supports: priority queuing, retry with backoff, job chaining, atomic claim

CREATE TABLE IF NOT EXISTS dispatch_jobs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_type        VARCHAR(64) NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',
  priority        INTEGER NOT NULL DEFAULT 5,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 3,
  run_after       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error           TEXT,
  parent_job_id   TEXT REFERENCES dispatch_jobs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index for efficient claim queries (only pending rows)
CREATE INDEX IF NOT EXISTS dispatch_jobs_claim_idx
  ON dispatch_jobs (status, priority ASC, run_after ASC)
  WHERE status = 'pending';

-- Index for workspace job listing
CREATE INDEX IF NOT EXISTS dispatch_jobs_workspace_idx
  ON dispatch_jobs (workspace_id, created_at DESC);

-- Index for parent-child chain traversal
CREATE INDEX IF NOT EXISTS dispatch_jobs_parent_idx
  ON dispatch_jobs (parent_job_id)
  WHERE parent_job_id IS NOT NULL;
