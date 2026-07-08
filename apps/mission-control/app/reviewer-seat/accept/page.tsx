/**
 * Reviewer-seat accept page (reviewer-seat slice 2).
 *
 * Reached from the single-use invite link in the reviewer invite email:
 *   /reviewer-seat/accept?code=<inviteCode>
 *
 * Flow:
 *   1. Require a signed-in Clerk user (the seat binds to THIS identity).
 *   2. POST the code to /api/reviewer-seat/accept.
 *   3. On success the seat is bound to the caller and they become the
 *      workspace's identity-bound reviewer with approval authority.
 */
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { PageShell } from "@/components/page-shell";

type AcceptState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "bound" }
  | { kind: "error"; message: string };

const ERROR_COPY: Record<string, string> = {
  invite_invalid_or_expired:
    "This invite is invalid, already used, or has expired. Ask the workspace admin to send a new one.",
  invalid_request: "This link is missing a valid invite code.",
  unauthorized: "You need to be signed in to accept a reviewer invite.",
};

function AcceptPanel() {
  const code = useSearchParams().get("code") ?? "";
  const [state, setState] = useState<AcceptState>({ kind: "idle" });

  async function accept() {
    if (!code) {
      setState({ kind: "error", message: ERROR_COPY.invalid_request });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/reviewer-seat/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code }),
      });
      if (res.ok) {
        setState({ kind: "bound" });
        return;
      }
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      const key = body?.error ?? "invite_invalid_or_expired";
      setState({ kind: "error", message: ERROR_COPY[key] ?? "Could not accept this invite." });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  const card =
    "rounded-lg border border-white/10 bg-white/[0.035] px-4 py-5 sm:px-5";

  return (
    <div className={card}>
      {!code ? (
        <p className="text-sm leading-6 text-white/60">
          This link is missing an invite code. Open the reviewer invite email again and use the
          full link, or ask the workspace admin to resend it.
        </p>
      ) : (
        <>
          <SignedOut>
            <p className="text-sm leading-6 text-white/70">
              Sign in to bind this reviewer seat to your identity. Approvals you make will be
              recorded against your account.
            </p>
            <div className="mt-4">
              <SignInButton mode="redirect">
                <button className="btn-primary text-sm">Sign in to continue</button>
              </SignInButton>
            </div>
          </SignedOut>

          <SignedIn>
            {state.kind === "bound" ? (
              <div>
                <p className="text-sm font-medium text-white">You are now the bound reviewer.</p>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  This seat is tied to your account. You hold approval authority for this
                  workspace&apos;s pilot recommendations.
                </p>
                <a href="/" className="btn-primary mt-4 inline-flex text-sm">
                  Go to Mission Control
                </a>
              </div>
            ) : (
              <div>
                <p className="text-sm leading-6 text-white/70">
                  Accepting will bind this reviewer seat to your account and give you approval
                  authority for this workspace.
                </p>
                {state.kind === "error" ? (
                  <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                    {state.message}
                  </p>
                ) : null}
                <button
                  className="btn-primary mt-4 text-sm disabled:opacity-60"
                  onClick={accept}
                  disabled={state.kind === "submitting"}
                >
                  {state.kind === "submitting" ? "Accepting…" : "Accept reviewer invite"}
                </button>
              </div>
            )}
          </SignedIn>
        </>
      )}
    </div>
  );
}

export default function ReviewerSeatAcceptPage() {
  return (
    <PageShell
      title="Accept reviewer invite"
      description="Bind this reviewer seat to your identity. As the named reviewer you hold approval authority for this workspace's pilot recommendations."
    >
      <Suspense fallback={<p className="text-sm text-white/50">Loading invite…</p>}>
        <AcceptPanel />
      </Suspense>
    </PageShell>
  );
}
