"use client";

/**
 * LogoutButton — thin wrapper around Clerk's SignOutButton.
 * Kept for backwards compatibility with any existing references.
 * New code should use <UserButton afterSignOutUrl="/sign-in" /> directly.
 */
import { SignOutButton } from "@clerk/nextjs";

export function LogoutButton() {
  return (
    <SignOutButton redirectUrl="/sign-in">
      <button className="btn-subtle">Sign out</button>
    </SignOutButton>
  );
}
