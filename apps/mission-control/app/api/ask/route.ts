import { fail, ok } from "@/lib/api";
import { askRequestSchema } from "@/lib/contracts";
import { store } from "@/lib/data/store";
import { answerWithEvidence } from "@/lib/services/retrieval";
import { requireScope } from "@/lib/api-auth";

export async function POST(request: Request) {
  const { error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = askRequestSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const { workspaceId, userId, query } = parsed.data;
  store.appendConversation(workspaceId, userId, "user", query);
  const response = await answerWithEvidence(query, workspaceId);
  store.appendConversation(workspaceId, userId, "assistant", response.answer);

  return ok(response);
}

