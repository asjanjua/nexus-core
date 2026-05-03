import { ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { isOriginalStorageEnabled } from "@/lib/services/object-storage";

export const runtime = "nodejs";

export async function GET() {
  const db = await repository.healthCheck();

  return ok({
    status: db.ok ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    environment: process.env.NEXUS_ENV ?? "unknown",
    checks: {
      database: db,
      vectorSearch: process.env.NEXUS_VECTOR_SEARCH === "enabled",
      originalsStorage: isOriginalStorageEnabled()
    }
  });
}
