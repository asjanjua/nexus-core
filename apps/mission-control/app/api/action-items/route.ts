import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:workflows");
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "open" | "done" | "deferred" | "cancelled" | undefined ?? undefined;
  const actions = await repository.listActions(ctx.workspaceId, undefined, status);
  return ok({ actionItems: actions, total: actions.length });
}
