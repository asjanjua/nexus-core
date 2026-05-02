import { ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:recommendations");
  if (error) return error;

  // Explicit query param overrides; falls back to workspace from auth token/session
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") ?? ctx.workspaceId;
  return ok(await repository.getRecommendations(workspaceId));
}
