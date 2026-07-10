/**
 * LogoutButton — lightweight fallback while Clerk client widgets are disabled.
 * Kept for backwards compatibility with any existing references without
 * importing Clerk's client package into the production build graph.
 */

export function LogoutButton() {
  return (
    <a href="/sign-in" className="btn-subtle">
      Account
    </a>
  );
}
