import path from "node:path";
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { normalizeDatabaseUrl } from "./db-url.mjs";
import { loadEnvFiles } from "./load-env.mjs";

// Node does not read .env files; without this the script fails with
// "DATABASE_URL is required" on a machine where it is sitting in .env.local.
const envFiles = loadEnvFiles();
if (envFiles.length) console.log(`[db:check] env from: ${envFiles.join(", ")}`);

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: normalizeDatabaseUrl(dbUrl) });

/**
 * Which migrations this database has, against which the repository has.
 *
 * `db:migrate` printing `skip` only means the id is present in
 * `_nexus_migrations`. It says nothing about whether the running application
 * expects those migrations, and nothing about drift in the other direction.
 *
 * Both directions are real. On 2026-08-05 the database was a release AHEAD of
 * the deployed application: 0043 and 0044 were recorded while the live site
 * still served code that predated them, because Render applies migrations
 * during build and that build had not promoted. The reverse — files present in
 * the repository but never applied — is the ordinary "forgot to migrate" case.
 */
async function migrationState(pool) {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
  const onDisk = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  let applied = [];
  try {
    const { rows } = await pool.query("SELECT id FROM _nexus_migrations ORDER BY id");
    applied = rows.map((r) => r.id);
  } catch {
    // No table means nothing has ever run here. A definitive answer, not a
    // failure to look.
    return { appliedCount: 0, latestApplied: null, pending: onDisk, appliedNotOnDisk: [] };
  }

  const appliedSet = new Set(applied);
  const diskSet = new Set(onDisk);
  return {
    appliedCount: applied.length,
    latestApplied: applied[applied.length - 1] ?? null,
    // In the repository, not in the database. The deploy has not migrated yet.
    pending: onDisk.filter((f) => !appliedSet.has(f)),
    // In the database, not in the repository. Means this database has been
    // migrated by a NEWER checkout than the one you are standing in — the
    // ahead-of-code case, and the one that is easy to miss.
    appliedNotOnDisk: applied.filter((id) => !diskSet.has(id))
  };
}

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
    process.exitCode = 1;
  }
  if (migrations.appliedNotOnDisk.length) {
    console.error(
      `\n${migrations.appliedNotOnDisk.length} migration(s) applied here but absent from this checkout:`
    );
    for (const f of migrations.appliedNotOnDisk) console.error(`  ${f}`);
    console.error(
      "This database has been migrated by a newer checkout. Confirm which commit is deployed " +
        "(`/api/health` reports build.commitShort) before changing schema."
    );
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    JSON.stringify(
      { ok: false, error: error instanceof Error ? error.message : "db_check_failed" },
      null,
      2
    )
  );
  process.exit(1);
} finally {
  await pool.end();
}
