-- Migration 0053: board_profiles
-- Board governance data model for Quorum product line.
-- Company board configuration: type, jurisdiction, meeting schedule.

CREATE TABLE IF NOT EXISTS board_profiles (
  id                  TEXT PRIMARY KEY,
  workspace_id        TEXT NOT NULL,
  board_type          VARCHAR(32) NOT NULL DEFAULT 'advisory',
  -- advisory | fiduciary | regulatory | mixed
  jurisdiction        VARCHAR(64) NOT NULL DEFAULT 'pakistan',
  meeting_schedule    VARCHAR(64),
  -- monthly | quarterly | ad_hoc
  quorum_requirement  INTEGER NOT NULL DEFAULT 2,
  -- minimum attending members for quorum
  notice_period_days  INTEGER NOT NULL DEFAULT 7,
  -- advance notice required for meetings
  chairperson_name    TEXT,
  secretary_name      TEXT,
  next_meeting_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS board_profiles_workspace
  ON board_profiles (workspace_id);

-- Migration 0054: board_meetings
-- Meeting records: date, attendees, agenda, minutes, decisions.

CREATE TABLE IF NOT EXISTS board_meetings (
  id              TEXT PRIMARY KEY,
  board_id        TEXT NOT NULL REFERENCES board_profiles(id),
  workspace_id    TEXT NOT NULL,
  meeting_number  INTEGER NOT NULL DEFAULT 1,
  title           TEXT NOT NULL,
  meeting_date    TIMESTAMPTZ NOT NULL,
  location        TEXT,
  -- physical | virtual URL | hybrid
  attendees_count INTEGER NOT NULL DEFAULT 0,
  quorum_met      BOOLEAN NOT NULL DEFAULT FALSE,
  agenda_status   VARCHAR(32) NOT NULL DEFAULT 'draft',
  -- draft | circulated | approved
  minutes_status  VARCHAR(32) NOT NULL DEFAULT 'pending',
  -- pending | drafted | circulated | approved | signed
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
