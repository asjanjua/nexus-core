import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { synthesisScheduleInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { defaultScheduleForWorkspace } from "@/lib/services/synthesis-schedule";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:settings");
  if (error) return error;

  const settings = await repository.getWorkspaceSettings(ctx.workspaceId);
  const schedule =
    (await repository.getSynthesisSchedule(ctx.workspaceId)) ??
    defaultScheduleForWorkspace(ctx.workspaceId, settings.timezone);
  return ok(schedule);
}

export async function PUT(request: Request) {
  const { ctx, error } = await requireScope(request, "write:settings");
  if (error) return error;

  const parsed = synthesisScheduleInputSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "invalid_schedule", 400);

  const schedule = await repository.upsertSynthesisSchedule(ctx.workspaceId, parsed.data, ctx.userId);
  return ok(schedule);
}
