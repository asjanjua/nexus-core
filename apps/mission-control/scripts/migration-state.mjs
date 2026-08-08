/**
 * Migration drift detection, shared by `db:check` and its test suite.
 *
 * WHY THIS IS A SEPARATE MODULE
 * -----------------------------
 * This logic used to live inside db-check.mjs, which is a top-level ESM script
 * with no exports. tests/db-check.test.ts therefore could not import it and
 * kept its own copy of the function instead. Five tests passed against that
 * copy, which meant db-check.mjs itself had zero regression protection — the
 * two implementations had already begun to diverge (the test's error narrowing
 * was tightened in PR #14 while the script's was not).
 *
 * Extracting the function is the whole fix. The script imports it, the test
 * imports it, and there is exactly one implementation to get right.
 *
 * See docs/PR_REVIEW_2026-08-08.md §3.1.
 */

import path from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

export const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations"
);

/**
 * Content hash recorded alongside a migration id when it is applied.
 *
 * Shared with db-migrate.mjs so both sides compute the same value. Line endings
 * are normalised first: a checkout on Windows, or an editor that rewrites CRLF,
 * would otherwise report every migration as modified.
 */
export function migrationChecksum(sqlText) {
  return crypto
    .createHash("sha256")
    .update(sqlText.replace(/\r\n/g, "\n"), "utf8")
    .digest("hex");
}

/**
 * Deterministic ordering for migration ids.
 *
 * db-check previously used JS `.sort()` (UTF-16 code unit order), db-migrate
 * used `localeCompare`, and the applied set came back via SQL `ORDER BY id`
 * (database collation, which ignores punctuation differently again). Three
 * orderings for one list. Code-unit order is the one that matches the
 * zero-padded `NNNN_name.sql` convention, so it is the one all three now use;
 * the SQL side pins it with `COLLATE "C"`.
 */
export function compareMigrationIds(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Which migrations this database has, against which the repository has.
 *
 * `db:migrate` printing `skip` only means the id is present in
 * `_nexus_migrations`. It says nothing about whether the running application
 * expects those migrations, and nothing about drift in the other direction.
 *
 * Three directions are real:
 *
 *   pending           In the repository, not in the database. The ordinary
 *                     "forgot to migrate" case.
 *   appliedNotOnDisk  In the database, not in the repository. On 2026-08-05 the
 *                     database was a release AHEAD of the deployed application:
 *                     0043 and 0044 were recorded while the live site still
 *                     served code that predated them, because Render applies
 *                     migrations during build and that build had not promoted.
 *   modified          Present in both, but the file's content no longer matches
 *                     the checksum recorded when it was applied. Invisible to
 *                     both scripts before this was added, because id equality
 *                     is a weaker claim than "the database and this checkout
 *                     agree" implies.
 *
 * `dir` is a parameter so tests can point at a fixture directory instead of
 * coupling every assertion to whatever happens to be in db/migrations today.
 */
export async function migrationState(pool, dir = MIGRATIONS_DIR) {
  const onDisk = (await readdir(dir))
    .filter((f) => f.endsWith(".sql"))
    .sort(compareMigrationIds);

  let applied = [];
  let checksums = new Map();
  try {
    // COLLATE "C" pins byte order so this agrees with compareMigrationIds
    // regardless of the database's lc_collate.
    const { rows } = await pool.query(
      'SELECT id, checksum FROM _nexus_migrations ORDER BY id COLLATE "C"'
    );
    applied = rows.map((r) => r.id);
    checksums = new Map(
      rows.filter((r) => r.checksum).map((r) => [r.id, r.checksum])
    );
  } catch (error) {
    // 42P01 = undefined_table. Genuine "nothing has ever run here."
    // Every other code (connection refused, auth failure, timeout, etc.) is a
    // real failure — re-throw so the caller reports it rather than silently
    // returning a false "empty database" result.
    if (error?.code === "42P01") {
      return {
        appliedCount: 0,
        latestApplied: null,
        pending: onDisk,
        appliedNotOnDisk: [],
        modified: [],
      };
    }
    // 42703 = undefined_column. The checksum column is added by migration
    // 0045; a database that predates it still has a usable id list, so fall
    // back rather than failing the whole check. Drift detection on content is
    // simply unavailable until 0045 lands.
    if (error?.code === "42703") {
      const { rows } = await pool.query(
        'SELECT id FROM _nexus_migrations ORDER BY id COLLATE "C"'
      );
      applied = rows.map((r) => r.id);
    } else {
      throw error;
    }
  }

  const appliedSet = new Set(applied);
  const diskSet = new Set(onDisk);

  // Only compare content for migrations that are both applied AND on disk AND
  // carry a recorded checksum. Rows written before 0045 have a null checksum
  // and are skipped rather than reported as modified.
  const modified = [];
  for (const id of onDisk) {
    const recorded = checksums.get(id);
    if (!recorded) continue;
    const sqlText = await readFile(path.join(dir, id), "utf8");
    if (migrationChecksum(sqlText) !== recorded) modified.push(id);
  }

  return {
    appliedCount: applied.length,
    latestApplied: applied[applied.length - 1] ?? null,
    pending: onDisk.filter((f) => !appliedSet.has(f)),
    appliedNotOnDisk: applied.filter((id) => !diskSet.has(id)),
    modified,
  };
}
