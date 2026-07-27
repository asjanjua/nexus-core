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
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { searchIssues, refreshAccessToken } from "@/lib/connectors/jira";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const jql = url.searchParams.get("jql") ?? undefined;
  const startAt = Number(url.searchParams.get("startAt") ?? "0") || 0;

  const connector = await getActiveConnector(ctx.workspaceId, "jira");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "jira",
    refreshAccessToken,
    requiredCredentials: ["cloudId"] as const,
  });
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
