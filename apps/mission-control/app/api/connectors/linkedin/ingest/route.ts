/**
 * POST /api/connectors/linkedin/ingest
 *
 * Fetches a single LinkedIn company-page post by id and pipes it through
 * the existing ingestion pipeline as text — posts are JSON social-media
 * resources, not files, so there is no binary download step.
 *
 * Request body:
 *   { postId: string, sensitivity?: string, department?: string }
 */

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import { getPost, refreshAccessToken } from "@/lib/connectors/linkedin";
import { z } from "zod";

const ingestBodySchema = z.object({
  postId: z.string().min(1),
  sensitivity: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional()
    .default("public"),
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

  const { postId, sensitivity, department } = parsed.data;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "linkedin");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const accessToken = await getValidAccessToken(ctx.workspaceId, "linkedin");
  if (!accessToken) {
    return fail("linkedin_auth_expired", 401);
  }

  let post;
  try {
    post = await getPost(accessToken, postId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return fail(message, 502);
  }

  const text = [
    `Author: ${post.author}`,
    `Visibility: ${post.visibility ?? "unknown"}`,
    `Created: ${post.createdAt ? new Date(post.createdAt).toISOString() : "unknown"}`,
    "",
    post.commentary ?? "",
  ].join("\n");

  const hash = crypto.createHash("sha256").update(text).digest("base64url");
  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "social_export",
      department,
      connectorInstanceId,
      sourcePath: `linkedin://posts/${postId}`,
      sourceTimestamp: post.lastModifiedAt
        ? new Date(post.lastModifiedAt).toISOString()
        : new Date().toISOString(),
      hash,
      sensitivity,
      extractionConfidence: 0.85,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({ evidence, postId });
}
