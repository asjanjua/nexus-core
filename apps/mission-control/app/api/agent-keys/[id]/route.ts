/**
 * Agent key revocation
 * DELETE /api/agent-keys/:id
 */
import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const revoked = await repository.revokeAgentKey(id);
  if (!revoked) return fail("key_not_found", 404);
  return ok({ id, revoked: true });
}
