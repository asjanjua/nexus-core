/**
 * Vantage Diligence Analysis — runtime runner
 *
 * Loads the deal workspace's evidence pool (optionally passport-gated and
 * department-scoped to the deal), runs the diligence engine, and writes the
 * started/completed audit events. Like the grid runner it applies the agent
 * passport gate before analysis so cross-entity data never leaks into a deal.
 */

import type { AgentControlProfile, EvidenceRecord } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import {
  analyzeVantageDiligence,
  vantageDiligenceAuditEvents,
  type VantageDiligenceOptions,
  type VantageDiligenceResult,
} from "@/lib/agents/vantage-diligence-analysis";
import type { DealType } from "@/lib/domain/dd-checklist-library";

export type RunVantageDiligenceInput = {
  workspaceId: string;
  reviewId: string;
  dealType: DealType;
  agentKey?: string;
  department?: string;
  options?: VantageDiligenceOptions;
};

export type RunVantageDiligenceOutput = VantageDiligenceResult & {
  deniedByPassport: number;
};

export async function runVantageDiligenceAnalysis(
  input: RunVantageDiligenceInput
): Promise<RunVantageDiligenceOutput> {
  const all: EvidenceRecord[] = await repository.getEvidenceForWorkspace(input.workspaceId);
  let pool = input.department
    ? all.filter((record) => record.department === input.department)
    : all;

  let deniedByPassport = 0;
  if (input.agentKey) {
    const passport: AgentControlProfile | null =
      await repository.getActiveAgentControlProfile(input.workspaceId, input.agentKey);
    if (!passport) {
      deniedByPassport = pool.length;
      pool = [];
    } else {
      const governed = filterEvidenceByPassport(pool, passport);
      pool = governed.allowed;
      deniedByPassport = governed.denied.length;
    }
  }

  const result = analyzeVantageDiligence({
    reviewId: input.reviewId,
    dealType: input.dealType,
    records: pool,
    options: input.options,
  });

  const actor = input.agentKey ?? "vantage_diligence_analysis";
  for (const event of vantageDiligenceAuditEvents(
    { reviewId: input.reviewId, dealType: input.dealType, records: pool },
    result
  )) {
    await repository.pushAudit({
      workspaceId: input.workspaceId,
      type: event.type,
      actor,
      payload: { ...event.payload, deniedByPassport },
    });
  }

  return { ...result, deniedByPassport };
}
