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
    checks: {
      database: db,
      vectorSearch,
      originalsStorage,
      llm
    }
  });
}
