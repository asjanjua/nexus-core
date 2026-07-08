/**
 * GET /api/funnel — operator view over the acquisition funnel and the caller's
 * pilot lifecycle. Reads only signals that already exist (audit stream,
 * strategy profile, evidence, agent outputs, workflow twins) — no new
 * instrumentation. Workspace-scoped for the pilot stages; the acquisition
 * counts come from the shared `public-readiness` audit stream.
 */

import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { deriveAcquisitionFunnel, derivePilotStages } from "@/lib/services/funnel";

function countShadowMeasurements(config: Record<string, unknown> | null | undefined): number {
  const value = config?.shadowMeasurements;
  return Array.isArray(value) ? value.length : 0;
}

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const [publicEvents, strategy, evidence, briefs, workspaceEvents, twins] = await Promise.all([
    repository.getAuditEvents("public-readiness", 1000),
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

  const acquisition = deriveAcquisitionFunnel(publicEvents);
  const pilotStages = derivePilotStages({
    selectedWorkflow: strategy?.selectedWorkflow ?? null,
    evidenceCount: evidence.length,
    briefCount: briefs.length,
    approvalCount,
    roiMeasurementCount,
  });

  return ok({ acquisition, pilotStages, generatedAt: new Date().toISOString() });
}
