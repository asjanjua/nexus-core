/**
 * GET /api/workspace/status
 *
 * Returns whether the current org's workspace has been provisioned.
 * Used by layout and onboarding to decide whether to show the setup wizard.
 */

import { ok } from "@/lib/api";
import { resolveAuth, DEFAULT_WORKSPACE } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

export async function GET(request: Request) {
  const auth = await resolveAuth(request);
  const workspaceId = auth?.workspaceId ?? DEFAULT_WORKSPACE;
  const provisioned = await repository.isWorkspaceProvisioned(workspaceId);
  return ok({ workspaceId, provisioned });
}
