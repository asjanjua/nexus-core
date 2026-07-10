import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { proposeDecisionsFromAgentOutputs } from "@/lib/services/decision-extraction";

const requestSchema = z.object({
  agentId: z.string().min(1).max(120).optional(),
  days: z.number().int().min(1).max(30).optional(),
  limit: z.number().int().min(1).max(25).optional()
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = requestSchema.safeParse(body ?? {});
  if (!parsed.success) return fail("invalid_request", 400);

  const proposals = await proposeDecisionsFromAgentOutputs({
    workspaceId: ctx.workspaceId,
    ...parsed.data
  });

  return ok({ proposals, total: proposals.length });
}
