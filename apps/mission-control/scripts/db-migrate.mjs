import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { normalizeDatabaseUrl } from "./db-url.mjs";
import { loadEnvFiles } from "./load-env.mjs";
import { compareMigrationIds, migrationChecksum } from "./migration-state.mjs";

// Node does not read .env files; without this the script fails with
// "DATABASE_URL is required" on a machine where it is sitting in .env.local.
const envFiles = loadEnvFiles();
if (envFiles.length) console.log(`[db:migrate] env from: ${envFiles.join(", ")}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "..", "db", "migrations");

function requireDbUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is required for db:migrate");
  }
  return normalizeDatabaseUrl(dbUrl);
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _nexus_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Content hash of the migration file at the moment it was applied. Nullable
  // on purpose: rows written before this column existed have no checksum, and
  // db:check skips those rather than reporting them as modified. Added here
  // rather than as a numbered migration because the migrations table is this
  // script's own bookkeeping and must exist before any migration can run.
  await pool.query(
    "ALTER TABLE _nexus_migrations ADD COLUMN IF NOT EXISTS checksum TEXT"
  );
}

async function getAppliedMigrations(pool) {
  const result = await pool.query("SELECT id FROM _nexus_migrations");
  return new Set(result.rows.map((row) => row.id));
}

async function applyMigration(pool, id, sqlText) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sqlText);
    // Checksum is written in the same transaction as the DDL, so a migration
    // can never be recorded without the hash of what actually ran.
    await client.query(
      "INSERT INTO _nexus_migrations (id, checksum) VALUES ($1, $2)",
      [id, migrationChecksum(sqlText)]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const pool = new Pool({
    connectionString: requireDbUrl(),
    // Runs inside Render's preDeployCommand (moved out of buildCommand
    // 2026-08-08). Without a bound, a wedged database hangs the deploy until
    // the platform kills it with no useful error. The timeout matters more
    // here than it did in the build: a preDeploy that never returns blocks
    // promotion while the current release keeps serving, which looks like a
    // stuck deploy rather than a database problem.
    connectionTimeoutMillis: 10_000,
  });
  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);
    // compareMigrationIds, not localeCompare: db:check and db:migrate must
    // agree on ordering, and code-unit order is what the zero-padded
    // NNNN_name.sql convention assumes.
    const files = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort(compareMigrationIds);

    if (!files.length) {
      console.log("No migration files found.");
      return;
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip ${file}`);
        continue;
      }
      const fullPath = path.join(migrationsDir, file);
      const sqlText = await fs.readFile(fullPath, "utf8");
      await applyMigration(pool, file, sqlText);
      console.log(`applied ${file}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
