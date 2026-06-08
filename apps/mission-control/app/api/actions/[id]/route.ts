import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

const patchSchema = z.object({
  status:     z.enum(["open", "done", "deferred", "cancelled"]).optional(),
  owner:      z.string().min(1).max(120).optional(),
  dueDate:    z.string().nullable().optional(),
  isBlocker:  z.boolean().optional()
});

// PATCH /api/actions/[id] — update status, owner, dueDate, isBlocker
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch { return fail("Invalid JSON", 400); }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.message, 400);

  const { id } = await params;
  const updated = await repository.updateAction(id, ctx.workspaceId, parsed.data, ctx.userId);
  if (!updated) return fail("Action not found", 404);
  return ok({ action: updated });
}
