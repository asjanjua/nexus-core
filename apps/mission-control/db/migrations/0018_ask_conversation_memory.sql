-- Migration 0018: Persistent Ask conversation memory
-- Stores workspace/user-scoped Ask turns so follow-up questions can use recent context.

CREATE TABLE IF NOT EXISTS ask_conversation_messages (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT        NOT NULL,
  user_id      TEXT        NOT NULL,
  role         VARCHAR(16) NOT NULL, -- user | assistant
  text         TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ask_conversation_workspace_user_created_idx
  ON ask_conversation_messages (workspace_id, user_id, created_at DESC);
