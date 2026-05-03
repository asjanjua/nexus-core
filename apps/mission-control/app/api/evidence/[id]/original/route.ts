import { repository } from "@/lib/data/repository";
import { requireScope } from "@/lib/api-auth";
import { fail } from "@/lib/api";
import { fetchOriginalFile } from "@/lib/services/object-storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const { id } = await params;
  const record = await repository.getEvidenceById(id);
  if (!record) return fail("not_found", 404);
  if (record.workspaceId !== ctx.workspaceId) return fail("forbidden", 403);
  if (!record.sourceUri) return fail("original_not_available", 404);

  const file = await fetchOriginalFile(record.sourceUri);
  if (!file) return fail("original_not_available", 404);

  return new Response(file.body, {
    status: 200,
    headers: {
      "content-type": file.contentType,
      "content-disposition": `inline; filename="${file.fileName}"`,
      "cache-control": "private, max-age=60"
    }
  });
}
