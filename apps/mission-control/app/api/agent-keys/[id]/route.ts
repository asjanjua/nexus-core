/**
 * Agent key revocation
 * DELETE /api/agent-keys/:id
 */
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { id } = await params;
  const keys = await repository.listAgentKeys(ctx.workspaceId);
  if (!keys.some((key) => key.id === id)) return fail("key_not_found", 404);

  const revoked = await repository.revokeAgentKey(id);
  if (!revoked) return fail("key_not_found", 404);
  return ok({ id, revoked: true });
}
