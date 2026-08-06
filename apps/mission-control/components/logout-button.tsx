/**
 * LogoutButton — lightweight fallback while Clerk client widgets are disabled.
 * Kept for backwards compatibility with any existing references without
 * importing Clerk's client package into the production build graph.
 *
 * The sign-in link points to Clerk's hosted auth page (external domain).
 * Using <Link> would break the external redirect — the warning is suppressed.
 */
export function LogoutButton({ label = "Account", className = "btn-subtle" }: { label?: string; className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/sign-in" className={className}>
        {label}
      </a>
    </>
  );
}
