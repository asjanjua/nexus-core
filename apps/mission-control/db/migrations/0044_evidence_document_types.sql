-- 0044: cache the derived document type on the evidence row.
--
-- WHY. lib/domain/document-type-classifier.ts runs ~55 regex patterns over a
-- document's text. Nothing stored the answer, so every request recomputed it
-- for every record in the workspace. Measured on a 2,000-document data room:
-- 4.8s for the Meridian coverage API and 14s for the review queue, per request.
-- Capping the scan (commit 8b87a4a) roughly halved that and did not change the
-- shape of the problem: still linear in corpus size, still repeated per
-- request, for an answer that only changes when the document or the rules do.
--
-- WHY A COLUMN, WHERE THE REVIEWER OVERRIDE IN 0043 IS A TABLE. That override
-- is a human judgement on a product sold on provenance, so it must record who
-- decided and when, and must be reversible. This is machine output that can be
-- regenerated from the document at any time. It carries no accountability and
-- deserves no ceremony; it is a cache, and it belongs beside the thing it
-- caches. The two are read together and the override always wins.
--
-- WHY A VERSION COLUMN. The classifier's rules change whenever a requirement
-- pack introduces a document type, and every stored answer produced under the
-- old rules becomes wrong at that moment. Without a version this cache would
-- silently serve stale classifications forever, and a coverage screen quietly
-- reporting against retired rules is precisely the failure this product cannot
-- afford. The version is a fingerprint of the pattern table, computed in code,
-- so it changes on its own when the rules do. A row whose version does not
-- match the running code is ignored and recomputed on the spot: correctness
-- never depends on the backfill having been run.
--
-- NULLABLE ON PURPOSE. Existing rows get NULL, which reads as "no usable
-- cache" and falls through to computing it live — the behaviour before this
-- migration. So the migration is safe to run before the backfill, and safe to
-- run against a deployment still serving the old code.

ALTER TABLE evidence_records
  ADD COLUMN IF NOT EXISTS document_types JSONB,
  -- 'filename' | 'content' | 'none'. Kept so a screen can distinguish a type
  -- the author declared from one inferred from the body, without reclassifying.
  ADD COLUMN IF NOT EXISTS document_types_source VARCHAR(16),
  -- Fingerprint of the rules that produced the two columns above.
  ADD COLUMN IF NOT EXISTS document_types_version INTEGER;

-- The backfill and the staleness sweep both ask the same question: which rows
-- in this workspace were not classified by the current rules? Partial, because
-- once the backfill has run the answer is normally the empty set and there is
-- no reason to index rows that are already current.
CREATE INDEX IF NOT EXISTS evidence_records_untyped_idx
  ON evidence_records (workspace_id)
  WHERE document_types_version IS NULL;

COMMENT ON COLUMN evidence_records.document_types IS
  'Cached classifier output. Regenerable from the document; the reviewer override in evidence_type_overrides always takes precedence over it.';
COMMENT ON COLUMN evidence_records.document_types_version IS
  'Fingerprint of the classifier pattern table that produced document_types. A mismatch with the running code means the cache is stale and is recomputed.';
