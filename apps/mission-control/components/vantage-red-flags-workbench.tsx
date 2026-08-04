"use client";

/**
 * Vantage Coverage arc, screen 2 — real red flags in the shared workbench.
 *
 * Was four hardcoded illustrative items ("Revenue concentration — Escalate").
 * Now driven by the diligence engine, which derives a red flag from an
 * uncovered critical or high checklist item and carries that item's specific
 * indicator: the thing a human should go and test.
 *
 * TWO BOUNDARIES, both load-bearing.
 *
 * 1. A red flag here means MISSING EVIDENCE, not established risk. "No
 *    safeguarding agreement was found" is not "the target mishandles client
 *    money". The screen says so above the list rather than in a tooltip,
 *    because the whole value of the arc is that separation.
 *
 * 2. The engine computes summary.recommendation ("proceed", "do_not_proceed").
 *    This screen NEVER renders it, matching the existing coverage screen.
 *    Vantage must not mark a deal investable or rejected on an advisor's
 *    behalf; showing a machine verdict beside the evidence would do exactly
 *    that, whatever the caveat next to it said.
 */

import { useState } from "react";
import Link from "next/link";
import {
  PilotHandoffWorkbench,
  type PilotHandoffItem,
} from "@/components/pilot-handoff-workbench";
import { InfoHint, SkeletonLines } from "@/components/ui/nexus-primitives";

type DealType = "fintech_ma" | "generic_ma";
type Severity = "critical" | "high" | "medium" | "low";

type RedFlag = {
  itemId: string;
  category: string;
  severity: Severity;
  requirement: string;
  indicator: string;
  reason: "missing_critical_evidence" | "missing_high_evidence";
};

type ReviewResult = {
  redFlags: RedFlag[];
  deniedByPassport: number;
  summary: { items: number; covered: number; gaps: number; criticalGaps: number; redFlags: number };
};

const DEAL_TYPES: Array<{ value: DealType; label: string }> = [
  { value: "fintech_ma", label: "Fintech M&A" },
  { value: "generic_ma", label: "General M&A" },
];

/** Severity sets urgency. Every flag is a request, never a conclusion. */
function toItem(flag: RedFlag): PilotHandoffItem {
  const tone =
    flag.severity === "critical" ? "blocked" : flag.severity === "high" ? "warning" : "review";
  return {
    label: flag.requirement,
    detail: `${flag.category}. Request or test: ${flag.indicator}`,
    state: flag.severity === "critical" ? "Escalate" : "Request",
    tone,
  };
}

