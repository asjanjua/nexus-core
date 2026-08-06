/**
 * GET /api/knowledge/synthesis
 *
 * Runs the Knowledge Workspace Synthesis native skill.
 * Generates a source-backed workspace brief from knowledge
 * notes, graph references, and evidence records.
 *
 * Not approval-gated (analyze family).
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { generateWorkspaceSynthesis } from "@/lib/services/knowledge-synthesis";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:knowledge");
  if (auth.error) return auth.error;

  try {
    const wsId = auth.ctx.workspaceId;

    // Fetch knowledge notes, graph references, and evidence count.
    const [notes, graphRefs, evidenceRecords] = await Promise.all([
      repository.listKnowledgeNotes(wsId),
      repository.listKnowledgeLinks(wsId).catch(() => []),
      repository.getEvidenceForWorkspace(wsId).catch(() => []),
    ]);

    // Build graph references in the format the synthesis engine expects.
    const graphRefsMapped = (graphRefs as Array<{
      sourceId?: string;
      targetId?: string;
      label?: string;
      type?: string;
    }>).map((g) => ({
      sourceId: g.sourceId ?? "",
      targetId: g.targetId ?? "",
      label: g.label ?? g.type ?? "references",
    }));

    const synthesis = generateWorkspaceSynthesis({
      workspaceId: wsId,
      notes: (notes ?? []) as Parameters<typeof generateWorkspaceSynthesis>[0]["notes"],
      graphRefs: graphRefsMapped,
      evidenceCount: (evidenceRecords as unknown[]).length,
    });

    return ok(synthesis);
  } catch (_err) {
    return fail("synthesis_failed", 500);
  }
}
