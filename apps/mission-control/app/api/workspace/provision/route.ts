/**
 * POST /api/workspace/provision
 *
 * Idempotently creates the tenant, workspace, and default settings for the
 * current Clerk org. Called by:
 *   - The onboarding wizard on first visit after sign-up
 *   - The Clerk webhook handler on organization.created events (belt-and-suspenders)
 *
 * Safe to call multiple times — all inserts use ON CONFLICT DO NOTHING.
 */

import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const bodySchema = z.object({
  orgName: z.string().min(2).max(200).optional()
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const orgName = parsed.data.orgName ?? ctx.workspaceId;

  const result = await repository.provisionWorkspace({
    clerkOrgId: ctx.workspaceId,
    orgName,
    ownerClerkUserId: ctx.userId
  });

  return ok(result);
}
