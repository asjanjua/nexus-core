/**
 * POST /api/agents/native-skills/evidence-grid-review
 *
 * Executes the first-party evidence_grid_review native skill: runs a reviewer
 * spec against the workspace's governed evidence pool and returns the cited
 * grid, issue flags, missing-evidence notes, and reviewer escalations. Reads
 * evidence and writes started/completed audit events; it never writes to any
 * source system, so it is gated on read:evidence like Ask.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { runEvidenceGridReview } from "@/lib/services/evidence-grid-review-runner";

const dimensionSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  requirement: z.string().min(1).max(400),
  keywords: z.array(z.string().min(1).max(80)).min(1).max(20),
  required: z.boolean().default(true),
});

const requestSchema = z.object({
  reviewId: z.string().min(1).max(80),
  dimensions: z.array(dimensionSchema).min(1).max(40),
  agentKey: z.string().min(1).max(120).optional(),
  department: z.string().min(1).max(120).optional(),
  options: z
    .object({
      confidenceThreshold: z.number().min(0).max(1).optional(),
      freshnessMaxHours: z.number().int().nonnegative().optional(),
      maxCitationsPerDimension: z.number().int().min(1).max(10).optional(),
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

  const result = await runEvidenceGridReview({
    workspaceId: ctx.workspaceId,
    reviewId: parsed.data.reviewId,
    dimensions: parsed.data.dimensions,
    agentKey: parsed.data.agentKey,
    department: parsed.data.department,
    options: parsed.data.options,
  });

  return ok(result);
}
