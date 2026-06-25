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
import { repository } from "@/lib/data/repository";
import { listOrgPosts, refreshAccessToken } from "@/lib/connectors/linkedin";

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<{ accessToken: string; defaultOrgUrn?: string } | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;
  const defaultOrgUrn = creds.defaultOrgUrn as string | undefined;

  if (!accessToken) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return { accessToken, defaultOrgUrn };
    }
  }

  if (refreshToken) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      await repository.upsertConnector({
        workspaceId,
        type,
        installedBy: "token-refresh",
        credentials: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token ?? refreshToken,
          scope: newTokens.scope,
          expiresIn: newTokens.expires_in,
          obtainedAt: new Date().toISOString(),
          defaultOrgUrn,
        },
      });
      return { accessToken: newTokens.access_token, defaultOrgUrn };
    } catch {
      return null;
    }
  }

  return { accessToken, defaultOrgUrn };
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const orgUrn = url.searchParams.get("orgUrn") ?? undefined;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "linkedin");

  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidAccessToken(ctx.workspaceId, "linkedin");
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
