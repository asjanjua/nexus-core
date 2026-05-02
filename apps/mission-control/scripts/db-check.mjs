import { Pool } from "pg";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });

try {
  const result = await pool.query("select now() as now, current_database() as db");
  console.log(JSON.stringify({ ok: true, db: result.rows[0]?.db, now: result.rows[0]?.now }, null, 2));
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
