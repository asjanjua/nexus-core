import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// The REAL implementation that db-check.mjs runs. This import is the point of
// the suite: the previous version of this file kept its own copy of
// migrationState, so all five tests passed against a duplicate and
// db-check.mjs had no regression protection at all. See
// docs/PR_REVIEW_2026-08-08.md §3.1.
//
// @ts-expect-error — .mjs script module, no type declarations.
import { migrationState, migrationChecksum, MIGRATIONS_DIR } from "../scripts/migration-state.mjs";

/**
 * migration-state.mjs — drift detection test suite.
 *
 * Exercises the real `migrationState` against PGlite (in-memory Postgres, WASM)
 * across every state the script must distinguish:
 *
 *   1. No _nexus_migrations table   (fresh database)
 *   2. Partially applied            (some migrations ran)
 *   3. Fully applied                (all migrations ran)
 *   4. Database ahead of checkout   (applied ids absent from disk)
 *   5. Applied file edited since    (checksum mismatch)
 *   6. Pre-checksum database        (checksum column missing entirely)
 *   7. Connection failure           (must throw, not report an empty database)
 *
 * States 1 to 5 run against a temporary fixture directory rather than the real
 * db/migrations folder, so assertions do not shift every time a migration is
 * added. State 3 additionally runs against the real directory, because the
 * one thing worth coupling to reality is "does this still find our migrations".
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pool-compatible wrapper around a PGlite instance.
 *
 * `migrationState` calls `pool.query(sql)` and reads `rows[].id` and
 * `rows[].checksum`. PGlite returns exactly that shape, and — importantly for
 * the 42P01 and 42703 branches — surfaces real Postgres error codes on the
 * thrown error. No adapter needed.
 */
function pgLitePool(pglite: PGlite) {
  return { query: (sql: string) => pglite.query(sql) };
}

let fixtureDir: string;

/** Write `name` into the fixture directory with the given SQL body. */
async function writeMigration(name: string, sql: string): Promise<void> {
  await writeFile(path.join(fixtureDir, name), sql, "utf8");
}

/** Insert a row into _nexus_migrations, optionally with a checksum. */
async function recordApplied(
  pglite: PGlite,
  id: string,
  checksum?: string,
): Promise<void> {
  await pglite.query(
    "INSERT INTO _nexus_migrations (id, checksum) VALUES ($1, $2)",
    [id, checksum ?? null],
  );
}

/** The migrations table as db-migrate.mjs creates it today. */
async function createMigrationsTable(pglite: PGlite): Promise<void> {
  await pglite.query(
    "CREATE TABLE _nexus_migrations (id TEXT PRIMARY KEY, checksum TEXT)",
  );
}

const A_SQL = "CREATE TABLE a (id INT);";
const B_SQL = "CREATE TABLE b (id INT);";
const C_SQL = "CREATE TABLE c (id INT);";

// ---------------------------------------------------------------------------

