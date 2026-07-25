/**
 * Required-environment validation.
 *
 * There are ~76 distinct `process.env` reads across app/ and lib/, but almost
 * all are optional connector credentials whose services deliberately no-op when
 * unset — CI builds with no secrets at all and relies on that. So this module
 * does NOT try to be a typed accessor for every variable. It validates the
 * small set that a *running* production process cannot function without, and
 * reports all of them at once instead of surfacing them one at a time, deep in
 * whichever request path happens to touch one first.
 *
 * Follows the build-phase guard already used by lib/data/db-policy.ts: the
 * Next production build must succeed without secrets, so validation applies to
 * a running server, not to `next build`.
 */

function isNextBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

type RequiredVar = {
  key: string;
  why: string;
};

/**
 * Variables with no safe default, all provisioned as `sync: false` in
 * render.yaml — i.e. the operator must supply them.
 */
const REQUIRED_IN_PRODUCTION: RequiredVar[] = [
  { key: "DATABASE_URL", why: "Postgres connection; the app runs DB-required in production" },
  { key: "AUTH_SECRET", why: "Signs agent bearer tokens and derives the credential key" },
  { key: "CLERK_SECRET_KEY", why: "Server-side Clerk session verification" },
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", why: "Clerk client configuration" },
  { key: "NEXT_PUBLIC_APP_URL", why: "Absolute URLs for OAuth callbacks, emails and exports" },
  {
    key: "NEXT_PUBLIC_CLERK_DOMAIN",
    // Not just cosmetic. lib/security-headers.ts builds the CSP script-src
    // allowlist from this, defaulting to clerk.accounts.dev. On a production
    // Clerk instance with a custom domain, leaving it unset means the CSP
    // allowlists the wrong host and the browser blocks Clerk's script — auth
    // fails with nothing but a console violation to show for it.
    why: "CSP script-src allowlist for Clerk; a wrong value blocks auth entirely",
  },
];

export type EnvReport = {
  ok: boolean;
  missing: RequiredVar[];
};

/**
 * Which required variables are absent. Empty when the environment is complete,
 * and always empty outside a running production process.
 */
export function checkRequiredEnv(): EnvReport {
  if (process.env.NODE_ENV !== "production" || isNextBuildPhase()) {
    return { ok: true, missing: [] };
  }
  const missing = REQUIRED_IN_PRODUCTION.filter(({ key }) => !process.env[key]?.trim());
  return { ok: missing.length === 0, missing };
}

/** Human-readable summary for logs and the deploy-time check script. */
export function formatEnvReport(report: EnvReport): string {
  if (report.ok) return "[env] all required production variables are set";
  const lines = report.missing.map(({ key, why }) => `  - ${key}: ${why}`);
  return [`[env] ${report.missing.length} required variable(s) missing:`, ...lines].join("\n");
}

/** Throw if the running production environment is incomplete. */
export function assertRequiredEnv(): void {
  const report = checkRequiredEnv();
  if (!report.ok) throw new Error(formatEnvReport(report));
}
