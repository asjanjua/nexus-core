import { createHash, randomBytes } from "crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";
import { isPlatformAdmin, platformAdminConfigured } from "@/lib/platform-admin";

function makeCode() {
  const inviteCode = randomBytes(24).toString("base64url");
  return { inviteCode, inviteCodeHash: createHash("sha256").update(inviteCode).digest("hex") };
}

let seq = 0;
async function createInvite(overrides: { expiresAt?: Date; trialDays?: number } = {}) {
  const { inviteCodeHash } = makeCode();
  const invite = await repository.createTrialInvite({
    id: `ti_test_${Date.now()}_${seq++}`,
    email: `prospect${seq}@example.com`,
    name: "Prospect Person",
    company: "Example Bank",
    demoPack: "financial_services",
    inviteCodeHash,
    invitedBy: "user_pinavia_staff",
    trialDays: overrides.trialDays ?? 30,
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 86_400_000),
  });
  return { invite, inviteCodeHash };
}

describe("trial invite lifecycle (migration 0038)", () => {
  it("creates an invited record without exposing the code hash", async () => {
    const { invite } = await createInvite();
    expect(invite.status).toBe("invited");
    expect(invite.redeemedBy).toBeNull();
    expect(invite.redeemedWorkspaceId).toBeNull();
    expect(invite).not.toHaveProperty("inviteCodeHash");
  });

  it("redeems once and binds the redeeming user and workspace", async () => {
    const { invite, inviteCodeHash } = await createInvite();
    const redeemed = await repository.redeemTrialInvite(inviteCodeHash, "user_abc", "org_xyz");
    expect(redeemed?.id).toBe(invite.id);
    expect(redeemed?.status).toBe("redeemed");
    expect(redeemed?.redeemedBy).toBe("user_abc");
    expect(redeemed?.redeemedWorkspaceId).toBe("org_xyz");
  });

  it("refuses a second redemption of the same code", async () => {
    const { inviteCodeHash } = await createInvite();
    const first = await repository.redeemTrialInvite(inviteCodeHash, "user_first", "org_first");
    expect(first).not.toBeNull();

    const second = await repository.redeemTrialInvite(inviteCodeHash, "user_second", "org_second");
    expect(second).toBeNull();
  });

  it("refuses an expired invite", async () => {
    const { inviteCodeHash } = await createInvite({ expiresAt: new Date(Date.now() - 1000) });
    expect(await repository.redeemTrialInvite(inviteCodeHash, "user_late", "org_late")).toBeNull();
  });

  it("refuses an unknown code", async () => {
    const { inviteCodeHash } = makeCode();
    expect(await repository.redeemTrialInvite(inviteCodeHash, "user_x", "org_x")).toBeNull();
  });

  it("refuses a revoked invite", async () => {
    const { invite, inviteCodeHash } = await createInvite();
    const revoked = await repository.revokeTrialInvite(invite.id);
    expect(revoked?.status).toBe("revoked");
    expect(await repository.redeemTrialInvite(inviteCodeHash, "user_y", "org_y")).toBeNull();
  });

  it("does not revoke twice", async () => {
    const { invite } = await createInvite();
    expect(await repository.revokeTrialInvite(invite.id)).not.toBeNull();
    expect(await repository.revokeTrialInvite(invite.id)).toBeNull();
  });

  it("preserves per-invite trial length", async () => {
    const { invite } = await createInvite({ trialDays: 14 });
    expect(invite.trialDays).toBe(14);
  });
});

describe("platform admin gate", () => {
  const original = process.env.PINAVIA_ADMIN_PRINCIPALS;

  beforeEach(() => {
    delete process.env.PINAVIA_ADMIN_PRINCIPALS;
  });

  afterEach(() => {
    if (original === undefined) delete process.env.PINAVIA_ADMIN_PRINCIPALS;
    else process.env.PINAVIA_ADMIN_PRINCIPALS = original;
  });

  it("fails closed when unconfigured", () => {
    expect(platformAdminConfigured()).toBe(false);
    expect(isPlatformAdmin({ workspaceId: "org_anything", userId: "user_anything" })).toBe(false);
  });

  it("admits a listed org id", () => {
    process.env.PINAVIA_ADMIN_PRINCIPALS = "org_pinavia";
    expect(isPlatformAdmin({ workspaceId: "org_pinavia", userId: "user_someone" })).toBe(true);
  });

  it("admits a listed user id for a staff member with no active org", () => {
    process.env.PINAVIA_ADMIN_PRINCIPALS = "user_ali";
    expect(isPlatformAdmin({ workspaceId: "user_ali", userId: "user_ali" })).toBe(true);
  });

  it("rejects a customer org admin who is not listed", () => {
    process.env.PINAVIA_ADMIN_PRINCIPALS = "org_pinavia";
    expect(isPlatformAdmin({ workspaceId: "org_customer", userId: "user_customer" })).toBe(false);
  });

  it("tolerates whitespace and multiple principals", () => {
    process.env.PINAVIA_ADMIN_PRINCIPALS = " org_pinavia , user_ali ";
    expect(isPlatformAdmin({ workspaceId: "org_pinavia", userId: "user_x" })).toBe(true);
    expect(isPlatformAdmin({ workspaceId: "org_other", userId: "user_ali" })).toBe(true);
  });
});
