/**
 * GET /api/connectors/jira/files
 *
 * Searches issues in the workspace's connected Jira Cloud site.
 * Automatically refreshes the access token if expired.
 *
 * Query params:
 *   jql     — JQL query (defaults to all issues, newest first)
 *   startAt — pagination offset
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { searchIssues, refreshAccessToken } from "@/lib/connectors/jira";

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<{ accessToken: string; cloudId: string } | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;
  const cloudId = creds.cloudId as string | undefined;

  if (!accessToken || !cloudId) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return { accessToken, cloudId };
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
          cloudId,
        },
      });
      return { accessToken: newTokens.access_token, cloudId };
    } catch {
      return null;
    }
  }

  return { accessToken, cloudId };
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const jql = url.searchParams.get("jql") ?? undefined;
  const startAt = Number(url.searchParams.get("startAt") ?? "0") || 0;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "jira");

  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidAccessToken(ctx.workspaceId, "jira");
  if (!auth) {
    return fail("jira_auth_expired", 401);
  }

  try {
    const result = await searchIssues(auth.accessToken, auth.cloudId, jql, startAt);
    return ok(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "search_failed";
    return fail(message, 502);
  }
}
