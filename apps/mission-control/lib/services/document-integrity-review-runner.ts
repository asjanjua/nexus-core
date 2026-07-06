/**
 * Document Integrity Review — runtime runner
 *
 * Loads the workspace evidence pool (optionally passport-gated), runs the
 * integrity engine, and writes the started/completed audit events. Unlike the
 * grid runner it does not pre-filter to `processed` only: integrity review
 * exists precisely to inspect documents that have not yet cleared governance,
 * so ungoverned records are surfaced as findings rather than hidden.
 */

import type { AgentControlProfile } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import {
  documentIntegrityAuditEvents,
  reviewDocumentIntegrity,
  type DocumentIntegrityOptions,
  type DocumentIntegrityReviewResult,
} from "@/lib/agents/document-integrity-review";

export type RunDocumentIntegrityReviewInput = {
  workspaceId: string;
  reviewId: string;
  agentKey?: string;
  department?: string;
  options?: DocumentIntegrityOptions;
};

export type RunDocumentIntegrityReviewOutput = DocumentIntegrityReviewResult & {
  deniedByPassport: number;
};

export async function runDocumentIntegrityReview(
  input: RunDocumentIntegrityReviewInput
): Promise<RunDocumentIntegrityReviewOutput> {
  const all = await repository.getEvidenceForWorkspace(input.workspaceId);
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

  const result = reviewDocumentIntegrity({
    reviewId: input.reviewId,
    records: pool,
    options: input.options,
  });

  const actor = input.agentKey ?? "document_integrity_review";
  for (const event of documentIntegrityAuditEvents({ reviewId: input.reviewId, records: pool }, result)) {
    await repository.pushAudit({
      workspaceId: input.workspaceId,
      type: event.type,
      actor,
      payload: { ...event.payload, deniedByPassport },
    });
  }

  return { ...result, deniedByPassport };
}
