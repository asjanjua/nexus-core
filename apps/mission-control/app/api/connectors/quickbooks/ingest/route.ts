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

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import {
  getActiveConnector,
  getValidConnectorAuth,
} from "@/lib/connectors/shared/access-token";
import { ingestEvidence } from "@/lib/services/ingestion";
import {
  departmentField,
  evidenceHash,
  sensitivityField,
  tenantIdForWorkspace,
} from "@/lib/connectors/shared/ingest";
import { getInvoice, refreshAccessToken } from "@/lib/connectors/quickbooks";
import { z } from "zod";

const ingestBodySchema = z.object({
  invoiceId: z.string().min(1),
  sensitivity: sensitivityField("confidential"),
  department: departmentField,
});

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

  const connector = await getActiveConnector(ctx.workspaceId, "quickbooks");
  if (!connector) {
    return fail("connector_not_active", 404);
  }

  const auth = await getValidConnectorAuth({
    workspaceId: ctx.workspaceId,
    type: "quickbooks",
    refreshAccessToken,
    requiredCredentials: ["realmId"] as const,
  });
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

  const hash = evidenceHash(text);
  const connectorInstanceId = connector.id;
  const tenantId = tenantIdForWorkspace(ctx.workspaceId);

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
