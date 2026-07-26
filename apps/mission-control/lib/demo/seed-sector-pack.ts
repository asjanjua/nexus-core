/**
 * Shared sector-pack seeding for controlled demo entry points.
 *
 * Callers are responsible for authorization. The general demo-reset endpoint
 * requires demo mode; a redeemed, single-use trial invite is the other allowed
 * entry point. Keeping the data mutation here prevents those paths drifting.
 */

import crypto from "crypto";
import { DEMO_PACKS, DEMO_PACK_SECTORS } from "@/lib/demo/sector-packs";
import { repository } from "@/lib/data/repository";
import { evidenceSourceTypeSchema } from "@/lib/contracts";
import { ingestEvidence } from "@/lib/services/ingestion";
import { generateRecommendations } from "@/lib/services/recommendations";

export type DemoPackSector = (typeof DEMO_PACK_SECTORS)[number];

export function isDemoPackSector(value: string): value is DemoPackSector {
  return DEMO_PACK_SECTORS.includes(value as DemoPackSector);
}

export type SeedSectorPackResult = {
  sector: DemoPackSector;
  workspaceName: string;
  demoSummary: string;
  suggestedQuestions: string[];
  evidenceSeeded: number;
};

export class DemoPackSeedRefusedError extends Error {
  constructor(message: "workspace_not_empty") {
    super(message);
    this.name = "DemoPackSeedRefusedError";
  }
}

/**
 * Replaces workspace evidence with a named sector pack. It intentionally does
 * not alter demoMode: trial recipients should be able to upload their own
 * documents immediately after reviewing the supplied sample material.
 */
export async function seedSectorPack(input: {
  workspaceId: string;
  actor: string;
  sector: DemoPackSector;
  /** Only the admin-only demo-reset endpoint may replace existing work. */
  replace?: boolean;
}): Promise<SeedSectorPackResult> {
  const pack = DEMO_PACKS[input.sector];
  const now = new Date().toISOString();

  const existingEvidence = await repository.getEvidenceForWorkspace(input.workspaceId);
  const existingRecommendations = await repository.getRecommendations(input.workspaceId);
  const existingProfile = await repository.getWorkspaceProfile(input.workspaceId);
  if (!input.replace && (existingEvidence.length > 0 || existingRecommendations.length > 0 || existingProfile)) {
    throw new DemoPackSeedRefusedError("workspace_not_empty");
  }

  await Promise.allSettled(existingEvidence.map((e) => repository.deleteEvidenceRecord(e.id, input.actor)));

  await Promise.allSettled(
    existingRecommendations.map((r) => repository.updateRecommendationStatus(r.id, "rejected", input.actor))
  );

  await repository.saveWorkspaceProfile({
    workspaceId: input.workspaceId,
    companyName: pack.workspaceName,
    sector: input.sector,
    subsector: null,
    businessModel: "b2b",
    companyStage: "growth",
    employeeBand: "51_200",
    region: "GCC",
    primaryGoals: ["revenue_growth", "operational_efficiency", "risk_management"],
    riskProfile: "moderate",
    priorityRoles: ["ceo", "coo", "cfo", "cto", "cro"],
    companyArchetype:
      input.sector === "technology_saas"
        ? "digital_native"
        : input.sector === "financial_services"
          ? "corporate"
          : "professional_practice",
    archetypeVersion: "1.0",
    briefLanguageMode: "formal",
    locationCount: 2,
    roleStates: {},
    updatedAt: now,
  });

  const seededIds: string[] = [];
  for (const item of pack.evidence) {
    try {
      const record = await ingestEvidence({
        workspaceId: input.workspaceId,
        tenantId: input.workspaceId,
        sourceType: evidenceSourceTypeSchema.parse(item.sourceType),
        department: item.department,
        sourcePath: item.sourcePath,
        sourceTimestamp: new Date(Date.now() - item.freshnessHours * 3_600_000).toISOString(),
        hash: crypto.createHash("sha256").update(`${input.workspaceId}:${item.sourcePath}:demo`).digest("hex"),
        sensitivity: item.sensitivity,
        extractionConfidence: 0.88,
        text: item.text,
      });
      seededIds.push(record.id);
    } catch {
      // A malformed sample must not undo a valid trial redemption.
    }
  }

  void generateRecommendations(input.workspaceId).catch(() => undefined);

  await repository.pushAudit({
    workspaceId: input.workspaceId,
    type: "demo.sector_pack_seeded",
    actor: input.actor,
    payload: { sector: input.sector, workspaceName: pack.workspaceName, evidenceSeeded: seededIds.length, seededAt: now },
  });

  return {
    sector: input.sector,
    workspaceName: pack.workspaceName,
    demoSummary: pack.demoSummary,
    suggestedQuestions: pack.suggestedQuestions,
    evidenceSeeded: seededIds.length,
  };
}
