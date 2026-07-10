/**
 * POST /api/connectors/github/ingest
 *
 * Fetches a single issue or PR from GitHub by owner/repo/number and pipes
 * it through the existing ingestion pipeline as text (title + body +
 * metadata), not a binary download — GitHub issues are JSON resources,
 * not files.
 *
 * Request body:
 *   { owner: string, repo: string, issueNumber: number, sensitivity?: string, department?: string }
 */

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import { getIssue, refreshAccessToken } from "@/lib/connectors/github";
import { z } from "zod";

const ingestBodySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  issueNumber: z.number().int().positive(),
  sensitivity: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional()
    .default("internal"),
  department: z.string().max(200).optional(),
});

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

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const parsed = ingestBodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return fail(parsed.error.message, 400);
  }

  const { owner, repo, issueNumber, sensitivity, department } = parsed.data;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "github");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const accessToken = await getValidAccessToken(ctx.workspaceId, "github");
  if (!accessToken) {
    return fail("github_auth_expired", 401);
  }

  let issue;
  try {
    issue = await getIssue(accessToken, owner, repo, issueNumber);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return fail(message, 502);
  }

  // Serialize the issue as text — there is no binary file to download.
  const labels = (issue.labels ?? [])
    .map((l) => (typeof l === "string" ? l : l.name))
    .join(", ");
  const text = [
    `Title: ${issue.title}`,
    `State: ${issue.state}`,
    `Author: ${issue.user?.login ?? "unknown"}`,
    `Labels: ${labels || "none"}`,
    `Created: ${issue.created_at}`,
    `Updated: ${issue.updated_at}`,
    issue.pull_request ? "Type: Pull Request" : "Type: Issue",
    "",
    issue.body ?? "",
  ].join("\n");

  const hash = crypto.createHash("sha256").update(text).digest("base64url");
  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "github",
      department,
      connectorInstanceId,
      sourcePath: `github://${owner}/${repo}/issues/${issueNumber}`,
      sourceUri: issue.html_url,
      sourceTimestamp: issue.updated_at,
      hash,
      sensitivity,
      extractionConfidence: 0.95,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({ evidence, owner, repo, issueNumber });
}
