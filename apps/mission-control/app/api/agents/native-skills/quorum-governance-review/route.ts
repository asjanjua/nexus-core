/**
 * POST /api/agents/native-skills/quorum-governance-review
 *
 * Executes the first-party quorum_governance_review native skill: reviews the
 * board workspace's governed evidence, decisions, and actions, and returns
 * governance findings, decision gaps, an approval packet, and board-pack
 * caveats. Tenant is derived from the session, never the body. Gated on
 * read:evidence; it reads evidence and writes started/completed audit events.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { runQuorumGovernanceReview } from "@/lib/services/quorum-governance-review-runner";

const requestSchema = z.object({
  reviewId: z.string().min(1).max(80),
  agentKey: z.string().min(1).max(120).optional(),
  department: z.string().min(1).max(120).optional(),
  options: z
    .object({
      maxCitationsPerRequirement: z.number().int().min(1).max(10).optional(),
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

  const result = await runQuorumGovernanceReview({
    workspaceId: ctx.workspaceId,
    reviewId: parsed.data.reviewId,
    agentKey: parsed.data.agentKey,
    department: parsed.data.department,
    options: parsed.data.options,
  });

  return ok(result);
}
