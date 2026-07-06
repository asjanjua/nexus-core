/**
 * POST /api/agents/native-skills/vantage-diligence-analysis
 *
 * Executes the first-party vantage_diligence_analysis native skill: runs the
 * DD checklist against the deal workspace's governed evidence and returns
 * diligence coverage, red flags, model tie-outs, and IC memo sections. Tenant
 * is derived from the session, never the body. Gated on read:evidence; it
 * reads evidence and writes started/completed audit events only.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { runVantageDiligenceAnalysis } from "@/lib/services/vantage-diligence-analysis-runner";

const requestSchema = z.object({
  reviewId: z.string().min(1).max(80),
  dealType: z.enum(["fintech_ma", "generic_ma"]).default("fintech_ma"),
  agentKey: z.string().min(1).max(120).optional(),
  department: z.string().min(1).max(120).optional(),
  options: z
    .object({
      confidenceThreshold: z.number().min(0).max(1).optional(),
      maxCitationsPerItem: z.number().int().min(1).max(10).optional(),
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

  const result = await runVantageDiligenceAnalysis({
    workspaceId: ctx.workspaceId,
    reviewId: parsed.data.reviewId,
    dealType: parsed.data.dealType,
    agentKey: parsed.data.agentKey,
    department: parsed.data.department,
    options: parsed.data.options,
  });

  return ok(result);
}
