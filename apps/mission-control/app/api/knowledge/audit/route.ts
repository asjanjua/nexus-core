/**
 * GET /api/knowledge/audit — run the structural knowledge audit for the
 * current workspace. Returns duplicates, contradictions, and stale items.
 *
 * Read-only. No mutations. No LLM calls.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { auditKnowledgeWorkspace } from "@/lib/knowledge-audit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireScope(request, "read:settings");
  if (auth.error) return auth.error;

  try {
    const notes = await repository.listKnowledgeNotes(auth.ctx.workspaceId, { limit: 500 });
    const report = auditKnowledgeWorkspace(auth.ctx.workspaceId, notes);
    return ok(report);
  } catch (_err) {
    // Internal details are intentionally not exposed — the audit engine
    // is read-only and should not fail under normal conditions. A 500 here
    // means the notes query or the engine itself threw unexpectedly.
    return fail("audit_failed", 500);
  }
}
