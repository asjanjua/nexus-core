import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const shadowRoiRequestSchema = z.object({
  workflowName: z.string().min(1).max(200),
  manualMinutes: z.coerce.number().min(0).max(100000),
  nexusMinutes: z.coerce.number().min(0).max(100000),
  manualReworkCount: z.coerce.number().int().min(0).max(10000).default(0),
  nexusReworkCount: z.coerce.number().int().min(0).max(10000).default(0),
  runsPerMonth: z.coerce.number().min(1).max(10000).default(4),
  notes: z.string().max(1200).optional()
});

function existingMeasurements(config: Record<string, unknown>): Record<string, unknown>[] {
  const value = config.shadowMeasurements;
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object") : [];
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write:workflows");
  if (error) return error;

  const { id } = await params;
  const twin = await repository.getWorkflowTwin(ctx.workspaceId, id);
  if (!twin) return fail("workflow_twin_not_found", 404);

  const parsed = shadowRoiRequestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const minutesSavedPerRun = Math.max(0, parsed.data.manualMinutes - parsed.data.nexusMinutes);
  const speedGainPercent = parsed.data.manualMinutes > 0
    ? Math.round((minutesSavedPerRun / parsed.data.manualMinutes) * 100)
    : 0;
  const monthlyHoursSaved = Math.round(((minutesSavedPerRun * parsed.data.runsPerMonth) / 60) * 10) / 10;
  const reworkDelta = parsed.data.manualReworkCount - parsed.data.nexusReworkCount;

  const measurement = {
    id: `roi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workflowName: parsed.data.workflowName,
    manualMinutes: parsed.data.manualMinutes,
    nexusMinutes: parsed.data.nexusMinutes,
    manualReworkCount: parsed.data.manualReworkCount,
    nexusReworkCount: parsed.data.nexusReworkCount,
    runsPerMonth: parsed.data.runsPerMonth,
    minutesSavedPerRun,
    monthlyHoursSaved,
    speedGainPercent,
    reworkDelta,
    notes: parsed.data.notes ?? "",
    createdAt: new Date().toISOString(),
    createdBy: ctx.userId
  };

  const updated = await repository.updateWorkflowTwinConfig(
    ctx.workspaceId,
    id,
    {
      shadowMeasurements: [...existingMeasurements(twin.config), measurement],
      latestShadowRoi: measurement
    },
    ctx.userId
  );
  if (!updated) return fail("workflow_twin_not_found", 404);

  return ok({ twin: updated, measurement });
}
