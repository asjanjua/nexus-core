import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { importKnowledgeVault, MAX_IMPORT_ARCHIVE_BYTES } from "@/lib/services/knowledge";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "write:knowledge");
  if (error) return error;

  // Checked BEFORE formData(), which buffers the entire upload into memory.
  // The file.size check below still runs, but by then the bytes are already
  // resident, so the 413 it returns is honest to the caller and buys no
  // resource protection. A client can understate content-length, hence both.
  //
  // Neither is a substitute for a body-size limit at the edge (Render or the
  // reverse proxy) — that is the only place a lie about content-length is
  // caught before it costs anything. See docs/PR_REVIEW_2026-08-08.md §6.3.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMPORT_ARCHIVE_BYTES) {
    return fail("file_too_large", 413);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("file_required", 400);
  if (!file.name.toLowerCase().endsWith(".zip")) return fail("zip_required", 400);
  if (file.size > MAX_IMPORT_ARCHIVE_BYTES) return fail("file_too_large", 413);

  const result = await importKnowledgeVault(ctx.workspaceId, ctx.userId, Buffer.from(await file.arrayBuffer()));
  return ok(result, 201);
}