export function VantageRedFlagsWorkbench() {
  const [dealType, setDealType] = useState<DealType>("fintech_ma");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runReview() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/native-skills/vantage-diligence-analysis", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reviewId: `red-flags-${new Date().toISOString().slice(0, 10)}`,
          dealType,
        }),
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

  return (
    <div className="space-y-4">
      <section className="panel border-[#D9834A]/30">
        <p className="panel-title text-[#F1B084]">Run against governed deal evidence</p>
        <p className="mt-1 text-xs leading-5 text-white/50">
          Red flags are derived from the checklist items that have no governed citation. Running
          this records an audit event; it does not save a deal decision.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="label" htmlFor="dealType">
              Deal checklist
            </label>
            <select
              id="dealType"
              className="input"
              value={dealType}
              onChange={(e) => setDealType(e.target.value as DealType)}
            >
              {DEAL_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn-primary disabled:opacity-40"
            onClick={runReview}
            disabled={running}
          >
            {running ? "Reviewing governed evidence..." : "Identify red flags"}
          </button>
          <Link href="/vantage/coverage" className="btn-subtle text-sm" prefetch={false}>
            Back to coverage review
          </Link>
        </div>
      </section>

      {running && (
        <section className="panel">
          <SkeletonLines lines={6} />
        </section>
      )}

      {error && (
        <p className="panel text-sm text-nexus-danger">The red flag review could not run: {error}</p>
      )}

      {result && (
        <>
          <section className="panel border-nexus-warn/30">
            <p className="panel-title text-nexus-warn">What a red flag here means</p>
            <p className="mt-2 text-xs leading-5 text-white/60">
              Each item below is a checklist requirement with no governed citation in this
              workspace. That is missing proof, not established risk. Whether it is material to the
              transaction is a judgement for the named advisor and the committee.
            </p>
            {result.deniedByPassport > 0 && (
              <p className="mt-2 text-xs leading-5 text-nexus-sky">
                {result.deniedByPassport} record{result.deniedByPassport === 1 ? " was" : "s were"}{" "}
                excluded by governance policy and did not contribute. Excluded is not absent.
              </p>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-white/40">Red flags</p>
              <p className="mt-2 text-3xl font-bold text-nexus-warn">{result.summary.redFlags}</p>
              <p className="mt-1 text-xs text-white/40">uncovered critical or high items</p>
            </div>
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-white/40">Critical gaps</p>
              <p className="mt-2 text-3xl font-bold text-nexus-danger">
                {result.summary.criticalGaps}
              </p>
              <p className="mt-1 text-xs text-white/40">need a named owner before IC</p>
            </div>
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-white/40">Checklist cited</p>
              <p className="mt-2 text-3xl font-bold text-[#F1B084]">
                {result.summary.covered}
                <span className="text-base text-white/40"> / {result.summary.items}</span>
              </p>
              <p className="mt-1 text-xs text-white/40">requirements with governed citations</p>
            </div>
          </section>

          {result.redFlags.length === 0 ? (
            <section className="panel border-nexus-accent/25">
              <p className="panel-title text-nexus-accent">No evidence gaps at critical or high</p>
              <p className="mt-2 text-xs leading-5 text-white/60">
                Every critical and high checklist item has a governed citation. That is not a
                finding that the deal is sound. It means nothing on the checklist is missing a
                source for a human to read.
              </p>
              <div className="mt-3">
                <InfoHint text="Coverage measures presence of evidence, not its quality. An advisor still reads the cited sources before forming a view." />
              </div>
            </section>
          ) : (
            <PilotHandoffWorkbench
              config={{
                product: "Vantage",
                accentClass: "border-[#D9834A]/45 bg-[#D9834A]/15",
                accentTextClass: "text-[#F1B084]",
                activeStep: 2,
                steps: ["Deal room", "Coverage", "Red flags", "IC memo"],
                eyebrow: "Diligence judgment",
                title: "Distinguish missing proof from material risk.",
                description:
                  "Use evidence, materiality, mitigation, and named advisor judgment to prepare the question the investment committee must decide.",
                workbenchTitle: "Red flag workbench",
                items: result.redFlags.map(toItem),
                actionTitle: "Frame the IC approval question",
                actionDescription:
                  "Create a human-owned decision draft with evidence, mitigations, and the unresolved point presented to the committee.",
                actionLabel: "Draft IC decision",
                decisionTitle: "Frame Vantage IC approval question",
                decisionRationale:
                  "A Vantage diligence review needs an investment-committee question that is grounded in cited evidence and named advisor judgment.",
                boundary:
                  "Vantage can organize evidence, surface risk, and draft IC material. It must not mark a deal approved, investable, or rejected on behalf of an advisor or committee.",
                inputs: ["red flag", "materiality", "citation", "mitigation", "advisor judgment"],
              }}
            />
          )}
        </>
      )}

      {!running && !result && !error && (
        <section className="panel">
          <p className="panel-title">What this review produces</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-3">
              <p className="text-xs font-semibold text-nexus-warn">Evidence requests</p>
              <p className="mt-1 text-xs leading-5 text-white/50">
                Each uncovered critical or high item, with the specific thing to request or test.
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold text-white">Named ownership</p>
              <p className="mt-1 text-xs leading-5 text-white/50">
                A handoff that attaches an owner to the unresolved point.
              </p>
            </div>
            <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 p-3">
              <p className="text-xs font-semibold text-nexus-danger">No investment call</p>
              <p className="mt-1 text-xs leading-5 text-white/50">
                Vantage does not say whether to proceed. The advisor and committee decide.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
