import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const { id } = await params;
  const record = await repository.getEvidenceById(id);
  if (!record) return fail("not_found", 404);
  if (record.workspaceId !== ctx.workspaceId) return fail("forbidden", 403);
  return ok(record);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const { id } = await params;
  const record = await repository.getEvidenceById(id);
  if (!record) return fail("not_found", 404);
  if (record.workspaceId !== ctx.workspaceId) return fail("forbidden", 403);

  const deleted = await repository.deleteEvidenceRecord(id, ctx.userId);
  if (!deleted) return fail("delete_failed", 500);
  return ok({ id, deleted: true });
}
