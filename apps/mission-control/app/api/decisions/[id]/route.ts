import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { decisionInputSchema } from "@/lib/contracts";

// PATCH /api/decisions/[id] — update status, owner, deadline, priority, rationale
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch { return fail("Invalid JSON", 400); }

  const parsed = decisionInputSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.message, 400);

  const { id } = await params;
  const updated = await repository.updateDecision(id, ctx.workspaceId, parsed.data, ctx.userId);
  if (!updated) return fail("Decision not found", 404);
  return ok({ decision: updated });
}
