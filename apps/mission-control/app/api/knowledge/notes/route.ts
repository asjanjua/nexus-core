import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { knowledgeNoteInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { parseKnowledgeFilterParams } from "@/lib/knowledge/filter-params";
import { newKnowledgeNoteTemplate } from "@/lib/services/knowledge";
import { writeNoteToVault } from "@/lib/services/vault-sync";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? "100")));
  const filters = parseKnowledgeFilterParams(url.searchParams);
  const notes = await repository.listKnowledgeNotes(ctx.workspaceId, { query, limit, ...filters });
  return ok({ notes, total: notes.length });
}

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = knowledgeNoteInputSchema.safeParse(body ?? newKnowledgeNoteTemplate("Untitled"));
  if (!parsed.success) return fail(parsed.error.message, 400);

  const note = await repository.upsertKnowledgeNote(ctx.workspaceId, parsed.data, ctx.userId);
  await writeNoteToVault(note);
  return ok({ note }, 201);
}
