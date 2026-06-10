import { synthesiseForRole } from "@/lib/services/synthesis";
import { fail, ok } from "@/lib/api";
import { roleSchema } from "@/lib/contracts";
import { requireScope } from "@/lib/api-auth";

export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const { role } = await params;
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return fail("invalid_role", 400);

  const url = new URL(request.url);
  const department = url.searchParams.get("department") ?? undefined;

  const synthesis = await synthesiseForRole(parsed.data, ctx.workspaceId, { department });
  return ok(synthesis);
}
