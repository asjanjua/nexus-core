/**
 * GET /api/connectors/github/files
 *
 * Lists GitHub repos (no query params) or issues/PRs within a repo
 * (when ?repo=owner/name is supplied) for the workspace's connected
 * GitHub account. Automatically refreshes the access token if a
 * GitHub App refresh token is present and the token has expired.
 *
 * Query params:
 *   repo — "owner/name" — if present, lists issues for that repo
 *   page — pagination page number
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import {
  listRepos,
  listIssues,
  refreshAccessToken,
} from "@/lib/connectors/github";

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const repoParam = url.searchParams.get("repo") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;

  const connector = await getActiveConnector(ctx.workspaceId, "github");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "github",
    refreshAccessToken,
    treatMissingExpiryAsFresh: true,
  });
  const accessToken = auth?.accessToken;
  if (!accessToken) {
    return fail("github_auth_expired", 401);
  }

  try {
    if (repoParam) {
      const [owner, repo] = repoParam.split("/");
      if (!owner || !repo) return fail("invalid_repo_param", 400);
      const issues = await listIssues(accessToken, owner, repo, page);
      return ok({ issues, repo: repoParam, page });
    }

    const repos = await listRepos(accessToken, page);
    return ok({ repos, page });
  } catch (err) {
    const message = err instanceof Error ? err.message : "list_failed";
    return fail(message, 502);
  }
}
