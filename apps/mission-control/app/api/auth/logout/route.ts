/**
 * Legacy POST /api/auth/logout — returns 410 Gone.
 * Sign-out is now handled by Clerk's <SignOutButton /> component or
 * the Clerk SDK's signOut() method on the client.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "deprecated",
      message: "Custom session auth is replaced by Clerk. Use Clerk's signOut() to sign out.",
    },
    { status: 410 }
  );
}
