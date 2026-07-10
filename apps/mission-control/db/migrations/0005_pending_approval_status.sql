-- Migration 0005: Add pending_approval to ingestion_status enum
--
-- PostgreSQL requires ALTER TYPE ... ADD VALUE for enum additions.
-- This is a non-destructive, backwards-compatible change.
-- The new value sits between "triaged" and "quarantined" in the workflow:
--   queued → triaged → pending_approval (moderate confidence, needs human sign-off)
--                    → quarantined      (very low confidence, blocked)
--                    → processed        (high confidence, cleared for LLM synthesis)
--
-- IF NOT EXISTS prevents errors on idempotent re-runs (Postgres 9.6+).

ALTER TYPE ingestion_status ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'triaged';
