import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { learningSignalInputSchema } from "@/lib/contracts";

// POST /api/learning-signals — submit a feedback signal on an agent output
export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = learningSignalInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.message, 400);
  }

  const signal = await repository.saveLearnningSignal(
    ctx.workspaceId,
    parsed.data,
    ctx.userId
  );

  return ok({ signal });
}

// GET /api/learning-signals — list signals for this workspace
export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read");
  if (error) return error;

  const url = new URL(request.url);
  const agentId    = url.searchParams.get("agentId")    ?? undefined;
  const outputId   = url.searchParams.get("outputId")   ?? undefined;
  const signalType = url.searchParams.get("signalType") ?? undefined;
  const days       = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? "30")));
  const limit      = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "100")));
  const since      = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const signals = await repository.listLearningSignals({
    workspaceId: ctx.workspaceId,
    agentId,
    outputId,
    signalType,
    since,
    limit
  });

  return ok({ signals, total: signals.length });
}
