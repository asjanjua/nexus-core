import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { getEntityMemory } from "@/lib/services/entity-memory";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const { id } = await params;
  const memory = await getEntityMemory(ctx.workspaceId, id);
  if (!memory) return fail("entity_not_found", 404);
  return ok(memory);
}
