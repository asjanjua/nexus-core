import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";

const bodySchema = z.object({
  status: z.enum(["approved", "rejected"]),
  actor: z.string().default("operator")
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ recommendationId: string }> }
) {
  const { ctx, error } = await requireScope(request, "write:approvals");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);
  const { recommendationId } = await params;

  const updated = await repository.updateRecommendationStatusForWorkspace(
    ctx.workspaceId,
    recommendationId,
    parsed.data.status,
    parsed.data.actor || ctx.userId
  );

  if (!updated) return fail("recommendation_not_found", 404);
  return ok(updated);
}
