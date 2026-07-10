/**
 * Pilot afterlife (migration 0036).
 *
 * GET  /api/pilot/afterlife  — the post-selection lifecycle view for the
 *      caller's workspace: run-loop summary, shadow-ROI summary, review-loop
 *      signal, and the current expand/hold/stop outcome record. Run cadence and
 *      ROI are derived from existing signals (workflow-twin runs + config
 *      shadowMeasurements); nothing is duplicated into the outcome table.
 * POST /api/pilot/afterlife  — record an expand/hold/stop decision (with note)
 *      for the selected workflow. Upserts one outcome record per workflow.
 *
 * Shadow-ROI capture itself stays on the existing
 * POST /api/workflow-twins/[id]/shadow-roi route — this surface just exposes the
 * twin id so the capture form can reach it.
 */

import { randomUUID } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

type Measurement = {
  monthlyHoursSaved?: number;
  speedGainPercent?: number;
  workflowName?: string;
  [k: string]: unknown;
};

function measurementsOf(config: Record<string, unknown> | null | undefined): Measurement[] {
  const value = config?.shadowMeasurements;
  return Array.isArray(value) ? (value.filter((m) => m && typeof m === "object") as Measurement[]) : [];
}

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const [strategy, twins, workspaceEvents, briefs] = await Promise.all([
    repository.getStrategyProfile(auth.workspaceId),
    repository.listWorkflowTwins(auth.workspaceId),
    repository.getAuditEvents(auth.workspaceId, 500),
    repository.listAgentOutputs({ workspaceId: auth.workspaceId, limit: 50 }),
  ]);

  const selectedWorkflow = strategy?.selectedWorkflow ?? null;
  const twin = selectedWorkflow ? twins.find((t) => t.name === selectedWorkflow) ?? null : null;

  const runs = twin ? await repository.listWorkflowTwinRuns(auth.workspaceId, twin.id) : [];
  const measurements = twins.flatMap((t) => measurementsOf(t.config as Record<string, unknown>));
  const monthlyHoursSaved = Math.round(
    measurements.reduce((sum, m) => sum + (typeof m.monthlyHoursSaved === "number" ? m.monthlyHoursSaved : 0), 0) * 10
  ) / 10;

  const approvalCount = workspaceEvents.filter((e) => e.type === "approval.decision").length;
  const outcome = selectedWorkflow
    ? await repository.getPilotOutcome(auth.workspaceId, selectedWorkflow)
    : null;

  return ok({
    selectedWorkflow,
    twinId: twin?.id ?? null,
    runLoop: {
      totalRuns: runs.length,
      lastRunAt: runs.length ? runs[0].runAt : null,
    },
    roi: {
      measurementCount: measurements.length,
      monthlyHoursSaved,
      latest: measurements.length ? measurements[measurements.length - 1] : null,
    },
    briefCount: briefs.length,
    approvalCount,
    outcome,
    generatedAt: new Date().toISOString(),
  });
}

const decisionSchema = z.object({
  status: z.enum(["running", "expand", "hold", "stop"]),
  note: z.string().max(1200).optional(),
});

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);

  const strategy = await repository.getStrategyProfile(auth.workspaceId);
  const selectedWorkflow = strategy?.selectedWorkflow;
  if (!selectedWorkflow) return fail("no_selected_workflow", 409);

  const outcome = await repository.recordPilotDecision({
    id: `po_${randomUUID()}`,
    workspaceId: auth.workspaceId,
    workflowName: selectedWorkflow,
    status: parsed.data.status,
    note: parsed.data.note ?? null,
    decidedBy: auth.userId,
  });

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "pilot_outcome.decided",
    actor: auth.userId,
    payload: { workflowName: selectedWorkflow, status: parsed.data.status },
  }).catch(() => {});

  return ok(outcome);
}
