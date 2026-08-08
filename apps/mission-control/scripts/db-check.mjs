import { Pool } from "pg";
import { normalizeDatabaseUrl } from "./db-url.mjs";
import { loadEnvFiles } from "./load-env.mjs";
import { migrationState } from "./migration-state.mjs";

/**
 * db:check — migration health check for the NexusAI database.
 *
 * Answers three questions that `db:migrate` cannot:
 *   1. Are there migration files on disk that haven't been applied?
 *      (the ordinary "forgot to migrate" case)
 *   2. Are there migrations in the database that don't exist in this checkout?
 *      (the database-ahead-of-code case — Render runs migrations at build time,
 *      before the new code serves anything)
 *   3. Has an already-applied migration file been edited since it ran?
 *      (invisible to both scripts until checksums were added — `db:migrate`
 *      skips on id, and id equality says nothing about content)
 *
 * Exits non-zero if any of the three drifts. A clean run means the database
 * and this checkout agree on which migrations have been applied AND on what
 * those migrations contained.
 *
 * The drift logic lives in ./migration-state.mjs so the test suite can import
 * the same function this script runs. It used to live here, which forced the
 * tests to keep a duplicate copy and left this file untested.
 *
 * Called by: `npm run db:check`, CI/CD gates, deploy runbooks.
 */

// Node does not read .env files; without this the script fails with
// "DATABASE_URL is required" on a machine where it is sitting in .env.local.
const envFiles = loadEnvFiles();
if (envFiles.length) console.log(`[db:check] env from: ${envFiles.join(", ")}`);

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(dbUrl),
  // This script is a CI and deploy gate. Against a wedged database the default
  // (wait forever) means the CI job's own timeout fires instead, which is a
  // much noisier failure than a clean non-zero exit with a connection error.
  connectionTimeoutMillis: 10_000,
  statement_timeout: 15_000,
});

try {
  const result = await pool.query("select now() as now, current_database() as db");
  const migrations = await migrationState(pool);
  console.log(
    JSON.stringify(
      { ok: true, db: result.rows[0]?.db, now: result.rows[0]?.now, migrations },
      null,
      2
    )
  );
  if (migrations.pending.length) {
    console.error(`\n${migrations.pending.length} migration(s) not applied to this database:`);
    for (const f of migrations.pending) console.error(`  ${f}`);
    console.error("Run `npm run db:migrate`.");
    // Set exitCode rather than calling process.exit() so all three drift
    // classes can be reported in a single run. The process exits naturally
    // when the script completes, after the finally block closes the pool.
    process.exitCode = 1;
  }
  if (migrations.appliedNotOnDisk.length) {
    console.error(
      `\n${migrations.appliedNotOnDisk.length} migration(s) applied here but absent from this checkout:`
    );
    for (const f of migrations.appliedNotOnDisk) console.error(`  ${f}`);
    console.error(
      "This database has been migrated by a newer checkout. Do not run db:migrate — the\n" +
        "database is already ahead of this checkout. Confirm which commit is deployed " +
        "(`/api/health` reports build.commitShort) before changing schema. Wait for the\n" +
        "deploy to promote, or check out the commit whose migrations are already applied."
    );
    process.exitCode = 1;
  }
  if (migrations.modified.length) {
    console.error(
      `\n${migrations.modified.length} applied migration(s) have been edited since they ran:`
    );
    for (const f of migrations.modified) console.error(`  ${f}`);
    console.error(
      "The file on disk no longer matches what was applied to this database.\n" +
        "`db:migrate` will NOT re-run it — it skips on id — so the edit exists in the\n" +
        "repository and nowhere else. Revert the file and write a new migration instead."
    );
    process.exitCode = 1;
  }
} catch (error) {
  // Unhandled error (connection failure, auth, timeout, readdir on a missing
  // migrations directory, etc.). Report it — we can't produce a meaningful
  // migration state. Set exitCode rather than calling process.exit() so the
  // finally block below actually gets to close the pool; process.exit()
  // terminates immediately and skips it.
  console.error(
    JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : "db_check_failed" },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  // Always close the pool, even if the query or migrationState threw.
  // Without this, the Node process hangs waiting for the idle connection.
  await pool.end();
}
