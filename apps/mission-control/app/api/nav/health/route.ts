/**
 * GET /api/nav/health
 *
 * Backs the Nav Health Badges signature pattern (see nexus-design-system
 * skill) — quiet sidebar counts for the four states that genuinely need a
 * human to look: approvals pending, risks open, evidence below threshold,
 * workflows blocked. Every count here is a real, deterministic read from
 * existing records — none of it is estimated or invented.
 *
 *   approvalsPending — evidence rows still in pending_approval (same set the
 *                       /approvals queue shows).
 *   risksOpen        — high-severity risk radar entries (deterministic
 *                       extraction from evidence, no LLM call — see
 *                       lib/services/exports.ts#buildRiskRadar).
 *   evidenceBelowThreshold — evidence rows auto-quarantined for low
 *                       extraction confidence (<35%, per the approval
 *                       policy in app/approvals/page.tsx).
 *   workflowsBlocked  — distinct open decisions that have at least one open
 *                       blocker action.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildRiskRadar } from "@/lib/services/exports";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  try {
    const [evidence, decisions, actions, settings] = await Promise.all([
      repository.getEvidenceForWorkspace(ctx.workspaceId),
      repository.listDecisions(ctx.workspaceId, "open"),
      repository.listActions(ctx.workspaceId),
      repository.getWorkspaceSettings(ctx.workspaceId),
    ]);

    const approvalsPending = evidence.filter((e) => e.ingestionStatus === "pending_approval").length;
    const evidenceBelowThreshold = evidence.filter((e) => e.ingestionStatus === "quarantined").length;

    const blockedDecisionIds = new Set(
      actions.filter((a) => a.isBlocker && a.status === "open").map((a) => a.decisionId)
    );
    const workflowsBlocked = decisions.filter((d) => blockedDecisionIds.has(d.id)).length;

    const workspaceName = settings?.name ?? ctx.workspaceId;
    const radar = await buildRiskRadar(ctx.workspaceId, workspaceName);
    const risksOpen = radar.high.length;

    return ok({ approvalsPending, risksOpen, evidenceBelowThreshold, workflowsBlocked });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "nav_health_failed", 500);
  }
}
