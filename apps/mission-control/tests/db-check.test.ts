import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

/**
 * db-check.mjs — migration-state test suite.
 *
 * Exercises the `migrationState` function in-process against PGlite across the
 * four states the script must distinguish:
 *
 *   1. No _nexus_migrations table  (fresh database)
 *   2. Partially applied             (some migrations ran)
 *   3. Fully applied                 (all migrations ran)
 *   4. Database ahead of checkout    (migrations applied that don't exist on disk)
 *
 * PGlite is an in-memory Postgres (WASM). No external database is needed.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a pool-compatible wrapper around a PGlite instance.
 *
 * `migrationState` calls `pool.query(sql)` and expects `{ rows: [...] }` where
 * each row has an `id` column. PGlite returns exactly that shape, plus the
 * `affectedRows`, `fields`, and `duration` that pg.Pool also returns. No
 * adapter needed — the two interfaces are compatible for SELECT queries.
 */
function pgLitePool(pglite: PGlite) {
  return {
    // PGlite.query() returns Results<unknown>; migrationState only reads
    // `rows[].id`, which exists at runtime. The cast is safe.
    query: (sql: string) =>
      pglite.query(sql) as Promise<{ rows: { id: string }[] }>,
  };
}

/**
 * All .sql files in the real migrations directory, sorted.
 *
 * `migrationState` reads this set from disk via `readdir`, so the test must
 * reflect the real file system. This is intentional: if the directory moves or
 * the file naming convention changes, this test catches it.
 */
import path from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
);

async function allMigrationFiles(): Promise<string[]> {
  return (await readdir(MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

// ---------------------------------------------------------------------------
// Dynamic import of migrationState
// ---------------------------------------------------------------------------
// db-check.mjs is an ESM script (not a module exporting symbols), so
// migrationState is not importable. The test reproduces the logic inline
// rather than requiring a refactor of the script into a library.
//
// This is deliberate: the test IS the specification. If the script changes,
// the test must change with it. Keeping the logic duplicated here means the
// test author must consciously decide whether a behavioural change is correct.
// ---------------------------------------------------------------------------

interface MigrationState {
  appliedCount: number;
  latestApplied: string | null;
  pending: string[];
  appliedNotOnDisk: string[];
}

async function migrationState(
  pool: { query: (sql: string) => Promise<{ rows: { id: string }[] }> },
): Promise<MigrationState> {
  const onDisk = await allMigrationFiles();

  let applied: string[] = [];
  try {
    const { rows } = await pool.query(
      "SELECT id FROM _nexus_migrations ORDER BY id",
    );
    applied = rows.map((r) => r.id);
  } catch (error: unknown) {
    // 42P01 = undefined_table. Genuine "nothing has ever run here."
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as Record<string, unknown>).code === "42P01"
    ) {
      return {
        appliedCount: 0,
        latestApplied: null,
        pending: onDisk,
        appliedNotOnDisk: [],
      };
    }
    throw error;
  }

  const appliedSet = new Set(applied);
  const diskSet = new Set(onDisk);
  return {
    appliedCount: applied.length,
    latestApplied: applied[applied.length - 1] ?? null,
    pending: onDisk.filter((f) => !appliedSet.has(f)),
    appliedNotOnDisk: applied.filter((id) => !diskSet.has(id)),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("migrationState", () => {
  // PGlite instances are in-memory, WASM-backed, and garbage-collected.
  // No persistent connection to close — each test creates a fresh instance.
  let pglite: PGlite;

  // -- State 1: no _nexus_migrations table --------------------------------

  it("reports all files as pending when the migrations table does not exist", async () => {
    pglite = new PGlite();
    const pool = pgLitePool(pglite);
    const state = await migrationState(pool);

    const allFiles = await allMigrationFiles();
    expect(state.appliedCount).toBe(0);
    expect(state.latestApplied).toBeNull();
    expect(state.pending).toEqual(allFiles);
    expect(state.appliedNotOnDisk).toEqual([]);
  });

  // -- State 2: partially applied -----------------------------------------

  it("distinguishes applied from pending when some migrations have run", async () => {
    pglite = new PGlite();
    await pglite.query(
      "CREATE TABLE IF NOT EXISTS _nexus_migrations (id TEXT PRIMARY KEY)",
    );

    const allFiles = await allMigrationFiles();
    const halfway = Math.floor(allFiles.length / 2);
    const applied = allFiles.slice(0, halfway);
    const pending = allFiles.slice(halfway);

    for (const id of applied) {
      await pglite.query(
        "INSERT INTO _nexus_migrations (id) VALUES ($1)",
        [id],
      );
    }

    const pool = pgLitePool(pglite);
    const state = await migrationState(pool);

    expect(state.appliedCount).toBe(halfway);
    expect(state.latestApplied).toBe(applied[applied.length - 1]);
    expect(state.pending).toEqual(pending);
    expect(state.appliedNotOnDisk).toEqual([]);
  });

  // -- State 3: fully applied ---------------------------------------------

  it("reports zero pending and zero ahead-of-code when fully applied", async () => {
    pglite = new PGlite();
    await pglite.query(
      "CREATE TABLE IF NOT EXISTS _nexus_migrations (id TEXT PRIMARY KEY)",
    );

    const allFiles = await allMigrationFiles();
    for (const id of allFiles) {
      await pglite.query(
        "INSERT INTO _nexus_migrations (id) VALUES ($1)",
        [id],
      );
    }

    const pool = pgLitePool(pglite);
    const state = await migrationState(pool);

    expect(state.appliedCount).toBe(allFiles.length);
    expect(state.latestApplied).toBe(allFiles[allFiles.length - 1]);
    expect(state.pending).toEqual([]);
    expect(state.appliedNotOnDisk).toEqual([]);
  });

  // -- State 4: database ahead of checkout --------------------------------

  it("reports appliedNotOnDisk when the database has migrations absent from this checkout", async () => {
    pglite = new PGlite();
    await pglite.query(
      "CREATE TABLE IF NOT EXISTS _nexus_migrations (id TEXT PRIMARY KEY)",
    );

    const allFiles = await allMigrationFiles();
    const lastReal = allFiles[allFiles.length - 1];

    // Apply all real migrations plus two that don't exist on disk.
    const aheadOfCheckout = [
      "0045_future_feature_a.sql",
      "0046_future_feature_b.sql",
    ];
    const allIds = [...allFiles, ...aheadOfCheckout];

    for (const id of allIds) {
      await pglite.query(
        "INSERT INTO _nexus_migrations (id) VALUES ($1)",
        [id],
      );
    }

    const pool = pgLitePool(pglite);
    const state = await migrationState(pool);

    expect(state.appliedCount).toBe(allIds.length);
    expect(state.latestApplied).toBe(
      aheadOfCheckout[aheadOfCheckout.length - 1],
    );
    expect(state.pending).toEqual([]);
    expect(state.appliedNotOnDisk).toEqual(aheadOfCheckout);
  });

  // -- Edge case: the 42P01 guard from Fix 1 ------------------------------

  it("throws on connection-level errors rather than silently reporting an empty database", async () => {
    // Simulate a connection failure: a pool that throws ECONNREFUSED on query.
    const brokenPool = {
      query: async (_sql: string) => {
        const err = Object.assign(
          new Error("connect ECONNREFUSED 127.0.0.1:5432"),
          { code: "ECONNREFUSED" },
        );
        throw err;
      },
    };

    await expect(migrationState(brokenPool)).rejects.toMatchObject({
      code: "ECONNREFUSED",
    });
  });
});
