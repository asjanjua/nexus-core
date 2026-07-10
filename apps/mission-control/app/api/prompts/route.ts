import { ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { listPromptRegistry, syncPromptRegistry } from "@/lib/prompts/registry";

export async function GET(request: Request) {
  const { error } = await requireScope(request, "admin");
  if (error) return error;
  await syncPromptRegistry().catch(() => undefined);
  return ok({
    prompts: listPromptRegistry().map(({ template: _template, ...entry }) => entry)
  });
}
