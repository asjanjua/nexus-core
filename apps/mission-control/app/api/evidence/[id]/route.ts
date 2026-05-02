import { fail, ok } from "@/lib/api";
import { repository } from "@/lib/data/repository";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = await repository.getEvidenceById(id);
  if (!record) return fail("not_found", 404);
  return ok(record);
}
