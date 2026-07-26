/**
 * Trial invite redeem page.
 *
 * Reached from the single-use link in a Pinavia trial invite:
 *   /invite/accept?code=<inviteCode>
 *
 * Flow:
 *   1. Require a signed-in user. `provisionWorkspace` uses the Clerk org id AS
 *      the workspace id, so there is no workspace to attach a trial to until the
 *      invitee has signed up. Sign-up genuinely has to come first.
 *   2. POST the code to /api/trial-invites/redeem, which grants the plan and
 *      sets the trial deadline.
 *   3. If the invite carried a demo pack, seed it through the existing
 *      /api/workspace/demo-reset endpoint so there is material on screen.
 *
 * Fetch-only client page with a plain /sign-in link, per the production build
 * constraints in CLAUDE.md (no Clerk client components in bundles).
 */
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";

type RedeemState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "done"; trialExpiresAt: string; seeded: boolean }
  | { kind: "error"; message: string };

const ERROR_COPY: Record<string, string> = {
  invite_not_redeemable:
    "This invite is invalid, already used, or has expired. Ask your Pinavia contact for a new link.",
  invalid_request: "This link is missing a valid invite code.",
  unauthorized: "Create your account or sign in first, then return to this link.",
};

function RedeemPanel() {
  const code = useSearchParams().get("code") ?? "";
  const [state, setState] = useState<RedeemState>({ kind: "idle" });

  async function redeem() {
    if (!code) {
      setState({ kind: "error", message: ERROR_COPY.invalid_request });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/trial-invites/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; trialExpiresAt?: string; demoPack?: string | null }
        | null;

      if (!res.ok) {
        const key = body?.error ?? "invite_not_redeemable";
        setState({ kind: "error", message: ERROR_COPY[key] ?? "Could not redeem this invite." });
        return;
      }

      // Seeding is best-effort: the trial is already live at this point, so a
      // seeding failure must not present as a failed redemption.
      let seeded = false;
      if (body?.demoPack) {
        seeded = await fetch("/api/workspace/demo-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sector: body.demoPack }),
        })
          .then((r) => r.ok)
          .catch(() => false);
      }

      setState({ kind: "done", trialExpiresAt: body?.trialExpiresAt ?? "", seeded });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  }

  const card = "rounded-lg border border-white/10 bg-white/[0.035] px-4 py-5 sm:px-5";

  if (!code) {
    return (
      <div className={card}>
        <p className="text-sm leading-6 text-white/60">
          This link is missing an invite code. Open the invite again and use the full link, or ask
          your Pinavia contact to reissue it.
        </p>
      </div>
    );
  }

  if (state.kind === "done") {
    const ends = state.trialExpiresAt
      ? new Date(state.trialExpiresAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;
    return (
      <div className={card}>
        <p className="text-sm font-medium text-white">Your trial workspace is ready.</p>
        <p className="mt-2 text-sm leading-6 text-white/60">
          {ends ? `Full access until ${ends}. ` : ""}
          At the end of the trial the workspace is suspended rather than deleted, so nothing you put
          in is lost if you want more time.
        </p>
        {state.seeded ? (
          <p className="mt-2 text-sm leading-6 text-white/60">
            Sample material has been loaded so there is something to look at immediately.
          </p>
        ) : null}
        <a href="/dashboard" className="btn-primary mt-4 inline-flex text-sm">
          Open Mission Control
        </a>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className="text-sm leading-6 text-white/70">
        Create your account or sign in first, then start the trial. No payment details are requested
        and nothing bills.
      </p>
      {state.kind === "error" ? (
        <p className="mt-3 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
          {state.message}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn-primary text-sm disabled:opacity-60"
          onClick={redeem}
          disabled={state.kind === "submitting"}
        >
          {state.kind === "submitting" ? "Starting…" : "Start my trial"}
        </button>
        <a href="/sign-in" className="btn-subtle text-sm">
          Sign in
        </a>
      </div>
    </div>
  );
}

export default function TrialInviteAcceptPage() {
  return (
    <PageShell
      title="Start your Pinavia trial"
      description="Redeem your invite to open a private trial workspace. Nothing is shared with other organisations."
    >
      <Suspense fallback={<p className="text-sm text-white/50">Loading invite…</p>}>
        <RedeemPanel />
      </Suspense>
    </PageShell>
  );
}
