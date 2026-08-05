import { ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { isOriginalStorageEnabled } from "@/lib/services/object-storage";

export const runtime = "nodejs";

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function llmHealth() {
  const provider = (process.env.NEXUS_LLM_PROVIDER ?? "anthropic").trim().toLowerCase();

  if (provider === "deepseek") {
    return {
      ok: configured(process.env.DEEPSEEK_API_KEY),
      provider,
      baseUrlConfigured: configured(process.env.DEEPSEEK_BASE_URL)
    };
  }

  if (provider === "openai_compatible") {
    return {
      ok: configured(process.env.OPENAI_COMPAT_API_KEY) || configured(process.env.DEEPSEEK_API_KEY),
      provider,
      baseUrlConfigured: configured(process.env.OPENAI_COMPAT_BASE_URL)
    };
  }

  return {
    ok: configured(process.env.ANTHROPIC_API_KEY),
    provider: "anthropic",
    baseUrlConfigured: configured(process.env.ANTHROPIC_BASE_URL)
  };
}

function vectorHealth() {
  const enabled = process.env.NEXUS_VECTOR_SEARCH === "enabled";

  return {
    ok: !enabled || configured(process.env.OPENAI_API_KEY),
    enabled,
    embeddingProviderConfigured: configured(process.env.OPENAI_API_KEY)
  };
}

/**
 * Which commit is actually running.
 *
 * Without this there is no way to ask the deployed application what it is.
 * Verifying a release meant reading the Render dashboard and trusting that it
 * described the same process answering the request — so "deployed at <sha>",
 * which the release and smoke procedures both require as evidence, could only
 * ever be asserted, never demonstrated. A push that silently failed to build
 * looked identical to one that succeeded.
 *
 * Render injects RENDER_GIT_COMMIT at build time. Reported as `unknown` rather
 * than omitted when absent (local runs, other hosts), because a missing field
 * reads as "old build of the health endpoint" and an explicit unknown reads as
 * what it is.
 *
 * Safe to expose unauthenticated: it is a public repository's commit hash, and
 * the operational cost of not knowing what is live is far higher than the
 * disclosure.
 */
function buildInfo() {
  const commit = process.env.RENDER_GIT_COMMIT?.trim();
  return {
    commit: commit || "unknown",
    // Short form is what a human compares against `git log --oneline`.
    commitShort: commit ? commit.slice(0, 7) : "unknown",
    branch: process.env.RENDER_GIT_BRANCH?.trim() || "unknown"
  };
}

export async function GET() {
  const db = await repository.healthCheck();
  const llm = llmHealth();
  const vectorSearch = vectorHealth();
  const originalsEnabled = process.env.NEXUS_R2_ORIGINALS === "enabled";
  const originalsStorage = {
    ok: !originalsEnabled || isOriginalStorageEnabled(),
    enabled: originalsEnabled
  };
  const healthy = db.ok && llm.ok && vectorSearch.ok && originalsStorage.ok;

  return ok({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    environment: process.env.NEXUS_ENV ?? "unknown",
    build: buildInfo(),
    checks: {
      database: db,
      vectorSearch,
      originalsStorage,
      llm
    }
  });
}
