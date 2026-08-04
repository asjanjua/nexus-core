/**
 * LogoutButton — lightweight fallback while Clerk client widgets are disabled.
 * Kept for backwards compatibility with any existing references without
 * importing Clerk's client package into the production build graph.
 */

export function LogoutButton({ label = "Account", className = "btn-subtle" }: { label?: string; className?: string }) {
  return (
    <a href="/sign-in" className={className}>
      {label}
    </a>
  );
}
