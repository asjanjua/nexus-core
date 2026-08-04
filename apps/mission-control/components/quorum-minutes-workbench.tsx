"use client";

/**
 * Quorum Record arc — minutes draft driven by the governance review engine.
 *
 * Was four hardcoded rows that always read the same way, including
 * "Management action — Owner needed", which looks like a finding about the
 * user's own board rather than a placeholder.
 *
 * BOUNDARY. The engine computes `recordReady`. This screen deliberately does
 * not render it as a verdict, for the same reason the Vantage screens do not
 * render `recommendation`: Quorum must not make a board record final, and a
 * machine "ready" badge beside the minutes would read as exactly that.
 */

import { useState } from "react";
import Link from "next/link";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { SkeletonLines } from "@/components/ui/nexus-primitives";
import {
  buildMinutesRecordItems,
  countMinutesBlockers,
  type DecisionGapLike,
  type GovernanceFindingLike,
} from "@/lib/quorum-minutes-record";

type ReviewResult = {
  governanceFindings: GovernanceFindingLike[];
  decisionGaps: DecisionGapLike[];
  boardPackCaveats: Array<{ refId: string; detail: string; severity: string }>;
  deniedByPassport: number;
  summary: {
    requirements: number;
    covered: number;
    criticalGaps: number;
    decisionGaps: number;
    approvalItems: number;
  };
};

export function QuorumMinutesWorkbench() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReview() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/native-skills/quorum-governance-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reviewId: `minutes-${new Date().toISOString().slice(0, 10)}` }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "review_failed");
      setResult(payload.data as ReviewResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "review_failed");
    } finally {
      setRunning(false);
    }
  }

  const items = result
    ? buildMinutesRecordItems({
        findings: result.governanceFindings,
        decisionGaps: result.decisionGaps,
        approvalItems: result.summary.approvalItems,
      })
    : [];
  const blockers = countMinutesBlockers(items);

  return (
    <div className="space-y-4">
      <section className="panel border-[#C0A062]/30">
        <p className="panel-title text-[#E2C887]">Check the record against governed evidence</p>
        <p className="mt-1 text-xs leading-5 text-white/50">
          Reads the board pack, decisions, and actions already in this workspace. Running this
          records an audit event; it does not make anything official.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary disabled:opacity-40"
            onClick={runReview}
            disabled={running}
          >
            {running ? "Checking the record..." : "Check minutes readiness"}
          </button>
          <Link href="/ingestion" className="btn-subtle text-sm" prefetch={false}>
            Add board pack evidence
          </Link>
        </div>
      </section>

      {running && (
        <section className="panel">
          <SkeletonLines lines={6} />
        </section>
      )}

      {error && (
        <p className="panel text-sm text-nexus-danger">The record check could not run: {error}</p>
      )}

      {result && (
        <>
          <section
            className={`panel ${blockers > 0 ? "border-nexus-danger/30" : "border-nexus-accent/25"}`}
          >
            <p
              className={`panel-title ${blockers > 0 ? "text-nexus-danger" : "text-nexus-accent"}`}
            >
              {blockers > 0
                ? `${blockers} item${blockers === 1 ? "" : "s"} block chair review`
                : "Nothing blocks chair review"}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              {blockers > 0
                ? "Each blocked row needs a record or a written explanation before the chair is asked to review the minutes."
                : "The draft can go to the chair and secretary. That is not the same as being an official record — Quorum cannot approve, sign, file, or finalise minutes."}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/45">
              Board pack: {result.summary.covered} of {result.summary.requirements} requirements
              cited.
              {result.deniedByPassport > 0
                ? ` ${result.deniedByPassport} record${result.deniedByPassport === 1 ? " was" : "s were"} excluded by governance policy; excluded is not absent.`
                : ""}
            </p>
          </section>

          <PilotHandoffWorkbench
            config={{
              product: "Quorum",
              accentClass: "border-[#C0A062]/45 bg-[#C0A062]/15",
              accentTextClass: "text-[#E2C887]",
              activeStep: 3,
              steps: ["Setup", "Pack", "Meeting", "Record"],
              eyebrow: "Board record",
              title: "Minutes become a reviewable record.",
              description:
                "Keep quorum, conflicts, draft resolutions, and management actions together so a named chair and secretary can review the record properly.",
              workbenchTitle: "Minutes and actions",
              items,
              actionTitle: "Route minutes for chair review",
              actionDescription:
                "Create a decision draft so the chair or secretary can review the record against the meeting materials before making it official.",
              actionLabel: "Draft minutes decision",
              decisionTitle: "Request Quorum minutes review",
              decisionRationale:
                "A Quorum minutes draft needs chair or secretary review before it can become an official governance record.",
              boundary:
                "Quorum can prepare governance records but cannot approve, sign, send, file, or make a board record final automatically.",
              inputs: [
                "discussion note",
                "motion",
                "vote or consensus",
                "action owner",
                "chair or secretary",
              ],
            }}
          />

          {result.boardPackCaveats.length > 0 && (
            <section className="panel">
              <p className="panel-title">Caveats carried into the record</p>
              <p className="mt-1 text-xs text-white/45">
                These travel with the minutes. Removing one requires resolving it, not deleting it.
              </p>
              <div className="mt-3 space-y-2">
                {result.boardPackCaveats.slice(0, 8).map((c) => (
                  <div key={c.refId} className="rounded-md bg-black/20 px-3 py-2">
                    <p className="text-xs leading-5 text-white/70">{c.detail}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Link href="/board" className="btn-subtle inline-flex text-sm" prefetch={false}>
            Back to Board Room
          </Link>
        </>
      )}
    </div>
  );
}
