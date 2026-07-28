"use client";

/**
 * Vantage Deal Room — launch-grade route entry.
 *
 * This screen is intentionally honest about its current state: the Vantage
 * domain workflow registry is real, and the first-party diligence analysis
 * skill exists, but the deeper `/vantage/*` route tree is still planned. The
 * hub gives buyers a navigable product posture without claiming that Vantage
 * can approve, reject, or make an investment decision.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  guidanceForVantageScreen,
  vantageDDArcLabels,
  vantageDDBoundaries,
  vantageDDScreens,
  vantageDDStages,
  vantageMarketPackRequirements,
  vantageScreensForArc,
  type VantageDDArc,
} from "@/lib/vantage-dd-workflow";

const ARC_ORDER: VantageDDArc[] = ["dealroom", "coverage", "redflags", "memo"];

const ARC_SHORT: Record<VantageDDArc, string> = {
  dealroom: "Deal room",
  coverage: "Coverage",
  redflags: "Red flags",
  memo: "IC memo",
};

const EXAMPLE = {
  deal: "Fintech acquisition · GCC EMI target",
  checklistCoverage: 0.68,
  criticalGaps: 9,
  redFlags: 4,
  workstreams: 6,
  daysToIc: 12,
  memoSections: 5,
  memoTotal: 8,
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function VantageDealRoomPanel() {
  const [activeArc, setActiveArc] = useState<VantageDDArc>("dealroom");

  const arcScreens = useMemo(() => vantageScreensForArc(activeArc), [activeArc]);
  const activeStage = useMemo(() => vantageDDStages.find((stage) => stage.arc === activeArc), [activeArc]);

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-[#D9834A]/30 bg-[#D9834A]/10 px-3 py-2 text-xs leading-5 text-[#F1B084]">
        Launch route. Workflow arcs, screen contracts, and investment-decision boundaries are code-backed;
        deal figures below are illustrative until a buyer workspace is connected.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Checklist coverage</p>
          <p className="mt-2 text-3xl font-bold text-[#D9834A]">{pct(EXAMPLE.checklistCoverage)}</p>
          <p className="mt-1 text-xs text-white/40">{EXAMPLE.deal}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Critical diligence gaps</p>
          <p className="mt-2 text-3xl font-bold text-nexus-warn">{EXAMPLE.criticalGaps}</p>
          <p className="mt-1 text-xs text-white/40">must be assigned before IC pack</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Red flags</p>
          <p className="mt-2 text-3xl font-bold text-nexus-danger">{EXAMPLE.redFlags}</p>
          <p className="mt-1 text-xs text-white/40">across {EXAMPLE.workstreams} workstreams</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">IC memo sections</p>
          <p className="mt-2 text-3xl font-bold text-nexus-sky">
            {EXAMPLE.memoSections}
            <span className="text-lg text-white/30">/{EXAMPLE.memoTotal}</span>
          </p>
          <p className="mt-1 text-xs text-white/40">{EXAMPLE.daysToIc} days to committee</p>
        </div>
      </section>

      <section className="panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Now</p>
            <p className="mt-1 text-sm font-medium text-white">{activeStage?.title ?? "Open the deal room"}</p>
            <p className="mt-1 text-xs leading-5 text-white/45">{activeStage?.userOutcome}</p>
          </div>
          <div className="rounded-lg border border-nexus-danger/30 bg-nexus-danger/10 p-3">
            <p className="text-xs uppercase tracking-wide text-nexus-danger">Authority boundary</p>
            <p className="mt-1 text-xs leading-5 text-red-100/80">
              Vantage can organize evidence, surface risk, and draft IC material. It cannot approve,
              reject, recommend investment, or replace the investment committee.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Diligence arc</p>
        <ol className="mt-3 flex flex-wrap gap-2">
          {ARC_ORDER.map((arc, i) => {
            const active = arc === activeArc;
            const done = ARC_ORDER.indexOf(activeArc) > i;
            return (
              <li key={arc}>
                <button
                  type="button"
                  onClick={() => setActiveArc(arc)}
                  aria-current={active ? "step" : undefined}
                  className={[
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9834A]",
                    active
                      ? "border-[#D9834A]/50 bg-[#D9834A]/15 text-white"
                      : done
                        ? "border-white/10 text-white/60 hover:text-white"
                        : "border-white/[0.07] text-white/35 hover:text-white/60",
                  ].join(" ")}
                >
                  <span className="text-xs text-white/40">{i + 1}</span>
                  {ARC_SHORT[arc]}
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs leading-5 text-white/45">{vantageDDArcLabels[activeArc]}</p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {arcScreens.map((screen) => {
            const guidance = guidanceForVantageScreen(screen.id);
            return (
              <div key={screen.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{screen.title}</p>
                  <span className="shrink-0 rounded-md border border-[#D9834A]/25 px-2 py-0.5 text-[10px] text-[#F1B084]">
                    planned deep route
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/50">{screen.purpose}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/30">User input</p>
                    <ul className="mt-1 space-y-1 text-[11px] leading-4 text-white/45">
                      {guidance.userInputs.map((input) => (
                        <li key={input}>{input}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-white/30">Action point</p>
                    <ul className="mt-1 space-y-1 text-[11px] leading-4 text-white/45">
                      {guidance.actionPoints.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {screen.dealObjects.map((obj) => (
                    <span key={obj} className="rounded bg-[#D9834A]/10 px-1.5 py-0.5 text-[10px] text-[#F1B084]">
                      {obj}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-white/30">
                  {screen.primaryUser} · {screen.routeCandidate}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="panel">
          <p className="panel-title">Global deal pack requirements</p>
          <div className="mt-3 space-y-2">
            {vantageMarketPackRequirements.map((requirement) => (
              <div key={requirement.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white">{requirement.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{requirement.whyItMatters}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">What Vantage will not do</p>
          <div className="mt-3 space-y-2">
            {vantageDDBoundaries.map((boundary) => (
              <div key={boundary.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white">{boundary.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{boundary.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Link href="/vantage/coverage" className="btn-primary px-5 py-3" prefetch={false}>
          Run coverage review
        </Link>
        <Link href="/vantage/red-flags" className="btn-subtle px-5 py-3" prefetch={false}>
          Review red flags
        </Link>
        <span className="text-xs text-white/40">
          {vantageDDScreens.length} screens defined across {vantageDDStages.length} stages in the Vantage registry.
        </span>
      </section>
    </div>
  );
}
