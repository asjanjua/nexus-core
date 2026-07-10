/**
 * Quorum Governance Review — runtime runner
 *
 * Loads the board workspace's evidence pool (optionally passport-gated and
 * department-scoped), plus its decisions and actions, runs the governance
 * engine, and writes the started/completed audit events.
 */

import type { AgentControlProfile, EvidenceRecord } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { filterEvidenceByPassport } from "@/lib/agents/passport-policy";
import {
  quorumGovernanceAuditEvents,
  reviewQuorumGovernance,
  type QuorumGovernanceOptions,
  type QuorumGovernanceResult,
} from "@/lib/agents/quorum-governance-review";

export type RunQuorumGovernanceInput = {
  workspaceId: string;
  reviewId: string;
  agentKey?: string;
  department?: string;
  now?: string;
  options?: QuorumGovernanceOptions;
};

export type RunQuorumGovernanceOutput = QuorumGovernanceResult & {
  deniedByPassport: number;
};

export async function runQuorumGovernanceReview(
  input: RunQuorumGovernanceInput
): Promise<RunQuorumGovernanceOutput> {
  const now = input.now ?? new Date().toISOString();
  const [all, decisions, actions] = await Promise.all([
    repository.getEvidenceForWorkspace(input.workspaceId),
    repository.listDecisions(input.workspaceId),
    repository.listActions(input.workspaceId),
  ]);

  let pool: EvidenceRecord[] = input.department
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

  const result = reviewQuorumGovernance({
    reviewId: input.reviewId,
    records: pool,
    decisions,
    actions,
    now,
    options: input.options,
  });

  const actor = input.agentKey ?? "quorum_governance_review";
  for (const event of quorumGovernanceAuditEvents({ reviewId: input.reviewId, records: pool, decisions, actions }, result)) {
    await repository.pushAudit({
      workspaceId: input.workspaceId,
      type: event.type,
      actor,
      payload: { ...event.payload, deniedByPassport },
    });
  }

  return { ...result, deniedByPassport };
}
