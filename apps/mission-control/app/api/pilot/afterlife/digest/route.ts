/**
 * POST /api/pilot/afterlife/digest — email the current pilot digest to the
 * sponsor named on the strategy profile. On-demand (a button on the afterlife
 * page); a scheduled weekly send can wrap this later. Figures are read from the
 * same governed signals the afterlife view uses.
 */

import { fail, ok } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { buildPilotDigestEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";

function measurementCount(config: Record<string, unknown> | null | undefined): number {
  const v = config?.shadowMeasurements;
  return Array.isArray(v) ? v.length : 0;
}
function monthlyHours(config: Record<string, unknown> | null | undefined): number {
  const v = config?.shadowMeasurements;
  if (!Array.isArray(v)) return 0;
  return v.reduce((s: number, m) => s + (m && typeof m === "object" && typeof (m as { monthlyHoursSaved?: number }).monthlyHoursSaved === "number" ? (m as { monthlyHoursSaved: number }).monthlyHoursSaved : 0), 0);
}

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  if (!resendConfigured()) return fail("email_not_configured", 409);

  const [strategy, twins, events, briefs] = await Promise.all([
    repository.getStrategyProfile(auth.workspaceId),
    repository.listWorkflowTwins(auth.workspaceId),
    repository.getAuditEvents(auth.workspaceId, 500),
    repository.listAgentOutputs({ workspaceId: auth.workspaceId, limit: 50 }),
  ]);

  const selectedWorkflow = strategy?.selectedWorkflow;
  if (!selectedWorkflow) return fail("no_selected_workflow", 409);

  const sponsorEmail = strategy?.sponsorEmail?.trim();
  if (!sponsorEmail) return fail("no_sponsor_email", 409);

  const twin = twins.find((t) => t.name === selectedWorkflow) ?? null;
  const runs = twin ? await repository.listWorkflowTwinRuns(auth.workspaceId, twin.id) : [];
  const outcome = await repository.getPilotOutcome(auth.workspaceId, selectedWorkflow);
  const workspace = await repository.getWorkspaceSettings(auth.workspaceId).catch(() => null);

  const roiMeasurementCount = twins.reduce((s, t) => s + measurementCount(t.config as Record<string, unknown>), 0);
  const monthlyHoursSaved = Math.round(twins.reduce((s, t) => s + monthlyHours(t.config as Record<string, unknown>), 0) * 10) / 10;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") || new URL(request.url).origin;

  await sendEmail({
    to: sponsorEmail,
    subject: `Pilot digest — ${workspace?.name ?? "your workspace"}: ${selectedWorkflow}`,
    html: buildPilotDigestEmailHtml({
      workspaceName: workspace?.name ?? auth.workspaceId,
      workflowName: selectedWorkflow,
      totalRuns: runs.length,
      briefCount: briefs.length,
      approvalCount: events.filter((e) => e.type === "approval.decision").length,
      monthlyHoursSaved,
      roiMeasurementCount,
      outcomeStatus: outcome?.status ?? "none",
      appUrl: `${appUrl}/pilot/afterlife`,
    }),
  });

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "pilot_digest.sent",
    actor: auth.userId,
    payload: { workflowName: selectedWorkflow, to: sponsorEmail },
  }).catch(() => {});

  return ok({ sentTo: sponsorEmail });
}
