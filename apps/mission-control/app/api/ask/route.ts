import { fail, ok } from "@/lib/api";
import { askRequestSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { answerWithEvidence } from "@/lib/services/retrieval";
import { requireScope } from "@/lib/api-auth";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));
  const messages = await repository.getConversation(ctx.workspaceId, ctx.userId, limit);
  return ok({ messages, total: messages.length });
}

export async function POST(request: Request) {
  // Always derive workspaceId from the authenticated session so the query
  // runs against the correct tenant — never trust the body's workspaceId.
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = askRequestSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const workspaceId = ctx.workspaceId;
  const userId = ctx.userId;
  const { query, department, agentKey } = parsed.data;

  const history = await repository.getConversation(workspaceId, userId, 8);
  await repository.appendConversation(workspaceId, userId, "user", query);
  const response = await answerWithEvidence(query, workspaceId, {
    department,
    agentKey,
    conversationHistory: history
  });
  await repository.appendConversation(workspaceId, userId, "assistant", response.answer);

  return ok(response);
}

export async function DELETE(request: Request) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  await repository.clearConversation(ctx.workspaceId, ctx.userId);
  return ok({ cleared: true });
}
