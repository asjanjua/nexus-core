"use client";

/**
 * Meridian Submission Room — the product hub.
 *
 * Rendered entirely from `lib/meridian-regulatory-workflow.ts`, which is the
 * source of truth for arcs, screens, stages, and boundaries. Nothing here
 * invents regulatory content: if a screen or stage needs to change, change
 * the registry and this follows.
 *
 * VOCABULARY (locked cross-product map — do not mix columns):
 *   Hub = Submission Room · Work unit = Application · Output = Filing
 *   Gate = Pre-submission sign-off · Blocker = Outstanding requirement
 *   Evidence = Regulations, circulars, forms
 *
 * HARD BOUNDARY, and the reason this screen exists:
 * Meridian prepares, checks, maps, and packages. It does NOT file, submit,
 * certify, or sign. A filing leaves the system and goes to a named regulator
 * through a named channel — the strongest consequence state in the family —
 * so the boundary is stated on the hub itself, not buried in a policy page.
 *
 * Data is illustrative on this build: the registry defines the workflow, but
 * no Meridian API exists yet. Every number below is labelled as a worked
 * example so a demo never implies live regulatory data.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  meridianRegulatoryArcLabels,
  meridianRegulatoryBoundaries,
  meridianRegulatoryScreens,
  meridianRegulatoryStages,
  meridianScreensForArc,
  type MeridianRegulatoryArc,
} from "@/lib/meridian-regulatory-workflow";

const ARC_ORDER: MeridianRegulatoryArc[] = ["scope", "evidence", "gap", "filing"];

const ARC_SHORT: Record<MeridianRegulatoryArc, string> = {
  scope: "Scope",
  evidence: "Evidence",
  gap: "Gap",
  filing: "Filing",
};

/**
 * Worked-example figures for the hub KPI strip. Clearly marked as an example
 * in the UI. Replace with a real GET /api/meridian/summary when it exists.
 */
