"use client";

/**
 * Approval Consequence Preview — locked signature pattern (see
 * nexus-design-system skill). Before any approval action commits, this
 * overlay states plainly: what unlocks if approved, what stops if rejected,
 * what loops back if the decision is reversible, and whether the action
 * sends anything outside Nexus. Never approve blind.
 *
 * This is a presentational confirm step only — callers own the actual
 * mutation (the fetch call) and pass it in as onConfirm. Content props must
 * describe real, verified system behavior (see each call site's comment for
 * what was checked in the API route before writing the copy) — never a
 * plausible-sounding guess about what an action does.
 */

import { useState } from "react";
import { MetaChip, type Tone } from "@/components/ui/nexus-primitives";

export interface ConsequencePreviewProps {
  open: boolean;
  /** "approved" drives accent styling, "rejected" drives danger styling. */
  decision: "approved" | "rejected";
  /** Short label for the thing being decided on, e.g. a filename or title. */
  itemLabel: string;
  /** What happens immediately if this is approved. Must be verified, real behavior. */
  unlocks: string;
  /** What happens immediately if this is rejected. Must be verified, real behavior. */
  stops: string;
  /** Optional: what happens later if conditions change (reversibility). Omit if there is no real loop-back path — do not invent one. */
  loopsBack?: string;
  /** Does this action send data outside Nexus (e.g. an external send, webhook, email)? */
  leavesNexus: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConsequencePreview({
  open,
  decision,
  itemLabel,
  unlocks,
  stops,
  loopsBack,
  leavesNexus,
  onConfirm,
  onCancel,
  busy,
}: ConsequencePreviewProps) {
  if (!open) return null;

  const isApprove = decision === "approved";
  const tone: Tone = isApprove ? "accent" : "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-lg border border-nexus-border bg-nexus-panel p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-nexus-muted">
          Confirm before you commit
        </p>
        <h2 className="mt-1 text-base font-semibold text-nexus-text">
          {isApprove ? "Approve" : "Reject"} &ldquo;{itemLabel}&rdquo;?
        </h2>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-nexus-border bg-nexus-bg/40 p-3">
            <MetaChip label="If approved" tone="accent" />
            <p className="mt-2 text-xs leading-5 text-nexus-muted">{unlocks}</p>
          </div>
          <div className="rounded-lg border border-nexus-border bg-nexus-bg/40 p-3">
            <MetaChip label="If rejected" tone="danger" />
            <p className="mt-2 text-xs leading-5 text-nexus-muted">{stops}</p>
          </div>
          {loopsBack && (
            <div className="rounded-lg border border-nexus-border bg-nexus-bg/40 p-3">
              <MetaChip label="If conditions change" tone="sky" />
              <p className="mt-2 text-xs leading-5 text-nexus-muted">{loopsBack}</p>
            </div>
          )}
          <MetaChip
            label={leavesNexus ? "This action sends data outside Nexus" : "Stays inside Nexus — nothing sent externally"}
            tone={leavesNexus ? "warn" : "accent"}
          />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-white/20 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              isApprove
                ? "rounded-lg bg-nexus-accent px-4 py-1.5 text-xs font-semibold text-[#04100d] transition hover:opacity-90 disabled:opacity-50"
                : "rounded-lg border border-nexus-danger/40 bg-nexus-danger/10 px-4 py-1.5 text-xs font-medium text-nexus-danger transition hover:bg-nexus-danger/20 disabled:opacity-50"
            }
          >
            {busy ? "Processing..." : `Confirm ${isApprove ? "approval" : "rejection"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience hook for the common case: a page that decides on one item at a
 * time and wants to gate its existing decide()/setStatus() call behind a
 * preview. Pass the function that actually performs the mutation as
 * `commit` — it is only invoked after the user confirms.
 */
export function useConsequencePreview<TId extends string>(
  commit: (id: TId, decision: "approved" | "rejected") => Promise<void> | void
) {
  const [pending, setPending] = useState<{ id: TId; decision: "approved" | "rejected" } | null>(null);
  const [busy, setBusy] = useState(false);

  function request(id: TId, decision: "approved" | "rejected") {
    setPending({ id, decision });
  }

  function cancel() {
    if (busy) return;
    setPending(null);
  }

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    try {
      await commit(pending.id, pending.decision);
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return { pending, busy, request, cancel, confirm };
}
