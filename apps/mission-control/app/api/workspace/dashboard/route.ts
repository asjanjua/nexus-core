import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const wsId = auth.ctx.workspaceId;

    const profile = await repository.getWorkspaceProfile(wsId).catch(() => null);
    const strategy = await repository.getStrategyProfile(wsId).catch(() => null);

    let notes = 0;
    let evidenceCount = 0;
    let decisionCount = 0;
    let recommendationCount = 0;

    try { notes = (await repository.listKnowledgeNotes(wsId, { limit: 1 })).length; } catch { /* empty */ }
    try { evidenceCount = (await repository.getEvidenceForWorkspace(wsId)).length; } catch { /* empty */ }
    try { decisionCount = (await repository.listDecisions(wsId)).length; } catch { /* empty */ }
    try { recommendationCount = (await repository.getRecommendations(wsId)).length; } catch { /* empty */ }

    // Token budget from workspace profile fields.
    // Profile type may include Drizzle-inferred columns not in the Zod schema.
    const p = (profile ?? {}) as Record<string, unknown>;
    const tokensUsed = (p.monthlyTokenUsed as number) ?? 0;
    const tokensLimit = (p.monthlyTokenLimit as number) ?? 0;
    const plan = (p.plan as string) ?? "free";
    const planChangedAt = (p.planChangedAt as string | null) ?? null;
    const activatedAt = (p.activatedAt as string | null) ?? null;

    return ok({
      workspaceId: wsId,
      generatedAt: new Date().toISOString(),
      plan: {
        key: plan,
        planChangedAt,
      },
      usage: {
        tokensUsed,
        tokensLimit,
        tokensPercent: tokensLimit > 0 ? Math.round((tokensUsed / tokensLimit) * 100) : 0,
      },
      content: {
        notes,
        evidenceCount,
        decisions: decisionCount,
        recommendations: recommendationCount,
      },
      profile: {
        buyerLane: strategy?.buyerLane ?? null,
        sponsorName: strategy?.sponsorName ?? null,
        activatedAt,
      },
    });
  } catch (_err) {
    return fail("dashboard_failed", 500);
  }
}
