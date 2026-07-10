/**
 * GET /api/funnel — operator view over the acquisition funnel and the caller's
 * pilot lifecycle. Reads only signals that already exist (audit stream,
 * strategy profile, evidence, agent outputs, workflow twins) — no new
 * instrumentation. Workspace-scoped for the pilot stages; the acquisition
 * counts come from the shared `public-readiness` audit stream.
 *
 * Access (decision 2026-07-09): NEXUS_FUNNEL_VISIBILITY policy —
 *   "admin" (default): operator-only page (403 funnel_operator_only otherwise).
 *   "workspace": any authenticated user gets pilot stages; the cross-tenant
 *   acquisition section is operator-only in BOTH modes.
 * Operators are Clerk user ids in NEXUS_OPERATOR_USER_IDS (comma-separated).
 * requireScope cannot express this: Clerk session users carry wildcard scope.
 */

import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import {
  deriveAcquisitionFunnel,
  derivePilotStages,
  isOperatorUser,
  resolveFunnelAccess,
  resolveFunnelVisibility,
} from "@/lib/services/funnel";

function countShadowMeasurements(config: Record<string, unknown> | null | undefined): number {
  const value = config?.shadowMeasurements;
  return Array.isArray(value) ? value.length : 0;
}

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const visibility = resolveFunnelVisibility(process.env.NEXUS_FUNNEL_VISIBILITY);
  const operator = isOperatorUser(auth.userId, process.env.NEXUS_OPERATOR_USER_IDS);
  const access = resolveFunnelAccess(visibility, operator);
  if (!access.pageAllowed) return fail("funnel_operator_only", 403);

  const [publicEvents, strategy, evidence, briefs, workspaceEvents, twins] = await Promise.all([
    access.acquisitionAllowed
      ? repository.getAuditEvents("public-readiness", 1000)
      : Promise.resolve([]),
    repository.getStrategyProfile(auth.workspaceId),
    repository.getEvidenceForWorkspace(auth.workspaceId),
    repository.listAgentOutputs({ workspaceId: auth.workspaceId, limit: 50 }),
    repository.getAuditEvents(auth.workspaceId, 500),
    repository.listWorkflowTwins(auth.workspaceId),
  ]);

  const approvalCount = workspaceEvents.filter((e) => e.type === "approval.decision").length;
  const roiMeasurementCount = twins.reduce(
    (sum, twin) => sum + countShadowMeasurements(twin.config as Record<string, unknown>),
    0
  );

  const acquisition = access.acquisitionAllowed ? deriveAcquisitionFunnel(publicEvents) : null;
  const pilotStages = derivePilotStages({
    selectedWorkflow: strategy?.selectedWorkflow ?? null,
    evidenceCount: evidence.length,
    briefCount: briefs.length,
    approvalCount,
    roiMeasurementCount,
  });

  return ok({ acquisition, pilotStages, visibility, operator, generatedAt: new Date().toISOString() });
}
