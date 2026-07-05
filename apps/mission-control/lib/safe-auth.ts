/**
 * safeAuth — defensive wrapper around Clerk's auth() for server components.
 *
 * Clerk v6 throws ClerkAuthError when session token verification fails
 * (stale cookie, rotated secret key, clock skew, malformed JWT) rather than
 * returning {userId: null}. Without a catch, this crashes the Server Component
 * render and bubbles to the nearest error boundary.
 *
 * Usage: replace `const { orgId, userId } = await auth()` with
 *        `const { orgId, userId } = await safeAuth()`
 *
 * On failure returns null values so the caller falls through to its
 * unauthenticated branch (middleware will redirect on the next navigation).
 */

import { auth } from "@clerk/nextjs/server";

export type SafeAuthResult = {
  userId: string | null;
  orgId: string | null;
  orgSlug: string | null;
};

export async function safeAuth(): Promise<SafeAuthResult> {
  try {
    const result = await auth();
    return {
      userId: result.userId ?? null,
      orgId: result.orgId ?? null,
      orgSlug: result.orgSlug ?? null,
    };
  } catch {
    return { userId: null, orgId: null, orgSlug: null };
  }
}
