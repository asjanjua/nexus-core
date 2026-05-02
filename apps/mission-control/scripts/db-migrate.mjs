import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "..", "db", "migrations");

function requireDbUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is required for db:migrate");
  }
  return dbUrl;
}

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _nexus_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
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
    await client.query("INSERT INTO _nexus_migrations (id) VALUES ($1)", [id]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const pool = new Pool({ connectionString: requireDbUrl() });
  try {
    await ensureMigrationsTable(pool);
    const applied = await getAppliedMigrations(pool);
    const files = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

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
