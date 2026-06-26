/**
 * POST /api/connectors/imap/connect
 *
 * Establishes an IMAP Email connector. Unlike every other connector in
 * this codebase, IMAP has no OAuth install/callback dance — the user
 * supplies server settings and credentials directly in this one request.
 *
 * Flow:
 *   1. Validate the request body (host/port/secure/username/password)
 *   2. Attempt a real IMAP login against the server to fail fast on typos
 *      or wrong credentials, before anything is stored
 *   3. Store the credentials encrypted via the standard repository path
 *      (same AES-256-GCM encryption every OAuth connector's tokens get)
 *
 * Request body:
 *   {
 *     host: string,
 *     port?: number,        // defaults to 993
 *     secure?: boolean,      // defaults to true (TLS)
 *     username: string,
 *     password: string,
 *     label?: string         // optional display label, e.g. "Support inbox"
 *   }
 */

import { ok, fail } from "@/lib/api";
import { requireScope } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { verifyConnection } from "@/lib/connectors/imap";
import { z } from "zod";

const connectBodySchema = z.object({
  host: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).optional().default(993),
  secure: z.boolean().optional().default(true),
  username: z.string().min(1).max(255),
  password: z.string().min(1).max(512),
  label: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const { ctx, error } = await requireScope(request, "admin");
  if (error) return error;

  const parsed = connectBodySchema.safeParse(
    await request.json().catch(() => ({}))
  );
  if (!parsed.success) {
    return fail(parsed.error.message, 400);
  }

  const { host, port, secure, username, password, label } = parsed.data;

  try {
    await verifyConnection({ host, port, secure, username, password });
  } catch (err) {
    const message = err instanceof Error ? err.message : "imap_connect_failed";
    return fail(`imap_auth_failed: ${message}`, 401);
  }

  let connector;
  try {
    connector = await repository.upsertConnector({
      workspaceId: ctx.workspaceId,
      type: "imap",
      installedBy: "imap-manual",
      credentials: {
        host,
        port,
        secure,
        username,
        password,
        obtainedAt: new Date().toISOString(),
      },
      config: {
        host,
        port,
        secure,
        username,
        label: label ?? username,
      },
    });
  } catch {
    return fail("connector_store_failed", 500);
  }

  return ok({ connector });
}
