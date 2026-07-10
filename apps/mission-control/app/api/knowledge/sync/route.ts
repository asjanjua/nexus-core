import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { startVaultWatcher, syncVaultNow, vaultStatus } from "@/lib/services/vault-sync";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  return ok(await vaultStatus(ctx.workspaceId));
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  if (body?.watch === true) return ok(await startVaultWatcher(ctx.workspaceId, ctx.userId));
  return ok(await syncVaultNow(ctx.workspaceId, ctx.userId));
}
