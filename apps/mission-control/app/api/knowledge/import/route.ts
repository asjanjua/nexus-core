import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { importKnowledgeVault } from "@/lib/services/knowledge";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("file_required", 400);
  if (!file.name.toLowerCase().endsWith(".zip")) return fail("zip_required", 400);

  const result = await importKnowledgeVault(ctx.workspaceId, ctx.userId, Buffer.from(await file.arrayBuffer()));
  return ok(result, 201);
}
