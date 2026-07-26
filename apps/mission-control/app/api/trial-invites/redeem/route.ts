/**
 * Redeem a Pinavia trial invite.
 *
 * POST /api/trial-invites/redeem  { code }
 *
 * NOT platform-admin gated: the caller is the invitee. It does require a signed-
 * in session, because redemption binds the trial to a workspace and
 * `provisionWorkspace` uses the Clerk org id AS the workspace id — so no
 * workspace can exist before sign-up. The flow is therefore sign up, then
 * redeem, which is why the accept page sends people to hosted sign-in first.
 *
 * Side effects on success, in order:
 *   1. atomic single-use redeem (invited, unexpired)
 *   2. grant the Pro plan for the trial
 *   3. set workspaces.expires_at to now + trialDays
 *
 * Demo seeding is deliberately NOT done here. The existing
 * POST /api/workspace/demo-reset already seeds a sector pack correctly, and
 * duplicating ~100 lines of that logic to save the client one call would leave
 * two implementations to keep in step. The response returns `demoPack` so the
 * accept page can make that call.
 */

import { createHash } from "crypto";
import { z } from "zod";
import { ok, fail } from "@/lib/api";
import { resolveAuth } from "@/lib/api-auth";
import { repository } from "@/lib/data/repository";

const redeemSchema = z.object({ code: z.string().min(10).max(200) });

/** Pro plan allowance granted for the duration of a trial. */
const TRIAL_PLAN = "pro";
const TRIAL_MONTHLY_TOKENS = 5_000_000;

export async function POST(request: Request) {
  const auth = await resolveAuth(request);
  if (!auth) return fail("unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = redeemSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  const inviteCodeHash = createHash("sha256").update(parsed.data.code).digest("hex");
  const invite = await repository.redeemTrialInvite(inviteCodeHash, auth.userId, auth.workspaceId);

  // One error for unknown, expired, already-redeemed, and revoked. Telling an
  // unauthenticated-ish caller which of those it was turns this endpoint into a
  // code oracle.
  if (!invite) return fail("invite_not_redeemable", 400);

  const expiresAt = new Date(Date.now() + invite.trialDays * 24 * 60 * 60 * 1000);
  await repository.updateWorkspacePlan(auth.workspaceId, TRIAL_PLAN, TRIAL_MONTHLY_TOKENS);
  await repository.setWorkspaceExpiry(auth.workspaceId, expiresAt.toISOString());

  void repository.pushAudit({
    workspaceId: auth.workspaceId,
    type: "trial_invite.redeemed",
    actor: auth.userId,
    payload: {
      inviteId: invite.id,
      invitedBy: invite.invitedBy,
      trialDays: invite.trialDays,
      expiresAt: expiresAt.toISOString(),
    },
  }).catch(() => {});

  return ok({
    invite,
    plan: TRIAL_PLAN,
    trialExpiresAt: expiresAt.toISOString(),
    demoPack: invite.demoPack,
  });
}
