/**
 * Signed OAuth state shared by every connector install/callback route.
 *
 * The state carries the workspace id through the provider round trip and is
 * HMAC-SHA256 signed with AUTH_SECRET so callbacks can reject forged or
 * replayed redirects.
 */

import crypto from "crypto";
import { requireAuthSecret, timingSafeEqualString } from "@/lib/security";

export type ConnectorStatePayload = { workspaceId: string; ts: number };

const STATE_MAX_AGE_MS = 10 * 60 * 1000;

function sign(encoded: string): string {
  return crypto
    .createHmac("sha256", requireAuthSecret())
    .update(encoded)
    .digest("hex");
}

export function signConnectorState(workspaceId: string): string {
  const payload = JSON.stringify({ workspaceId, ts: Date.now() });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyConnectorState(
  state: string
): ConnectorStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;

  if (!timingSafeEqualString(sign(encoded), sig, "hex")) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString()
    ) as ConnectorStatePayload;
    if (Date.now() - payload.ts > STATE_MAX_AGE_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
