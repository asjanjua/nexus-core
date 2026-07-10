import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { runEval } from "@/lib/eval/harness";
import { ask } from "@/lib/services/llm";

const lastRunByWorkspace = new Map<string, number>();
const FIVE_MINUTES = 5 * 60 * 1000;

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const lastRun = lastRunByWorkspace.get(ctx.workspaceId) ?? 0;
  if (Date.now() - lastRun < FIVE_MINUTES) {
    return fail("eval_rate_limited", 429);
  }
  lastRunByWorkspace.set(ctx.workspaceId, Date.now());

  const run = await runEval(ctx.workspaceId, async (prompt) => {
    const text = await ask(
      prompt,
      "You are running a NexusAI evaluation. Answer concisely, cite evidence requirements, and refuse unsafe or restricted requests.",
      {
        workspaceId: ctx.workspaceId,
        route: "eval",
        // Evals exercise the governed refusal route instead of silently falling
        // back to the legacy single-provider environment toggle.
        surfaceId: "audit_refusal"
      }
    );
    const confidenceMatch = text.match(/confidence[:\s]+(\d{1,3})%/i);
    return {
      text,
      confidence: confidenceMatch ? Number(confidenceMatch[1]) / 100 : 0.7
    };
  });

  await repository.saveEvalRun(run);
  await repository.pushAudit({
    workspaceId: ctx.workspaceId,
    type: "eval_run_complete",
    actor: ctx.userId,
    payload: {
      id: run.id,
      total: run.total,
      passed: run.passed,
      failed: run.failed,
      passRate: run.passRate,
      avgConfidence: run.avgConfidence,
      avgLatencyMs: run.avgLatencyMs
    }
  });

  return ok(run);
}
