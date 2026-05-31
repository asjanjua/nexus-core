import { fail, ok } from "@/lib/api";
import { askRequestSchema } from "@/lib/contracts";
import { store } from "@/lib/data/store";
import { answerWithEvidence } from "@/lib/services/retrieval";
import { requireScope } from "@/lib/api-auth";

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
  const { query, department } = parsed.data;

  store.appendConversation(workspaceId, userId, "user", query);
  const response = await answerWithEvidence(query, workspaceId, { department });
  store.appendConversation(workspaceId, userId, "assistant", response.answer);

  return ok(response);
}
