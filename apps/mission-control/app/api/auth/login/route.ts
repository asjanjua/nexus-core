/**
 * Legacy POST /api/auth/login — returns 410 Gone.
 * Authentication is now handled by Clerk. Clients should use /sign-in.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "deprecated",
      message: "Custom session auth is replaced by Clerk. Use /sign-in to authenticate.",
    },
    { status: 410 }
  );
}
