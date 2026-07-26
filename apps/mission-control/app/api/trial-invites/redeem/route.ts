/**
 * Redeem a Pinavia trial invite.
 *
 * POST /api/trial-invites/redeem  { code }
 *
 * The caller must have a provisioned workspace. The one-time claim and trial
 * entitlement are committed together, so an invite cannot be consumed without
 * a usable workspace. A sector pack, when included, is seeded after the
 * entitlement succeeds and never switches the workspace into persistent demo
 * mode.
 */

import { createHash } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";
import { DemoPackSeedRefusedError, isDemoPackSector, seedSectorPack } from "@/lib/demo/seed-sector-pack";

const redeemSchema = z.object({ code: z.string().min(10).max(200) });

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  // Reject before touching the one-time code. The accept page provisions the
  // workspace first; this also makes direct API callers recoverable.
  if (!(await repository.isWorkspaceProvisioned(auth.workspaceId))) {
    return fail("workspace_setup_required", 409);
  }

  const inviteCodeHash = createHash("sha256").update(parsed.data.code).digest("hex");
  let redeemed: Awaited<ReturnType<typeof repository.redeemAndProvisionTrialInvite>>;
  try {
    redeemed = await repository.redeemAndProvisionTrialInvite(
      inviteCodeHash,
      auth.userId,
      auth.workspaceId
    );
  } catch (error) {
    // A workspace may be deleted between the preflight and transaction. The
    // transaction rolls back the invite update before surfacing this response.
    if (error instanceof Error && error.message === "workspace_not_provisioned") {
      return fail("workspace_setup_required", 409);
    }
    throw error;
  }

  // One error for unknown, expired, already-redeemed, and revoked. Distinguishing
  // those conditions would turn this endpoint into a code-status oracle.
  if (!redeemed) return fail("invite_not_redeemable", 400);

  const { invite, expiresAt } = redeemed;
  let demoSeeded = false;
  if (invite.demoPack && isDemoPackSector(invite.demoPack)) {
    try {
      await seedSectorPack({ workspaceId: auth.workspaceId, actor: auth.userId, sector: invite.demoPack });
      demoSeeded = true;
    } catch (error) {
      // The entitlement is already valid. Leave the workspace usable and give
      // the operator an auditable signal for a manual seed retry.
      void repository.pushAudit({
        workspaceId: auth.workspaceId,
        type: error instanceof DemoPackSeedRefusedError
          ? "trial_invite.demo_seed_skipped"
          : "trial_invite.demo_seed_failed",
        actor: auth.userId,
        payload: {
          inviteId: invite.id,
          demoPack: invite.demoPack,
          reason: error instanceof Error ? error.message : "unknown",
        },
      }).catch(() => {});
    }
  }

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "trial_invite.redeemed",
    actor: auth.userId,
    payload: {
      inviteId: invite.id,
      invitedBy: invite.invitedBy,
      trialDays: invite.trialDays,
      expiresAt,
      demoSeeded,
    },
  }).catch(() => {});

  return ok({
    invite,
    plan: "pro",
    trialExpiresAt: expiresAt,
    demoPack: invite.demoPack,
    demoSeeded,
  });
}
