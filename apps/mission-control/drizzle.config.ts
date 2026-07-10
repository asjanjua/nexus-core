import { normalizeDatabaseUrl } from "./lib/data/postgres-url";

export default {
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL ?? "")
  }
};
