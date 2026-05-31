/**
 * POST /api/readiness/submit
 *
 * Public lead-capture endpoint for the AI-Native Readiness Assessment.
 * Writes a lightweight audit/lead event without requiring a workspace session.
 *
 * This is intentionally not treated as a certification, regulatory opinion,
 * legal opinion, financial opinion, or automated eligibility decision.
 */

import { ok, fail } from "@/lib/api";
import { repository } from "@/lib/data/repository";
import { z } from "zod";

const scoreSchema = z.record(z.number().int().min(1).max(7));

const readinessSubmitSchema = z.object({
  scores: scoreSchema,
  total: z.number().int().min(7).max(49),
  band: z.string().min(1).max(80),
  email: z.string().email().max(320).nullable().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = readinessSubmitSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_input", 400);

  const submittedAt = new Date().toISOString();
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  await repository.pushAudit({
    workspaceId: "public-readiness",
    type: "readiness.assessment_submitted",
    actor: parsed.data.email ?? "anonymous",
    payload: {
      ...parsed.data,
      submittedAt,
      disclaimer:
        "Directional readiness guidance only; not a regulatory, financial, legal, or operational opinion.",
      source: "public_readiness_page",
      userAgent,
      forwardedFor,
    },
  });

  return ok({ submitted: true, submittedAt });
}
