import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));
const APP = join(SCRIPTS, "..");
const REPO = join(APP, "..", "..");

/**
 * Load the same .env files the app uses.
 *
 * Node does not read these on its own, and Next only loads them for the app
 * itself — never for a standalone script. So `npm run db:migrate` failed with
 * "DATABASE_URL is required" on a machine where DATABASE_URL was sitting in
 * .env.local the whole time, and the only way to run it was to export the
 * variable by hand first.
 *
 * PRECEDENCE. A real environment variable always wins, so
 * `DATABASE_URL=... npm run db:migrate` still overrides the file, and CI —
 * which sets real variables and ships no .env — is unaffected. Among the files
 * the first one to define a key keeps it, matching Next's own ordering:
 * production.local, then development.local, then local, then the repo root.
 *
 * Returns the files it read so a script can say where its configuration came
 * from. "Loaded env from: apps/mission-control/.env.production.local" is the
 * difference between trusting a result and wondering which database you just
 * migrated.
 */
export function loadEnvFiles() {
  const files = [
    join(APP, ".env.production.local"),
    join(APP, ".env.development.local"),
    join(APP, ".env.local"),
    join(REPO, ".env.local"),
  ];
  const loaded = [];

  for (const file of files) {
    if (!existsSync(file)) continue;
    loaded.push(file.replace(REPO + "/", ""));
    for (const raw of readFileSync(file, "utf8").split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      // A line with no "=", or one starting with it, is not an assignment.
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }

  return loaded;
}