// Suite-level timeout. Every case boots a fresh PGlite (WASM Postgres), which
// costs 1.3s to 3.9s of pure CPU. That fits the 5s default when this file runs
// alone but gets starved when the full suite runs 150 files in parallel — the
// same failure mode already documented on the zip-bomb test in
// tests/knowledge.test.ts. The assertions are sound; only the fixture is slow.
describe("migrationState", { timeout: 30_000 }, () => {
  let pglite: PGlite;

  beforeEach(async () => {
    fixtureDir = await mkdtemp(path.join(tmpdir(), "nexus-migrations-"));
    await writeMigration("0001_a.sql", A_SQL);
    await writeMigration("0002_b.sql", B_SQL);
    await writeMigration("0003_c.sql", C_SQL);
    // A non-.sql file must be ignored, not counted as a migration.
    await writeMigration("README.md", "not a migration");
    pglite = new PGlite();
  });

  afterEach(async () => {
    // PGlite must be closed explicitly. The previous version of this suite
    // asserted "no persistent connection to close — instances are
    // garbage-collected", which is wrong: each instance holds a WASM runtime
    // and its own event-loop handles, so leaking them left the vitest fork
    // unable to exit and the run ended in "Timeout terminating forks worker".
    // Harmless when this file runs alone, which is why it went unnoticed.
    await pglite?.close().catch(() => {});
    await rm(fixtureDir, { recursive: true, force: true });
  });

  // -- State 1: no _nexus_migrations table --------------------------------

  it("reports all files as pending when the migrations table does not exist", async () => {
    const state = await migrationState(pgLitePool(pglite), fixtureDir);

    expect(state.appliedCount).toBe(0);
    expect(state.latestApplied).toBeNull();
    expect(state.pending).toEqual(["0001_a.sql", "0002_b.sql", "0003_c.sql"]);
    expect(state.appliedNotOnDisk).toEqual([]);
    expect(state.modified).toEqual([]);
  });

  // -- State 2: partially applied -----------------------------------------

  it("distinguishes applied from pending when some migrations have run", async () => {
    await createMigrationsTable(pglite);
    await recordApplied(pglite, "0001_a.sql", migrationChecksum(A_SQL));

    const state = await migrationState(pgLitePool(pglite), fixtureDir);

    expect(state.appliedCount).toBe(1);
    expect(state.latestApplied).toBe("0001_a.sql");
    expect(state.pending).toEqual(["0002_b.sql", "0003_c.sql"]);
    expect(state.appliedNotOnDisk).toEqual([]);
    expect(state.modified).toEqual([]);
  });

  // -- State 3: fully applied ---------------------------------------------

  it("reports no drift in any direction when fully applied", async () => {
    await createMigrationsTable(pglite);
    await recordApplied(pglite, "0001_a.sql", migrationChecksum(A_SQL));
    await recordApplied(pglite, "0002_b.sql", migrationChecksum(B_SQL));
    await recordApplied(pglite, "0003_c.sql", migrationChecksum(C_SQL));

    const state = await migrationState(pgLitePool(pglite), fixtureDir);

    expect(state.appliedCount).toBe(3);
    expect(state.latestApplied).toBe("0003_c.sql");
    expect(state.pending).toEqual([]);
    expect(state.appliedNotOnDisk).toEqual([]);
    expect(state.modified).toEqual([]);
  });

  // -- State 4: database ahead of checkout --------------------------------

  it("reports appliedNotOnDisk when the database has migrations absent from this checkout", async () => {
    await createMigrationsTable(pglite);
    await recordApplied(pglite, "0001_a.sql", migrationChecksum(A_SQL));
    await recordApplied(pglite, "0002_b.sql", migrationChecksum(B_SQL));
    await recordApplied(pglite, "0003_c.sql", migrationChecksum(C_SQL));
    // Applied by a newer checkout — the 2026-08-05 production case.
    await recordApplied(pglite, "0004_future.sql", "deadbeef");
    await recordApplied(pglite, "0005_future.sql", "deadbeef");

    const state = await migrationState(pgLitePool(pglite), fixtureDir);

    expect(state.appliedCount).toBe(5);
    expect(state.latestApplied).toBe("0005_future.sql");
    expect(state.pending).toEqual([]);
    expect(state.appliedNotOnDisk).toEqual(["0004_future.sql", "0005_future.sql"]);
  });

  // -- State 5: an applied file was edited after it ran --------------------

  it("reports a migration whose file changed after it was applied", async () => {
    await createMigrationsTable(pglite);
    await recordApplied(pglite, "0001_a.sql", migrationChecksum(A_SQL));
    await recordApplied(pglite, "0002_b.sql", migrationChecksum(B_SQL));
    await recordApplied(pglite, "0003_c.sql", migrationChecksum(C_SQL));

    // Edit 0002 after the fact. db:migrate would print `skip` for it, because
    // it matches on id — this is exactly the drift that used to be invisible.
    await writeMigration("0002_b.sql", "CREATE TABLE b (id INT, extra TEXT);");

    const state = await migrationState(pgLitePool(pglite), fixtureDir);

    expect(state.modified).toEqual(["0002_b.sql"]);
    expect(state.pending).toEqual([]);
    expect(state.appliedNotOnDisk).toEqual([]);
  });

  it("treats CRLF and LF versions of the same migration as identical", async () => {
    await createMigrationsTable(pglite);
    await recordApplied(pglite, "0001_a.sql", migrationChecksum(A_SQL));
    // A Windows checkout, or an editor that rewrites line endings, must not
    // report every migration in the repository as modified.
    await writeMigration("0001_a.sql", A_SQL.replace(/\n/g, "\r\n"));

    const state = await migrationState(pgLitePool(pglite), fixtureDir);
    expect(state.modified).toEqual([]);
  });

  // -- State 6: database predates the checksum column ----------------------

  it("still reports id drift against a database with no checksum column", async () => {
    // A database migrated before checksums existed. The column is missing
    // entirely, which raises 42703 — recoverable, not fatal.
    await pglite.query("CREATE TABLE _nexus_migrations (id TEXT PRIMARY KEY)");
    await pglite.query("INSERT INTO _nexus_migrations (id) VALUES ('0001_a.sql')");

    const state = await migrationState(pgLitePool(pglite), fixtureDir);

    expect(state.appliedCount).toBe(1);
    expect(state.pending).toEqual(["0002_b.sql", "0003_c.sql"]);
    // Content drift is unavailable without the column — silently, but the id
    // checks still work, which is the behaviour that matters on an old database.
    expect(state.modified).toEqual([]);
  });

  it("does not report rows whose checksum was never recorded", async () => {
    await createMigrationsTable(pglite);
    // Column exists, value is null: applied before checksums were introduced.
    await recordApplied(pglite, "0001_a.sql");
    await writeMigration("0001_a.sql", "CREATE TABLE a (id INT, changed TEXT);");

    const state = await migrationState(pgLitePool(pglite), fixtureDir);
    expect(state.modified).toEqual([]);
  });

  // -- State 7: connection failure -----------------------------------------

  it("throws on connection-level errors rather than silently reporting an empty database", async () => {
    const brokenPool = {
      query: async (_sql: string) => {
        throw Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
          code: "ECONNREFUSED",
        });
      },
    };

    await expect(migrationState(brokenPool, fixtureDir)).rejects.toMatchObject({
      code: "ECONNREFUSED",
    });
  });

  // -- Coupling check against the real migrations directory ----------------

  it("finds the real db/migrations directory and reads .sql files from it", async () => {
    // The one assertion that should be coupled to reality: if the directory
    // moves or the naming convention changes, this fails.
    const state = await migrationState(pgLitePool(pglite), MIGRATIONS_DIR);
    expect(state.pending.length).toBeGreaterThan(0);
    expect(state.pending.every((f: string) => f.endsWith(".sql"))).toBe(true);
  });
});
