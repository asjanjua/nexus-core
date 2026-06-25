/**
 * POST /api/connectors/quickbooks/ingest
 *
 * Fetches a single invoice from QuickBooks by id and pipes it through the
 * existing ingestion pipeline as text — invoices are JSON accounting
 * records, not files, so there is no binary download step.
 *
 * Request body:
 *   { invoiceId: string, sensitivity?: string, department?: string }
 */

import crypto from "crypto";
import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { ingestEvidence } from "@/lib/services/ingestion";
import { getInvoice, refreshAccessToken } from "@/lib/connectors/quickbooks";
import { z } from "zod";

const ingestBodySchema = z.object({
  invoiceId: z.string().min(1),
  sensitivity: z
    .enum(["public", "internal", "confidential", "restricted"])
    .optional()
    .default("confidential"),
  department: z.string().max(200).optional(),
});

async function getValidAccessToken(
  workspaceId: string,
  type: string
): Promise<{ accessToken: string; realmId: string } | null> {
  const creds = await repository.getConnectorCredentials(workspaceId, type);
  if (!creds) return null;

  const accessToken = creds.accessToken as string | undefined;
  const refreshToken = creds.refreshToken as string | undefined;
  const obtainedAt = creds.obtainedAt as string | undefined;
  const expiresIn = creds.expiresIn as number | undefined;
  const realmId = creds.realmId as string | undefined;

  if (!accessToken || !realmId) return null;

  if (obtainedAt && expiresIn) {
    const obtained = new Date(obtainedAt).getTime();
    const expiresAt = obtained + (expiresIn - 60) * 1000;
    if (Date.now() < expiresAt) {
      return { accessToken, realmId };
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
          expiresIn: newTokens.expires_in,
          obtainedAt: new Date().toISOString(),
          realmId,
        },
      });
      return { accessToken: newTokens.access_token, realmId };
    } catch {
      return null;
    }
  }

  return { accessToken, realmId };
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

  const { invoiceId, sensitivity, department } = parsed.data;

  const connectors = await repository.listConnectors(ctx.workspaceId);
  const connector = connectors.find((c) => c.type === "quickbooks");
  if (!connector || connector.status !== "active") {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidAccessToken(ctx.workspaceId, "quickbooks");
  if (!auth) {
    return fail("quickbooks_auth_expired", 401);
  }

  let invoice;
  try {
    invoice = await getInvoice(auth.accessToken, auth.realmId, invoiceId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    return fail(message, 502);
  }

  const lines = (invoice.Line ?? [])
    .map((l) => `  - ${l.Description ?? "(no description)"}: ${l.Amount ?? 0}`)
    .join("\n");
  const text = [
    `Invoice: ${invoice.DocNumber ?? invoice.Id}`,
    `Customer: ${invoice.CustomerRef?.name ?? invoice.CustomerRef?.value ?? "unknown"}`,
    `Total: ${invoice.TotalAmt ?? "unknown"}`,
    `Balance: ${invoice.Balance ?? "unknown"}`,
    `Transaction date: ${invoice.TxnDate ?? "unknown"}`,
    `Due date: ${invoice.DueDate ?? "unset"}`,
    "Lines:",
    lines || "  (none)",
  ].join("\n");

  const hash = crypto.createHash("sha256").update(text).digest("base64url");
  const connectorInstanceId = connector.id;
  const tenantId = ctx.workspaceId.replace("workspace-", "tenant-");

  let evidence;
  try {
    evidence = await ingestEvidence({
      workspaceId: ctx.workspaceId,
      tenantId,
      sourceType: "finance_export",
      department,
      connectorInstanceId,
      sourcePath: `quickbooks://${auth.realmId}/invoice/${invoice.Id}`,
      sourceTimestamp:
        invoice.MetaData?.LastUpdatedTime ?? new Date().toISOString(),
      hash,
      sensitivity,
      extractionConfidence: 0.9,
      text,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingestion_failed";
    return fail(message, 500);
  }

  return ok({ evidence, invoiceId: invoice.Id });
}
