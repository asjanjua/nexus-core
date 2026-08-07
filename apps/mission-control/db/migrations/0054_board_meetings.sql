-- Migration 0054: board_meetings (separate from 0053 for rollback granularity)
-- Meeting records: date, attendees, agenda, minutes, decisions.

CREATE TABLE IF NOT EXISTS board_meetings (
  id              TEXT PRIMARY KEY,
  board_id        TEXT NOT NULL REFERENCES board_profiles(id),
  workspace_id    TEXT NOT NULL,
  meeting_number  INTEGER NOT NULL DEFAULT 1,
  title           TEXT NOT NULL,
  meeting_date    TIMESTAMPTZ NOT NULL,
  location        TEXT,
  attendees_count INTEGER NOT NULL DEFAULT 0,
  quorum_met      BOOLEAN NOT NULL DEFAULT FALSE,
  agenda_status   VARCHAR(32) NOT NULL DEFAULT 'draft',
  minutes_status  VARCHAR(32) NOT NULL DEFAULT 'pending',
  decisions_count INTEGER NOT NULL DEFAULT 0,
  action_items_count INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS board_meetings_board
  ON board_meetings (board_id, meeting_date DESC);

CREATE INDEX IF NOT EXISTS board_meetings_workspace
  ON board_meetings (workspace_id, meeting_date DESC);
