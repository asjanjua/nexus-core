/**
 * POST /api/workspace/detect-profile
 *
 * AI-powered company profile detection from a free-text description.
 * Used by the onboarding wizard's "Describe your company" step.
 *
 * Returns a structured DetectedProfile with inferred sector, roles,
 * document recommendations, KPIs, risks, and sensitivity defaults.
 *
 * Falls back gracefully with ok:false when the LLM is unavailable
 * so the wizard can display a manual selection fallback.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { detectCompanyProfile } from "@/lib/services/company-detection";

const bodySchema = z.object({
  description: z.string().min(10).max(2000)
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_request: description must be between 10 and 2000 characters", 400);
  }

  const profile = await detectCompanyProfile(parsed.data.description, { workspaceId: ctx.workspaceId });

  if (!profile) {
    return fail("detection_failed: LLM unavailable or description too thin", 422);
  }

  return ok(profile);
}
