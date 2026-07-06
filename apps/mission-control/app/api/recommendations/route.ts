import { ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:recommendations");
  if (error) return error;

  // Authz: always the caller's own workspace. A caller-supplied workspaceId
  // must never widen access to another workspace's recommendations.
  return ok(await repository.getRecommendations(ctx.workspaceId));
}
