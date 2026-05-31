import { cardsForRole } from "@/lib/services/dashboard";
import { fail, ok } from "@/lib/api";
import { KNOWN_ROLES, roleSchema } from "@/lib/contracts";
import { requireScope } from "@/lib/api-auth";

export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { ctx, error } = await requireScope(request, "read:dashboard");
  if (error) return error;

  const { role } = await params;
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return fail("invalid_role", 400);
  const normalizedRole = parsed.data;
  return ok({
    role: normalizedRole,
    knownRole: KNOWN_ROLES.has(normalizedRole),
    workspaceId: ctx.workspaceId,
    cards: await cardsForRole(normalizedRole, ctx.workspaceId)
  });
}
