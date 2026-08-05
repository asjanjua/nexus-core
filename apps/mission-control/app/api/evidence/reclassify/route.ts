/**
 * Refresh the cached document-type classification for a workspace.
 *
 * POST /api/evidence/reclassify
 *
 * Classification is computed at ingest and stored on the evidence row
 * (migration 0044). Two kinds of row miss out: anything ingested before that
 * migration, and anything classified by rules that have since changed — the
 * classifier stamps a fingerprint of its own pattern table, so adding a
 * document type to a requirement pack invalidates every cached answer.
 *
 * THIS ENDPOINT IS AN OPTIMISATION, NOT A REPAIR. Readers already detect a
 * missing or stale cache and classify live, so coverage is correct whether or
 * not this has ever been called. It only makes being correct cheap again. That
 * ordering is deliberate: a system whose accuracy depends on an operator
 * remembering to run a job will eventually be inaccurate.
 *
 * Batched, and reports whether more remains, because the work is linear in the
 * size of the data room and a single request should not sit on a connection
 * classifying twenty thousand documents.
 *
 * Not exposed in the UI. It is an operator action with no user-facing decision
 * attached, and inventing a button for it would imply the product needs
 * tending that it does not.
 */

import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { CLASSIFIER_VERSION } from "@/lib/domain/document-type-classifier";

const bodySchema = z.object({
  /** Kept modest by default: this is CPU-bound work on a request thread. */
  limit: z.number().int().min(1).max(2000).optional(),
});

export async function POST(request: Request) {
  // Write scope. It mutates stored rows, and the fact that the mutation is
  // regenerable does not make it a read.
  const { ctx, error } = await requireScope(request, "write");
  if (error) return error;

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("invalid_request", 400);

  const result = await repository.reclassifyStaleEvidence(ctx.workspaceId, parsed.data.limit ?? 500);
  // null means no database. Reported rather than dressed up as a successful
  // run of zero rows, which would read as "nothing to do".
  if (!result) return fail("database_unavailable", 503);

  await repository
    .pushAudit({
      workspaceId: ctx.workspaceId,
      type: "evidence.reclassified",
      actor: ctx.userId,
      payload: { ...result, classifierVersion: CLASSIFIER_VERSION },
    })
    .catch(() => {});

  return ok({ ...result, classifierVersion: CLASSIFIER_VERSION });
}
