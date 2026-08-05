import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * safeAuth and requireWorkspaceId had no test, despite gating every
 * authenticated page in the app.
 *
 * Two failure shapes matter here and they pull in opposite directions.
 *
 * safeAuth must NEVER throw: Clerk v6 raises when a session token fails
 * verification (stale cookie, rotated secret, clock skew), and an uncaught
 * throw in a Server Component takes down the render instead of showing the
 * signed-out branch.
 *
 * requireWorkspaceId must NEVER return a fallback: a page that renders real
 * workspace data has to redirect when there is no session. Returning something
 * plausible instead — a demo workspace, an empty string — shows one tenant's
 * shell to an unauthenticated visitor, which is the worse bug by far because
 * it looks like it worked.
 */

const auth = vi.fn();
const redirect = vi.fn((url: string) => {
  // next/navigation's redirect throws to unwind the render. Mirroring that is
  // what makes "does it redirect INSTEAD of returning" testable at all.
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@clerk/nextjs/server", () => ({ auth }));
vi.mock("next/navigation", () => ({ redirect }));

const { safeAuth, requireWorkspaceId } = await import("@/lib/safe-auth");

beforeEach(() => {
  auth.mockReset();
  redirect.mockClear();
});

describe("safeAuth", () => {
  it("passes through a real session", async () => {
    auth.mockResolvedValue({ userId: "u1", orgId: "org1", orgSlug: "acme" });
    await expect(safeAuth()).resolves.toEqual({
      userId: "u1",
      orgId: "org1",
      orgSlug: "acme",
    });
  });

  it("normalises undefined fields to null", async () => {
    // Callers branch on falsiness; mixing undefined and null invites a
    // `=== null` check that silently misses.
    auth.mockResolvedValue({});
    await expect(safeAuth()).resolves.toEqual({ userId: null, orgId: null, orgSlug: null });
  });

  it("returns nulls instead of throwing when verification fails", async () => {
    // The whole reason this wrapper exists. An uncaught throw here crashes the
    // Server Component render rather than showing the signed-out branch.
    auth.mockRejectedValue(new Error("ClerkAuthError: token verification failed"));
    await expect(safeAuth()).resolves.toEqual({ userId: null, orgId: null, orgSlug: null });
  });

  it("survives a non-Error throwable", async () => {
    auth.mockRejectedValue("string failure");
    await expect(safeAuth()).resolves.toEqual({ userId: null, orgId: null, orgSlug: null });
  });
});

describe("requireWorkspaceId", () => {
  it("prefers the org over the user, so members share one workspace", async () => {
    // If it returned userId when an org exists, two colleagues in the same org
    // would land in separate workspaces and see none of each other's evidence.
    auth.mockResolvedValue({ userId: "u1", orgId: "org1", orgSlug: "acme" });
    await expect(requireWorkspaceId("/dashboard")).resolves.toBe("org1");
  });

  it("falls back to the user when there is no org", async () => {
    auth.mockResolvedValue({ userId: "u1", orgId: null, orgSlug: null });
    await expect(requireWorkspaceId("/dashboard")).resolves.toBe("u1");
  });

  it("redirects rather than returning anything when unauthenticated", async () => {
    // Never a demo workspace, never an empty string. Returning something
    // plausible would render a real page to a signed-out visitor.
    auth.mockResolvedValue({ userId: null, orgId: null, orgSlug: null });
    await expect(requireWorkspaceId("/dashboard")).rejects.toThrow(/^REDIRECT:/);
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("redirects when the session token is broken, not just absent", async () => {
    // A rotated secret key must lock people out, not hand them a workspace.
    auth.mockRejectedValue(new Error("ClerkAuthError"));
    await expect(requireWorkspaceId("/meridian")).rejects.toThrow(/^REDIRECT:/);
  });

  it("preserves the path so the user lands where they were going", async () => {
    auth.mockResolvedValue({ userId: null, orgId: null, orgSlug: null });
    await expect(requireWorkspaceId("/meridian/filing-pack")).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith(
      "/sign-in?redirect_url=%2Fmeridian%2Ffiling-pack"
    );
  });

  it("encodes a path carrying a query string", async () => {
    // Unencoded, the second parameter would be parsed as a sibling of
    // redirect_url and silently dropped.
    auth.mockResolvedValue({ userId: null, orgId: null, orgSlug: null });
    await expect(requireWorkspaceId("/settings?checkout=pro")).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith(
      "/sign-in?redirect_url=%2Fsettings%3Fcheckout%3Dpro"
    );
  });
});
