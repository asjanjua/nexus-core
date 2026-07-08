/**
 * After a Clerk organization switch, backend API routes can keep honoring the
 * previous org until the session token is refreshed (observed 2026-07-08,
 * documented in docs/RELEASE_GATE_2026-07-07.md section 10). Clerk's cookie
 * refresh poller runs on a ~50s interval, so requests fired right after a
 * switch may carry the old org claim.
 *
 * This component forces an immediate `session.touch()` (fresh token for the
 * new active org) followed by `router.refresh()` (re-runs server components
 * with the new claims) whenever the active orgId changes in-session.
 *
 * Temporarily disabled from the app layout because Clerk's client package is
 * the current local `next build` hang trigger. Server-side auth and route
 * checks remain active; when Clerk UI is reintroduced, this can regain its
 * client implementation.
 */
export function OrgSessionSync() {
  return null;
}
