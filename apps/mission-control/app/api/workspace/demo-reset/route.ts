/**
 * POST /api/workspace/demo-reset
 *
 * Admin action that clears all evidence, recommendations, and decisions from the
 * workspace and re-seeds it with a realistic sector demo pack.
 *
 * Only works when demo_mode is enabled on the workspace. This prevents accidental
 * use on a real client workspace.
 *
 * Query params:
 *   sector — one of: financial_services | professional_services | technology_saas
 *
 * Scope: admin
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import { generateRecommendations } from "@/lib/services/recommendations";
import { DEMO_PACKS, DEMO_PACK_SECTORS } from "@/lib/demo/sector-packs";
import crypto from "crypto";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  if (!settings?.demoMode) {
    return fail("demo_mode_required: enable demo mode in Settings before resetting the demo workspace", 403);
  }

  const url = new URL(request.url);
  const sector = url.searchParams.get("sector") ?? "technology_saas";
  if (!DEMO_PACK_SECTORS.includes(sector as typeof DEMO_PACK_SECTORS[number])) {
    return fail(`invalid_sector: must be one of ${DEMO_PACK_SECTORS.join(", ")}`, 400);
  }

  const pack = DEMO_PACKS[sector];
  const now = new Date().toISOString();

  // 1. Clear existing workspace data
  const existingEvidence = await repository.getEvidenceForWorkspace(ctx.workspaceId);
  await Promise.allSettled(
    existingEvidence.map(e => repository.deleteEvidenceRecord(e.id, ctx.userId))
  );

  const existingRecos = await repository.getRecommendations(ctx.workspaceId);
  await Promise.allSettled(
    existingRecos.map(r =>
      repository.updateRecommendationStatus(r.id, "rejected", ctx.userId)
    )
  );

  // 2. Update workspace profile to match the demo sector
  await repository.saveWorkspaceProfile({
    workspaceId: ctx.workspaceId,
    companyName: pack.workspaceName,
    sector,
    subsector: null,
    businessModel: "b2b",
    companyStage: "growth",
    employeeBand: "51_200",
    region: "GCC",
    primaryGoals: ["revenue_growth", "operational_efficiency", "risk_management"],
    riskProfile: "moderate",
    priorityRoles: ["ceo", "coo", "cfo", "cto", "cro"],
    companyArchetype: sector === "technology_saas" ? "digital_native" : sector === "financial_services" ? "corporate" : "professional_practice",
    archetypeVersion: "1.0",
    briefLanguageMode: "formal",
    locationCount: 2,
    roleStates: {},
    updatedAt: now,
  });

  // 3. Seed demo evidence — high confidence so cards populate immediately
  const seededIds: string[] = [];

  for (const item of pack.evidence) {
    try {
      const record = await ingestEvidence({
        workspaceId: ctx.workspaceId,
        tenantId: ctx.workspaceId,
        sourceType: item.sourceType,
        department: item.department,
        sourcePath: item.sourcePath,
        sourceTimestamp: new Date(Date.now() - item.freshnessHours * 3_600_000).toISOString(),
        hash: crypto.createHash("sha256").update(`${ctx.workspaceId}:${item.sourcePath}:demo`).digest("hex"),
        sensitivity: item.sensitivity,
        extractionConfidence: 0.88, // high enough to auto-process
        text: item.text,
      });
      seededIds.push(record.id);
    } catch {
      // Non-fatal — log and continue to next item
    }
  }

  // 4. Fire recommendation generation from the seeded evidence
  generateRecommendations(ctx.workspaceId).catch(() => undefined);

  // 5. Log the reset
  await repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "demo.reset",
    actor: ctx.userId,
    payload: { sector, workspaceName: pack.workspaceName, evidenceSeeded: seededIds.length, resetAt: now },
  });

  return ok({
    reset: true,
    sector,
    workspaceName: pack.workspaceName,
    evidenceSeeded: seededIds.length,
    message: `Demo workspace reset to ${pack.workspaceName} (${sector}). Dashboard cards will populate within a few seconds.`,
  });
}
