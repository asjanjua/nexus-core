/**
 * POST /api/webhooks/clerk
 *
 * Clerk webhook receiver. Handles:
 *   - organization.created  → provision workspace (belt-and-suspenders backup to onboarding)
 *   - organization.deleted  → mark workspace inactive (future)
 *
 * Security: Svix signature verification using CLERK_WEBHOOK_SECRET.
 * Set this in Clerk Dashboard → Webhooks → your endpoint → Signing Secret.
 *
 * This route is intentionally excluded from Clerk's session middleware
 * because it's called by Clerk's servers, not by browser sessions.
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { repository } from "@/lib/data/repository";

export const runtime = "nodejs";

function verifyWebhookSignature(
  rawBody: string,
  headers: Headers
): boolean {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Dev: allow without verification
    return process.env.NODE_ENV !== "production";
  }

  // Svix signature format: svix-id, svix-timestamp, svix-signature
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject messages older than 5 minutes
  const age = Math.abs(Date.now() / 1000 - Number(svixTimestamp));
  if (age > 300) return false;

  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  // Svix uses base64-encoded secret (strip "whsec_" prefix)
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const computed = crypto
    .createHmac("sha256", secretBytes)
    .update(signedContent, "utf8")
    .digest("base64");

  // svix-signature may have multiple values (v1,sig1 v1,sig2 ...)
  const signatures = svixSignature.split(" ").map((s) => s.split(",")[1]);
  return signatures.some((sig) => sig === computed);
}

type ClerkOrgCreatedEvent = {
  type: "organization.created";
  data: {
    id: string;
    name: string;
    created_by: string;
  };
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { type, data } = event as { type: string; data: Record<string, unknown> };

  if (type === "organization.created") {
    const { id, name, created_by } = (event as ClerkOrgCreatedEvent).data;
    await repository.provisionWorkspace({
      clerkOrgId: id,
      orgName: name,
      ownerClerkUserId: created_by
    });
  }

  void data; // suppress unused warning for other event types
  return NextResponse.json({ received: true });
}
