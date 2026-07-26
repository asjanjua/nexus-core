/**
 * Pinavia trial invites (migration 0038) — staff-only.
 *
 * GET    /api/admin/trial-invites          — list all invites, newest first
 * POST   /api/admin/trial-invites          — issue an invite (returns the code ONCE)
 * DELETE /api/admin/trial-invites?id=...   — revoke an invite
 *
 * Gated by `isPlatformAdmin`, NOT by `AuthContext.isOrgAdmin`. The latter means
 * "admin of the caller's own org" and is true for every customer admin and every
 * personal workspace, so it would let any signed-up user hand out product
 * access. See lib/platform-admin.ts.
 *
 * The invite code is generated server-side, returned once, and stored only as a
 * sha256 hash — same handling as reviewer seats.
 */

import { createHash, randomBytes, randomUUID } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { DEMO_PACK_SECTORS } from "@/lib/demo/sector-packs";
import { buildTrialInviteEmailHtml, resendConfigured, sendEmail } from "@/lib/email/resend";
import { isPlatformAdmin } from "@/lib/platform-admin";

/** How long the LINK stays valid. Distinct from trialDays, the trial length. */
const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(160).optional(),
  company: z.string().min(1).max(200).optional(),
  note: z.string().max(2000).optional(),
  demoPack: z.enum(DEMO_PACK_SECTORS as [string, ...string[]]).optional(),
  trialDays: z.number().int().min(1).max(365).default(30),
});

/**
 * Resolve the caller and confirm Pinavia staff. Returns a 403 rather than a 404
 * for a signed-in non-staff user: the route's existence is not a secret, and a
 * misleading 404 would send a Pinavia operator hunting a deploy problem when the
 * real cause is an unset PINAVIA_ADMIN_PRINCIPALS.
 */
async function requirePlatformAdmin(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return { auth: null, error: fail("unauthorized", 401) };
  if (!isPlatformAdmin(auth)) return { auth: null, error: fail("platform_admin_required", 403) };
  return { auth, error: null };
}

export async function GET(request: Request) {
  const { auth, error } = await requirePlatformAdmin(request);
  if (!auth) return error;

  const invites = await repository.listTrialInvites();
  return ok({ invites });
}

export async function POST(request: Request) {
  const { auth, error } = await requirePlatformAdmin(request);
  if (!auth) return error;

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const inviteCode = randomBytes(24).toString("base64url");
  const inviteCodeHash = createHash("sha256").update(inviteCode).digest("hex");

  const invite = await repository.createTrialInvite({
    id: `ti_${randomUUID()}`,
    email: parsed.data.email.trim().toLowerCase(),
    name: parsed.data.name ?? null,
    company: parsed.data.company ?? null,
    note: parsed.data.note ?? null,
    demoPack: parsed.data.demoPack ?? null,
    inviteCodeHash,
    invitedBy: auth.userId,
    trialDays: parsed.data.trialDays,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  // Audited against the issuing operator's own workspace: this is a Pinavia
  // action, and the invitee has no workspace to attribute it to yet.
  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "trial_invite.issued",
    actor: auth.userId,
    payload: { inviteId: invite.id, email: invite.email, trialDays: invite.trialDays },
  }).catch(() => {});

  const acceptUrl = buildAcceptUrl(request, inviteCode);
  let emailSent = false;
  if (resendConfigured()) {
    try {
      await sendEmail({
        to: invite.email,
        subject: "You have been invited to try Pinavia",
        html: buildTrialInviteEmailHtml({
          inviteeName: invite.name,
          invitedBy: auth.userId,
          acceptUrl,
          expiresAt: invite.expiresAt,
          trialDays: invite.trialDays,
        }),
      });
      emailSent = true;
    } catch (err) {
      void repository.pushAudit({
        workspaceId: auth.workspaceId,
        type: "trial_invite.email_failed",
        actor: auth.userId,
        payload: {
          inviteId: invite.id,
          email: invite.email,
          reason: String(err instanceof Error ? err.message : err),
        },
      }).catch(() => {});
    }
  }

  // Code and link returned exactly once. This is the path that matters in
  // practice: most of these invites go out by hand in a WhatsApp or email
  // thread the operator is already in, not through Resend.
  return ok({ invite, inviteCode, acceptUrl, emailSent });
}

export async function DELETE(request: Request) {
  const { auth, error } = await requirePlatformAdmin(request);
  if (!auth) return error;

  const inviteId = new URL(request.url).searchParams.get("id");
  if (!inviteId) return fail("invalid_request", 400);

  const revoked = await repository.revokeTrialInvite(inviteId);
  if (!revoked) return fail("trial_invite_not_found", 404);

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "trial_invite.revoked",
    actor: auth.userId,
    payload: { inviteId: revoked.id, email: revoked.email },
  }).catch(() => {});

  return ok(revoked);
}

/** Absolute redeem-page URL carrying the single-use invite code. */
function buildAcceptUrl(request: Request, inviteCode: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  const origin = configured || new URL(request.url).origin;
  return `${origin}/invite/accept?code=${encodeURIComponent(inviteCode)}`;
}
