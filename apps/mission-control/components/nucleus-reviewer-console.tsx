"use client";

/**
 * Nucleus Delivery arc — reviewer console driven by real integrity and seat
 * state.
 *
 * Was four hardcoded rows including "Commercial data — Request", which named a
 * missing client interview that did not exist. A fabricated blocker is the
 * worst placeholder of all: a partner would go looking for it.
 *
 * Pulls two sources, because the two questions are independent: is the
 * evidence citable (document integrity), and is there a partner who will put
 * their name on it (reviewer seat).
 */

import { useState } from "react";
import Link from "next/link";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { SkeletonLines } from "@/components/ui/nexus-primitives";
import {
  buildReviewerConsoleItems,
  countReviewBlockers,
  type IntegritySummary,
} from "@/lib/nucleus-review-readiness";

type IntegrityResult = {
  missingSourceSpans: string[];
  repairRecommendations: Array<{ evidenceId: string; recommendation: string }>;
  summary: IntegritySummary;
};

export function NucleusReviewerConsole() {
  const [running, setRunning] = useState(false);
  const [integrity, setIntegrity] = useState<IntegrityResult | null>(null);
  const [reviewerName, setReviewerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCheck() {
    setRunning(true);
    setError(null);
    try {
      const [integrityRes, seatRes] = await Promise.all([
        fetch("/api/agents/native-skills/document-integrity-review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reviewId: `nucleus-${new Date().toISOString().slice(0, 10)}` }),
        }),
        fetch("/api/reviewer-seat"),
      ]);

      const integrityPayload = await integrityRes.json();
      if (!integrityRes.ok || !integrityPayload.ok) {
        throw new Error(integrityPayload.error ?? "integrity_check_failed");
      }
      setIntegrity(integrityPayload.data as IntegrityResult);

      // A missing seat is a legitimate state, not an error, so a failed seat
      // lookup must not read the same as "no partner has accepted".
      const seatPayload = await seatRes.json().catch(() => null);
      setReviewerName(
        seatRes.ok && seatPayload?.ok ? (seatPayload.data.acceptedSeat?.name ?? null) : null
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "check_failed");
    } finally {
      setRunning(false);
    }
  }

  const items = integrity
    ? buildReviewerConsoleItems({
        integrity: integrity.summary,
        missingSourceSpanCount: integrity.missingSourceSpans.length,
        reviewerName,
      })
    : [];
  const blockers = countReviewBlockers(items);

  return (
    <div className="space-y-4">
      <section className="panel border-[#9AA6B8]/30">
        <p className="panel-title text-[#C8D1DE]">Check what a client would be shown</p>
        <p className="mt-1 text-xs leading-5 text-white/50">
          Reads document integrity and the reviewer seat for this workspace. Running this changes
          nothing a client can see.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-primary disabled:opacity-40"
            onClick={runCheck}
            disabled={running}
          >
            {running ? "Checking deliverable readiness..." : "Check review readiness"}
          </button>
          <Link href="/reviewer-seat" className="btn-subtle text-sm" prefetch={false}>
            Manage reviewer seat
          </Link>
        </div>
      </section>

      {running && (
        <section className="panel">
          <SkeletonLines lines={6} />
        </section>
      )}

      {error && (
        <p className="panel text-sm text-nexus-danger">The readiness check could not run: {error}</p>
      )}

      {integrity && (
        <>
          <section
            className={`panel ${blockers > 0 ? "border-nexus-danger/30" : "border-nexus-accent/25"}`}
          >
            <p className={`panel-title ${blockers > 0 ? "text-nexus-danger" : "text-nexus-accent"}`}>
              {blockers > 0
                ? `${blockers} item${blockers === 1 ? "" : "s"} block partner review`
                : "Nothing blocks partner review"}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              {blockers > 0
                ? "Each blocked row has to be resolved before a partner is asked to review, and well before anything reaches a client."
                : "The draft can go to the partner. Release to a client additionally requires a named partner and the full disclosure of source coverage, reviewer status, and unresolved caveats."}
            </p>
          </section>

          <PilotHandoffWorkbench
            config={{
              product: "Nucleus",
              accentClass: "border-[#9AA6B8]/45 bg-[#9AA6B8]/15",
              accentTextClass: "text-[#C8D1DE]",
              activeStep: 2,
              steps: ["Profile", "Package", "Delivery", "Assurance"],
              eyebrow: "Controlled client delivery",
              title: "A polished deliverable still shows what needs review.",
              description:
                "A partner can shape the client experience, but provenance, reviewer ownership, caveats, and status semantics remain visible.",
              workbenchTitle: "Partner review queue",
              items,
              actionTitle: "Route the draft for partner review",
              actionDescription:
                "Create a review decision that keeps client-facing caveats, source coverage, and the named partner accountable.",
              actionLabel: "Draft partner decision",
              decisionTitle: "Request Nucleus partner review",
              decisionRationale:
                "A Nucleus client deliverable needs named partner review before a client preview or publication step.",
              boundary:
                "Nucleus can draft and package client work. The advisory firm owns conclusions, approvals, and client-facing advice; fixed trust controls cannot be re-skinned away.",
              inputs: ["draft section", "citation", "partner reviewer", "caveat", "client visibility"],
            }}
          />

          {integrity.repairRecommendations.length > 0 && (
            <section className="panel">
              <p className="panel-title">How to make the appendix citable</p>
              <p className="mt-1 text-xs text-white/45">
                Each of these is a fix to the source document, not to the deliverable.
              </p>
              <div className="mt-3 space-y-2">
                {integrity.repairRecommendations.slice(0, 8).map((r) => (
                  <div key={r.evidenceId} className="rounded-md bg-black/20 px-3 py-2">
                    <p className="text-xs leading-5 text-white/70">{r.recommendation}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Link href="/nucleus" className="btn-subtle inline-flex text-sm" prefetch={false}>
            Back to Engagement Room
          </Link>
        </>
      )}
    </div>
  );
}
