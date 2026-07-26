/**
 * Platform-admin gate for Pinavia staff surfaces.
 *
 * WHY THIS EXISTS SEPARATELY FROM `isOrgAdmin`:
 * `AuthContext.isOrgAdmin` in lib/api-auth.ts means "org:admin within the
 * caller's OWN Clerk org", and it is additionally true for every org-less
 * personal workspace. That is the correct gate for tenant-wide actions inside a
 * customer's workspace, and completely the wrong gate for Pinavia-only surfaces:
 * every customer admin, and every self-signed-up personal user, would pass it.
 *
 * Trial invites hand out product access on Pinavia's behalf, so they need a
 * gate that only Pinavia staff can pass.
 *
 * FAILS CLOSED. With `PINAVIA_ADMIN_PRINCIPALS` unset or empty, nobody is a
 * platform admin and every gated surface returns 403 — including in
 * development. An access-granting endpoint that defaults to open is the kind of
 * mistake that is discovered by someone else.
 */

/**
 * Comma-separated Clerk principals allowed to administer Pinavia surfaces.
 * Accepts org ids (`org_...`) and user ids (`user_...`) in the same list, so a
 * staff member operating without an active org is still covered.
 */
const ENV_KEY = "PINAVIA_ADMIN_PRINCIPALS";

function allowedPrincipals(): Set<string> {
  const raw = process.env[ENV_KEY]?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );
}

/**
 * True when the caller is Pinavia staff.
 *
 * Both identifiers are checked because `resolveAuth` collapses org and personal
 * workspaces into one field: `workspaceId` is the Clerk org id when the caller
 * has an active org, and their user id otherwise. Clerk's `org_` / `user_`
 * prefixes keep the two id spaces disjoint, so checking both cannot produce a
 * cross-space match.
 */
export function isPlatformAdmin(auth: { workspaceId: string; userId: string }): boolean {
  const allowed = allowedPrincipals();
  if (allowed.size === 0) return false;
  return allowed.has(auth.workspaceId) || allowed.has(auth.userId);
}

/**
 * Whether the gate is configured at all. Used by the admin portal to explain a
 * blanket 403 to a Pinavia operator rather than leaving them guessing, and to
 * keep "misconfigured" distinguishable from "not authorised" in diagnostics.
 */
export function platformAdminConfigured(): boolean {
  return allowedPrincipals().size > 0;
}
