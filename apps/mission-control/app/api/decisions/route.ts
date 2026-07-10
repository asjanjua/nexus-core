import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { decisionInputSchema } from "@/lib/contracts";

// GET /api/decisions — list decisions for this workspace
export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as "open" | "decided" | "superseded" | undefined ?? undefined;

  const items = await repository.listDecisions(ctx.workspaceId, status);
  return ok({ decisions: items, total: items.length });
}

// POST /api/decisions — create a new decision
export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  let body: unknown;
  try { body = await request.json(); } catch { return fail("Invalid JSON", 400); }

  const parsed = decisionInputSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.message, 400);

  const decision = await repository.createDecision(ctx.workspaceId, parsed.data, ctx.userId);
  return ok({ decision }, 201);
}
