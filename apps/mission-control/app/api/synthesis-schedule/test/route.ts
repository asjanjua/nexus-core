import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { runSynthesisScheduleNow } from "@/lib/services/synthesis-schedule";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:settings");
  if (error) return error;

  const result = await runSynthesisScheduleNow(ctx.workspaceId, ctx.userId);
  return ok(result, 201);
}
