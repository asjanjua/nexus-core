/**
 * POST /api/agents/native-skills/meridian-compliance-review
 *
 * Executes the first-party meridian_compliance_review native skill: maps a
 * regulator license type's requirements to the workspace's governed evidence
 * and returns requirement coverage, compliance gaps, a qualified-reviewer
 * packet, and filing caveats. Tenant is derived from the session, never the
 * body. Gated on read:evidence; it reads evidence and writes audit events.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { runMeridianComplianceReview } from "@/lib/services/meridian-compliance-review-runner";

const requestSchema = z.object({
  reviewId: z.string().min(1).max(80),
  licenseTypeKey: z.string().min(1).max(120),
  status: z.enum(["existing", "aspirational"]).default("aspirational"),
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

  const result = await runMeridianComplianceReview({
    workspaceId: ctx.workspaceId,
    reviewId: parsed.data.reviewId,
    licenseTypeKey: parsed.data.licenseTypeKey,
    status: parsed.data.status,
    agentKey: parsed.data.agentKey,
    department: parsed.data.department,
    options: parsed.data.options,
  });

  return ok(result);
}
