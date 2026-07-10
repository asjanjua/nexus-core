/**
 * Evidence Grid Review — runtime runner
 *
 * Bridges the pure engine (lib/agents/evidence-grid-review) to the workspace:
 * it loads the governed evidence pool, applies an optional agent passport gate
 * exactly like Ask retrieval does, runs the review, and writes the
 * started/completed audit events for the approval-gated native skill.
 */

import type { AgentControlProfile } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import {
  evidenceGridReviewAuditEvents,
  reviewEvidenceGrid,
  type EvidenceGridDimension,
  type EvidenceGridReviewOptions,
  type EvidenceGridReviewResult,
} from "@/lib/agents/evidence-grid-review";

export type RunEvidenceGridReviewInput = {
  workspaceId: string;
  reviewId: string;
  dimensions: EvidenceGridDimension[];
  /** When set, evidence is filtered through the agent's passport first. */
  agentKey?: string;
  department?: string;
  now?: string;
  options?: EvidenceGridReviewOptions;
};

export type RunEvidenceGridReviewOutput = EvidenceGridReviewResult & {
  deniedByPassport: number;
};

export async function runEvidenceGridReview(
  input: RunEvidenceGridReviewInput
): Promise<RunEvidenceGridReviewOutput> {
  const now = input.now ?? new Date().toISOString();
  const all = await repository.getEvidenceForWorkspace(input.workspaceId);

  // Governed pool: cleared for citation and (optionally) scoped to a department.
  let pool = all.filter(
    (record) =>
      record.ingestionStatus === "processed" &&
      (!input.department || record.department === input.department)
  );

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

  const result = reviewEvidenceGrid({
    reviewId: input.reviewId,
    dimensions: input.dimensions,
    records: pool,
    now,
    options: input.options,
  });

  const auditEvents = evidenceGridReviewAuditEvents(
    { reviewId: input.reviewId, dimensions: input.dimensions, records: pool },
    result
  );
  const actor = input.agentKey ?? "evidence_grid_review";
  for (const event of auditEvents) {
    await repository.pushAudit({
      workspaceId: input.workspaceId,
      type: event.type,
      actor,
      payload: { ...event.payload, deniedByPassport },
    });
  }

  return { ...result, deniedByPassport };
}
