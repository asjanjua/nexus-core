/**
 * POST /api/workspace/seed-demo
 *
 * Loads the fully populated reference company (`lib/demo/reference-company.ts`)
 * into the current workspace: company profile, governed evidence, strategy/
 * readiness profile, and one workflow twin. After this runs, the dashboards,
 * Ask, the workflow scorer, and the pilot paperwork pack are all populated.
 *
 * Idempotent: clears existing evidence and re-seeds; the workflow twin is created
 * only if one with the same name does not already exist. Safe to run repeatedly.
 *
 * Guarded: requires `admin` scope AND `demoMode` on the workspace, so it can
 * never be run against a real client workspace by accident. Mirrors the guard
 * on `POST /api/workspace/demo-reset`.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import { generateRecommendations } from "@/lib/services/recommendations";
import { REFERENCE_COMPANY } from "@/lib/demo/reference-company";
import { evidenceSourceTypeSchema } from "@/lib/contracts";
import crypto from "crypto";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  if (!settings?.demoMode) {
    return fail("demo_mode_required: enable demo mode in Settings before seeding the demo workspace", 403);
  }

  const company = REFERENCE_COMPANY;
  const now = new Date().toISOString();

  // 1. Clear existing evidence and retire existing recommendations (idempotency).
  const existingEvidence = await repository.getEvidenceForWorkspace(ctx.workspaceId);
  await Promise.allSettled(existingEvidence.map((e) => repository.deleteEvidenceRecord(e.id, ctx.userId)));

  const existingRecos = await repository.getRecommendations(ctx.workspaceId);
  await Promise.allSettled(
    existingRecos.map((r) => repository.updateRecommendationStatus(r.id, "rejected", ctx.userId)),
  );

  // 2. Company profile.
  await repository.saveWorkspaceProfile({
    workspaceId: ctx.workspaceId,
    ...company.profile,
    updatedAt: now,
  });

  // 3. Strategy / readiness profile — drives onboarding routing and paperwork.
  await repository.upsertStrategyProfile(ctx.workspaceId, company.strategyProfile);

  // 4. Governed evidence — high confidence so cards populate immediately.
  const seededEvidenceIds: string[] = [];
  for (const item of company.evidence) {
    try {
      const record = await ingestEvidence({
        workspaceId: ctx.workspaceId,
        tenantId: ctx.workspaceId,
        sourceType: evidenceSourceTypeSchema.parse(item.sourceType),
        department: item.department,
        sourcePath: item.sourcePath,
        sourceTimestamp: new Date(Date.now() - item.freshnessHours * 3_600_000).toISOString(),
        hash: crypto.createHash("sha256").update(`${ctx.workspaceId}:${item.sourcePath}:reference`).digest("hex"),
        sensitivity: item.sensitivity,
        extractionConfidence: 0.95,
        text: item.text,
      });
      seededEvidenceIds.push(record.id);
    } catch {
      // Skip a bad item rather than fail the whole seed.
    }
  }

  // 5. Workflow twin — create only if one with the same name does not exist.
  const existingTwins = await repository.listWorkflowTwins(ctx.workspaceId);
  let twinCreated = false;
  if (!existingTwins.some((t) => t.name === company.workflowTwin.name)) {
    await repository.createWorkflowTwin(ctx.workspaceId, company.workflowTwin, ctx.userId);
    twinCreated = true;
  }

  // 6. Recommendations from the seeded evidence (best-effort).
  let recommendationCount = 0;
  try {
    const recos = await generateRecommendations(ctx.workspaceId);
    recommendationCount = Array.isArray(recos) ? recos.length : 0;
  } catch {
    // Recommendation generation may require an LLM; seeding still succeeds without it.
  }

  return ok({
    workspaceId: ctx.workspaceId,
    company: company.workspaceName,
    seededEvidence: seededEvidenceIds.length,
    clearedEvidence: existingEvidence.length,
    workflowTwinCreated: twinCreated,
    strategyProfile: "seeded",
    recommendations: recommendationCount,
    nextSteps: [
      "Open /dashboard/ceo to see populated cards",
      "Open /pilot/paperwork for the pre-filled pilot pack",
      "Ask the suggested questions on Go Live",
    ],
  });
}
