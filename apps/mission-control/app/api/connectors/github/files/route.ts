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
import { repository } from "@/lib/data/repository";
import {
  listRepos,
  listIssues,
  refreshAccessToken,
} from "@/lib/connectors/github";

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<string | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;

  if (!accessToken) return null;

  // Classic GitHub OAuth app tokens have no expiresIn — only refresh
  // when we actually know an expiry and a refresh token.
  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return accessToken;
    }
  } else if (!expiresIn) {
    return accessToken;
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
        },
      });
      return newTokens.access_token;
    } catch {
      return null;
    }
  }

  return accessToken;
}

export async function GET(request: Request) {
  const { ctx, error } = await requireScope(request, "read:connectors");
  if (error) return error;

  const url = new URL(request.url);
  const repoParam = url.searchParams.get("repo") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "github");

  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const accessToken = await getValidAccessToken(ctx.workspaceId, "github");
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
