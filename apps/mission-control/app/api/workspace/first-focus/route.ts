/**
 * POST /api/workspace/first-focus
 *
 * AI onboarding strategist: maps the user's stated focus intent to
 * recommended dashboards and suggested first questions for the Ask panel.
 *
 * Called from the wizard's Go Live step when the user types
 * "I want to know what's blocking growth / what risks need my attention".
 *
 * Falls back gracefully with ok:false when the LLM is unavailable so
 * the wizard still completes with the standard role-card view.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { mapFocusToDashboard } from "@/lib/services/company-detection";
import { buildCompanyContext } from "@/lib/domain/sector-library";
import { repository } from "@/lib/data/repository";

const bodySchema = z.object({
  intent: z.string().min(5).max(1000)
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return fail("invalid_request: intent must be between 5 and 1000 characters", 400);
  }

  // Enrich the prompt with company context if a profile exists
  const profile = await repository.getWorkspaceProfile(ctx.workspaceId);
  const companyContext = profile ? buildCompanyContext(profile) : "";

  const mapping = await mapFocusToDashboard(parsed.data.intent, companyContext, { workspaceId: ctx.workspaceId });

  if (!mapping) {
    return fail("mapping_failed: LLM unavailable or intent too thin", 422);
  }

  return ok(mapping);
}
