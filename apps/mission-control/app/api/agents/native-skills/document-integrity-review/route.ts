/**
 * POST /api/agents/native-skills/document-integrity-review
 *
 * Executes the first-party document_integrity_review native skill: scores the
 * parse quality of the workspace's evidence records and returns per-document
 * findings, a parse-quality score, missing source spans, and repair
 * recommendations. Unlike the grid executor, integrity review is a diagnostic
 * and deliberately inspects evidence that has not yet cleared governance, so
 * the runner does not pre-filter to `processed`. Gated on read:evidence; it
 * reads evidence and writes started/completed audit events only.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { runDocumentIntegrityReview } from "@/lib/services/document-integrity-review-runner";

const requestSchema = z.object({
  reviewId: z.string().min(1).max(80),
  agentKey: z.string().min(1).max(120).optional(),
  department: z.string().min(1).max(120).optional(),
  options: z
    .object({
      confidenceThreshold: z.number().min(0).max(1).optional(),
      freshnessMaxHours: z.number().int().nonnegative().optional(),
      minTextLength: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  // Tenant is always the authenticated workspace; the body never carries it.
  const { ctx, error } = await requireScope(request, "read:evidence");
  if (error) return error;

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const result = await runDocumentIntegrityReview({
    workspaceId: ctx.workspaceId,
    reviewId: parsed.data.reviewId,
    agentKey: parsed.data.agentKey,
    department: parsed.data.department,
    options: parsed.data.options,
  });

  return ok(result);
}
