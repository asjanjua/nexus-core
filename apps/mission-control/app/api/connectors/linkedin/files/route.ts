/**
 * GET /api/connectors/linkedin/files
 *
 * Lists posts from the workspace's connected LinkedIn company page.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   orgUrn — "urn:li:organization:{id}" — defaults to the org resolved
 *            at install time, if any.
 *
 * Note: requires LinkedIn's Community Management API product to be
 * approved for the connected app; otherwise this returns a 502 with the
 * underlying 403 message from LinkedIn.
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { listOrgPosts, refreshAccessToken } from "@/lib/connectors/linkedin";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const orgUrn = url.searchParams.get("orgUrn") ?? undefined;

  const connector = await getActiveConnector(ctx.workspaceId, "linkedin");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "linkedin",
    refreshAccessToken,
    optionalCredentials: ["defaultOrgUrn"] as const,
  });
  if (!auth) {
    return fail("linkedin_auth_expired", 401);
  }

  const targetOrg = orgUrn ?? auth.defaultOrgUrn;
  if (!targetOrg) {
    return fail("linkedin_no_org_resolved", 400);
  }

  try {
    const posts = await listOrgPosts(auth.accessToken, targetOrg);
    return ok({ posts, orgUrn: targetOrg });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
