import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { knowledgeNoteInputSchema } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";
import { writeNoteToVault } from "@/lib/services/vault-sync";
import { generateEmbedding } from "@/lib/services/embeddings";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const { id } = await params;
  const note = await repository.getKnowledgeNote(ctx.workspaceId, id);
  if (!note) return fail("knowledge_note_not_found", 404);
  const links = await repository.listKnowledgeLinks(ctx.workspaceId, id);
  return ok({ note, links });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  const { id } = await params;
  const existing = await repository.getKnowledgeNote(ctx.workspaceId, id);
  if (!existing) return fail("knowledge_note_not_found", 404);
  const body = await request.json().catch(() => null);
  const parsed = knowledgeNoteInputSchema.partial().safeParse(body);
  if (!parsed.success) return fail(parsed.error.message, 400);

  const note = await repository.upsertKnowledgeNote(
    ctx.workspaceId,
    {
      title: parsed.data.title ?? existing.title,
      path: parsed.data.path ?? existing.path,
      body: parsed.data.body ?? existing.body,
      tags: parsed.data.tags ?? existing.tags,
      sensitivity: parsed.data.sensitivity ?? existing.sensitivity,
      status: parsed.data.status ?? existing.status,
      sourceKind: parsed.data.sourceKind ?? existing.sourceKind,
      frontmatter: parsed.data.frontmatter ?? existing.frontmatter,
      evidenceRefs: parsed.data.evidenceRefs ?? existing.evidenceRefs,
      entityRefs: parsed.data.entityRefs ?? existing.entityRefs,
      workflowRefs: parsed.data.workflowRefs ?? existing.workflowRefs,
      decisionRefs: parsed.data.decisionRefs ?? existing.decisionRefs,
      recommendationRefs: parsed.data.recommendationRefs ?? existing.recommendationRefs
    },
    ctx.userId,
    id
  );
  await writeNoteToVault(note);
  // Fire-and-forget embedding generation for semantic search
  void generateEmbedding(`${note.title}\n\n${note.body}`).then((embedding) => {
    if (embedding) {
      void repository.storeKnowledgeEmbedding(note.id, embedding);
    }
  });
  return ok({ note });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  const { id } = await params;
  const deleted = await repository.deleteKnowledgeNote(ctx.workspaceId, id, ctx.userId);
  if (!deleted) return fail("knowledge_note_not_found", 404);
  return ok({ deleted: true });
}
