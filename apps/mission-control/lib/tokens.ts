/**
 * Token signing and verification for NexusAI Bearer tokens.
 *
 * Used by:
 *  - app/api/oauth/token/route.ts  (issues tokens)
 *  - lib/api-auth.ts               (verifies tokens in route handlers)
 *
 * Keeps route files free of crypto logic and avoids circular imports.
 */

import crypto from "crypto";

export const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

function secret(): string {
  return process.env.AUTH_SECRET ?? "nexus-dev-secret";
}

export function signToken(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("hex");
  return `${body}.${sig}`;
}

export type BearerPayload = {
  workspaceId: string;
  keyId: string;
  scopes: string[];
  exp: number;
};

/**
 * Decode and verify a Bearer token from an Authorization header.
 * Returns null if the header is missing, malformed, tampered, or expired.
 */
export function decodeBearerToken(authHeader: string | null): BearerPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac("sha256", secret()).update(body).digest("hex");
  const left = Buffer.from(expectedSig, "hex");
  const right = Buffer.from(sig, "hex");
  if (left.length !== right.length) return null;
  if (!crypto.timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8")
    ) as BearerPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
