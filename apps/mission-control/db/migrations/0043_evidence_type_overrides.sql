-- 0043: reviewer overrides for document type.
--
-- Coverage identifies a document from its filename, or from its own text when
-- the filename is uninformative (lib/domain/document-type-classifier.ts). That
-- holds up on a tidy data room. It does not hold up on a real client's files:
-- a scanned PDF with no OCR has no usable text, "Project Falcon - Annex 4.pdf"
-- may be a cap table or a lease, and an inference can simply be wrong.
--
-- Today a reviewer who can see the mistake has no way to correct it. Coverage
-- then understates, which is the safe direction but still looks like the
-- product cannot read the documents it was given.
--
-- WHY A TABLE RATHER THAN A COLUMN. This is a human judgement that overrides a
-- machine one, on a product sold on provenance. It has to say who decided and
-- when, and it has to be reversible. A jsonb column on evidence_records would
-- record the answer and lose the accountability.
--
-- ONE ROW PER EVIDENCE RECORD. The override is the reviewer's complete answer
-- and replaces the derived types entirely rather than adding to them: a
-- reviewer correcting a wrong type must be able to remove it, which an
-- additive model cannot express. An empty array is therefore meaningful — it
-- says "a human looked and this document supports nothing" — and is different
-- from having no row at all, which means nobody has looked.

CREATE TABLE IF NOT EXISTS evidence_type_overrides (
  evidence_id   TEXT PRIMARY KEY,
  workspace_id  TEXT        NOT NULL,
  -- JSON array of document types from the classifier's vocabulary. May be
  -- empty; see the note above on why that is not the same as absent.
  types         JSONB       NOT NULL DEFAULT '[]'::jsonb,
  -- Who takes responsibility for the correction. Not nullable: an
  -- unattributable override is the thing this table exists to prevent.
  set_by        TEXT        NOT NULL,
  -- Optional reviewer note, e.g. "scanned, confirmed by opening it".
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coverage reads every override for a workspace in one query per request, so
-- the workspace lookup is the hot path rather than the per-evidence one.
CREATE INDEX IF NOT EXISTS evidence_type_overrides_workspace_idx
  ON evidence_type_overrides (workspace_id);

COMMENT ON TABLE evidence_type_overrides IS
  'Reviewer-set document types that replace the classifier output for one evidence record. Empty types array means a human looked and found nothing citable; no row means nobody has looked.';
