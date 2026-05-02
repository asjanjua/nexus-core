function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function isDbRequired(): boolean {
  if (process.env.NEXUS_DB_REQUIRED === "true") return true;
  if (process.env.NEXUS_DB_REQUIRED === "false") return false;
  if (isNextBuildPhase()) return false;
  return process.env.NODE_ENV === "production";
}

export function assertDbConfigured(): void {
  if (!isDbRequired()) return;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required because DB-required mode is enabled.");
  }
}
