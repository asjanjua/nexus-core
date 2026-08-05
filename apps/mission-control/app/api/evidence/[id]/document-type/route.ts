/**
 * Reviewer override for a document's type.
 *
 * PUT    /api/evidence/[id]/document-type   set the types a human confirmed
 * DELETE /api/evidence/[id]/document-type   fall back to the classifier
 *
 * Coverage infers a document's type from its filename, or from its text when
 * the filename is uninformative. On a real data room that is often wrong or
 * silent: a scanned PDF has no usable text, and "Project Falcon - Annex 4.pdf"
 * could be anything. Without this, a reviewer who can see the mistake has no
 * way to fix it.
 *
 * AN EMPTY ARRAY IS A VALID ANSWER and is not the same as deleting the
 * override. Empty means "a human opened this and it supports nothing", which
 * closes the question. Deleting means "go back to guessing". Conflating them
 * would make a reviewer's negative finding indistinguishable from never having
 * looked, and coverage would quietly resume counting a document the reviewer
 * had already rejected.
 *
 * Writes are audited. A human overruling the machine on a provenance product
 * is exactly the event the trail exists for.
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { knownDocumentTypes } from "@/lib/domain/document-type-classifier";

const bodySchema = z.object({
  /**
   * Complete replacement, not an addition. A reviewer's main job here is to
   * REMOVE a wrong type, which an additive model cannot express.
   */
  types: z.array(z.string().min(1).max(80)).max(20),
  /** Optional, e.g. "scanned, confirmed by opening it". */
  note: z.string().max(500).nullable().optional(),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const { id } = await context.params;
  if (!id) return fail("missing_evidence_id", 400);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("invalid_request", 400);

  // Only types the classifier vocabulary knows. A free-text type would never
  // match a requirement tag, so it would look accepted and do nothing — the
  // most frustrating possible outcome for someone correcting a mistake.
  const known = new Set(knownDocumentTypes());
  const unknown = parsed.data.types.filter((t) => !known.has(t));
  if (unknown.length > 0) {
    return fail(`unknown_document_type: ${unknown.join(", ")}`, 422);
  }

  // Scoped read first: an evidence id from another tenant must not be
  // writable even if it is guessed.
  const evidence = await repository.getEvidenceForWorkspace(ctx.workspaceId).catch(() => []);
  if (!evidence.some((record) => record.id === id)) {
    return fail("evidence_not_found", 404);
  }

  const saved = await repository.setEvidenceTypeOverride({
    workspaceId: ctx.workspaceId,
    evidenceId: id,
    types: parsed.data.types,
    setBy: ctx.userId,
    note: parsed.data.note ?? null,
  });
  if (!saved) return fail("override_not_saved", 503);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: "evidence.document_type_overridden",
      actor: ctx.userId,
      payload: {
        evidenceId: id,
        types: parsed.data.types,
        // Recorded because "a reviewer says this supports nothing" is a
        // finding, and the trail should show it was a decision.
        clearedAllTypes: parsed.data.types.length === 0,
        note: parsed.data.note ?? null,
      },
    })
    .catch(() => {});

  return ok({
    evidenceId: id,
    types: parsed.data.types,
    source: "reviewer",
    setBy: ctx.userId,
  });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const { id } = await context.params;
  if (!id) return fail("missing_evidence_id", 400);

  const cleared = await repository.clearEvidenceTypeOverride(ctx.workspaceId, id);
  if (!cleared) return fail("override_not_found", 404);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: "evidence.document_type_override_cleared",
      actor: ctx.userId,
      payload: { evidenceId: id },
    })
    .catch(() => {});

  return ok({ evidenceId: id, source: "classifier" });
}
