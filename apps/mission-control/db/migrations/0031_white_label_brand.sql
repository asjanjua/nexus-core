-- Migration 0031: Level-3 white-label brand override (Nucleus)
-- Adds a nullable JSON column to workspace_settings holding a client's
-- brand override: logo URL, accent colour, font family. NULL = default
-- Pinavia branding. This is deliberately narrow — core status colours and
-- trust patterns are never part of this override (see Design Philosophy
-- v1.5 / Pinavia_Brand_and_Domain_Architecture.md §4).

ALTER TABLE workspace_settings
  ADD COLUMN IF NOT EXISTS white_label_brand JSONB;
