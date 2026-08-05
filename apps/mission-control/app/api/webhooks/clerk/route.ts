/**
 * POST /api/webhooks/clerk
 *
 * Clerk webhook receiver. Handles:
 *   - organization.created              → provision workspace
 *   - organizationMembership.created    → enforce maxTeam seat limit
 *   - organization.deleted              → mark workspace inactive (future)
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
import { isExplicitDevRuntime, timingSafeEqualString } from "@/lib/security";
import { checkTeamSeatLimit } from "@/lib/billing/budget";

export const runtime = "nodejs";

/** Verify Svix webhook signature. Fails closed when CLERK_WEBHOOK_SECRET is unset. */
function verifyWebhookSignature(
  rawBody: string,
  headers: Headers
): boolean {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    // Unverified events provision workspaces, so an unconfigured secret is only
    // tolerated under an explicitly declared dev/test runtime. An unset
    // NODE_ENV — a container entrypoint, a worker — fails closed.
    return isExplicitDevRuntime();
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
  const signatures = svixSignature
    .split(" ")
    .map((s) => s.split(",")[1])
    .filter(Boolean);
  return signatures.some((sig) => timingSafeEqualString(sig, computed));
}

// ---------------------------------------------------------------------------
// Event type shapes (partial — only the fields we consume)
// ---------------------------------------------------------------------------

type ClerkOrgCreatedEvent = {
  type: "organization.created";
  data: {
    id: string;
    name: string;
    created_by: string;
  };
};

type ClerkMembershipCreatedEvent = {
  type: "organizationMembership.created";
  data: {
    id: string;
    organization: { id: string };
    public_user_data: { user_id: string; identifier: string };
  };
};

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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
  void data; // suppress unused warning for unhandled event types

  // -- organization.created: provision workspace -------------------------

  if (type === "organization.created") {
    const { id, name, created_by } = (event as ClerkOrgCreatedEvent).data;
    await repository.provisionWorkspace({
      clerkOrgId: id,
      orgName: name,
      ownerClerkUserId: created_by,
    });
    return NextResponse.json({ received: true });
  }

  // -- organizationMembership.created: enforce maxTeam -------------------

  if (type === "organizationMembership.created") {
    const { organization, public_user_data: _user } = (event as ClerkMembershipCreatedEvent).data;
    const workspaceId = organization.id;

    // workspaceId is the Clerk org ID — the workspace must already exist
    // (provisioned by organization.created or onboarding).
    const limitCheck = await checkTeamSeatLimit(workspaceId);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "seat_limit_exceeded",
          message: `Workspace ${workspaceId} is at its team seat limit ` +
            `(${limitCheck.used}/${limitCheck.limit}). ` +
            `Upgrade to ${limitCheck.requiredPlan ?? "a higher plan"} to add more members.`,
          details: { used: limitCheck.used, limit: limitCheck.limit },
        },
        { status: 402 }
      );
    }

    return NextResponse.json({ received: true });
  }

  // -- Unhandled event types: acknowledge to prevent Clerk retries --------

  return NextResponse.json({ received: true });
}
