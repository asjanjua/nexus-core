-- 0042: Meridian licence type key.
--
-- 0040 stored license_type as free text ("Electronic Money Institution"). The
-- requirement library in lib/domain/regulatory-requirement-library.ts keys off
-- a stable identifier ("sbp_emi"), so the two could not be joined and the
-- Evidence arc had no way to select a requirement pack from a saved scope.
--
-- Free text cannot be reliably matched to a key after the fact — "EMI",
-- "E-Money Institution", and "Electronic Money Institution (EMI)" are all the
-- same licence to a human and three different strings to a query. So the key
-- is added as its own column rather than inferred.
--
-- NULLABLE on purpose. Scopes saved before this migration have no key, and the
-- Evidence arc treats that as "requirement pack not yet selectable" and asks
-- the user to re-pick, rather than guessing a pack and quietly showing the
-- wrong regulator's obligations. license_type stays as the display label.

ALTER TABLE meridian_scope
  ADD COLUMN IF NOT EXISTS license_type_key VARCHAR(80);

-- Lookups are per-workspace and single-row, so no index is warranted; the
-- existing unique index on workspace_id already serves every read path.

COMMENT ON COLUMN meridian_scope.license_type_key IS
  'Stable key from regulatory-requirement-library (e.g. sbp_emi). Selects the requirement pack. NULL for scopes saved before migration 0042.';