const EXAMPLE = {
  application: "EMI licence variation · Qasr Pay",
  regulator: "State Bank of Pakistan",
  completeness: 0.72,
  outstanding: 12,
  daysToDeadline: 18,
  sectionsDrafted: 6,
  sectionsTotal: 9,
  caveatsOpen: 3,
};

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export function MeridianSubmissionPanel() {
  const [activeArc, setActiveArc] = useState<MeridianRegulatoryArc>("scope");

  const arcScreens = useMemo(() => meridianScreensForArc(activeArc), [activeArc]);
  const activeStage = useMemo(
    () => meridianRegulatoryStages.find((s) => s.arc === activeArc),
    [activeArc]
  );

  return (
    <div className="space-y-4">
      {/* Demo-data honesty. A regulated buyer must never mistake a worked
          example for live supervisory data. */}
      <p className="rounded-lg border border-nexus-sky/25 bg-nexus-sky/5 px-3 py-2 text-xs leading-5 text-nexus-sky">
        Worked example. The workflow, requirement arcs, and boundaries below are real and
        code-backed; the application figures are illustrative until a workspace is connected.
      </p>

      {/* KPI strip — max four, each with a semantic colour and a label. */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Completeness</p>
          <p className="mt-2 text-3xl font-bold text-nexus-accent">{pct(EXAMPLE.completeness)}</p>
          <p className="mt-1 text-xs text-white/40">{EXAMPLE.application}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Outstanding requirements</p>
          <p className="mt-2 text-3xl font-bold text-nexus-warn">{EXAMPLE.outstanding}</p>
          <p className="mt-1 text-xs text-white/40">blocking pre-submission sign-off</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Regulator deadline</p>
          <p className="mt-2 text-3xl font-bold text-white">{EXAMPLE.daysToDeadline}d</p>
          <p className="mt-1 text-xs text-white/40">{EXAMPLE.regulator}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Memo sections drafted</p>
          <p className="mt-2 text-3xl font-bold text-nexus-sky">
            {EXAMPLE.sectionsDrafted}
            <span className="text-lg text-white/30">/{EXAMPLE.sectionsTotal}</span>
          </p>
          <p className="mt-1 text-xs text-white/40">{EXAMPLE.caveatsOpen} caveats open</p>
        </div>
      </section>

      {/* Now / Next strip — current stage, next gate, owner. */}
      <section className="panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Now</p>
            <p className="mt-1 text-sm font-medium text-white">
              {activeStage?.title ?? "Set the regulatory scope"}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/45">{activeStage?.userOutcome}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Next gate</p>
            <p className="mt-1 text-sm font-medium text-nexus-warn">Pre-submission sign-off</p>
            <p className="mt-1 text-xs leading-5 text-white/45">
              Requires a qualified reviewer. Cannot be cleared by the system.
            </p>
          </div>
        </div>
      </section>

      {/* Arc stepper — numbered, in workflow order. Sequence is the teaching
          mechanism, so this is a stepper and not a link list. */}
      <section className="panel">
        <p className="panel-title">Submission arc</p>
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
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent",
                    active
                      ? "border-nexus-accent/40 bg-nexus-accent/10 text-white"
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
        <p className="mt-3 text-xs leading-5 text-white/45">
          {meridianRegulatoryArcLabels[activeArc]}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {arcScreens.map((screen) => (
            <div key={screen.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-white">{screen.title}</p>
                <span className="shrink-0 rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/40">
                  planned
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-white/50">{screen.purpose}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {screen.regulatoryObjects.map((obj) => (
                  <span
                    key={obj}
                    className="rounded bg-nexus-sky/10 px-1.5 py-0.5 text-[10px] text-nexus-sky/90"
                  >
                    {obj}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-white/30">
                {screen.primaryUser} · {screen.routeCandidate}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence / Trust area — clause-level citation, never a filename. */}
      <section className="panel">
        <p className="panel-title">Requirement evidence</p>
        <p className="mt-1 text-xs text-white/45">
          Every requirement cites its clause, not a document name. That is what a supervisor asks
          for.
        </p>
        <div className="mt-3 space-y-2">
          {[
            ["SBP EMI Regulations 2019, Reg 5", "Fit and proper — directors", "matched", "accent"],
            ["SBP EMI Regulations 2019, Reg 12", "Safeguarding of customer funds", "matched", "accent"],
            ["SBP AML/CFT Regulations, Reg 7", "Ongoing due diligence", "stale · 14 months", "warn"],
            ["SECP Companies Act 2017, s.208", "Related party transactions", "missing", "danger"],
          ].map(([clause, label, state, tone]) => (
            <div
              key={clause as string}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-nexus-sky">{clause}</p>
                <p className="truncate text-[11px] text-white/40">{label}</p>
              </div>
              <span
                className={[
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  tone === "accent"
                    ? "bg-nexus-accent/15 text-nexus-accent"
                    : tone === "warn"
                      ? "bg-nexus-warn/15 text-nexus-warn"
                      : "bg-nexus-danger/15 text-nexus-danger",
                ].join(" ")}
              >
                {state}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Approval consequence preview — the family's most severe state. */}
      <section className="panel border-nexus-warn/30">
        <p className="panel-title text-nexus-warn">Before the pack leaves Meridian</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-nexus-accent">If signed off</p>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-white/60">
              <li>The pack is marked reviewer-approved and becomes exportable.</li>
              <li>The reviewer is recorded by name against the filing.</li>
              <li>
                A human still submits it to <span className="text-white">{EXAMPLE.regulator}</span>{" "}
                through the regulator&rsquo;s own channel.
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-nexus-warn">If sent back</p>
            <ul className="mt-2 space-y-1 text-xs leading-5 text-white/60">
              <li>Outstanding requirements return to their owners.</li>
              <li>Export stays locked. Nothing leaves the system.</li>
              <li>The caveat register keeps the unresolved items visible.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* The boundaries, verbatim from the registry. */}
      <section className="panel">
        <p className="panel-title">What Meridian will not do</p>
        <div className="mt-3 space-y-2">
          {meridianRegulatoryBoundaries.map((b) => (
            <div key={b.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <p className="text-xs font-semibold text-white">{b.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/50">{b.rule}</p>
            </div>
          ))}
        </div>
      </section>

      {/* One primary action. */}
      <section className="flex flex-wrap items-center gap-3">
        <Link href="/start-pilot" className="btn-primary px-5 py-3" prefetch={false}>
          Resolve {EXAMPLE.outstanding} outstanding requirements
        </Link>
        <span className="text-xs text-white/40">
          {meridianRegulatoryScreens.length} screens defined across{" "}
          {meridianRegulatoryStages.length} stages in the code registry.
        </span>
      </section>
    </div>
  );
}
