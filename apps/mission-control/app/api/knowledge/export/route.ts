import { requireScope } from "@/lib/api-auth";
import { exportKnowledgeVault } from "@/lib/services/knowledge";

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "read:knowledge");
  if (error) return error;

  const buffer = await exportKnowledgeVault(ctx.workspaceId);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="nexus-vault-${ctx.workspaceId}.zip"`
    }
  });
}
