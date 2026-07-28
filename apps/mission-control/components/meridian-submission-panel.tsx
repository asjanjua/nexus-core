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
 * Scope is REAL: jurisdiction, regulator, licence and deadline are read from
 * GET /api/meridian/scope. Coverage figures downstream (outstanding
 * requirements, memo sections, caveats) have no engine yet and remain
 * labelled as a worked example, so a demo never implies live supervisory data
 * that does not exist.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MeridianScope } from "@/lib/contracts";
import { GuidedActionCard, SkeletonLines } from "@/components/ui/nexus-primitives";
import {
  guidanceForMeridianScreen,
  meridianJurisdictionPackRequirements,
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
  const [scope, setScope] = useState<MeridianScope | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meridian/scope")
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled || !payload.ok) return;
        setScope(payload.data.scope ?? null);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Whole days until the regulator deadline, or null when none is set. */
  const daysToDeadline = useMemo(() => {
    if (!scope?.deadline) return null;
    const due = new Date(scope.deadline);
    if (Number.isNaN(due.getTime())) return null;
    const ms = due.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 86_400_000));
  }, [scope?.deadline]);

  const arcScreens = useMemo(() => meridianScreensForArc(activeArc), [activeArc]);
  const activeStage = useMemo(
    () => meridianRegulatoryStages.find((s) => s.arc === activeArc),
    [activeArc]
  );

  if (loading) {
    return (
      <section className="panel">
        <SkeletonLines lines={5} />
      </section>
    );
  }

  // Cold start: no scope set. Show what unlocks the room rather than a wall of
  // zeros, which is exactly what a new pilot workspace looks like on day one.
  if (!scope) {
    return (
      <div className="space-y-4">
        <GuidedActionCard
          title="Set the regulatory scope first"
          reason="Meridian needs a jurisdiction, regulator, and licence status before it can select a requirement set. Nothing downstream in the submission arc can be assessed until that is chosen."
          href="/meridian/scope"
          cta="Set regulatory scope"
        />
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Coverage figures have no engine yet. Scope is real; say which is which
          so a regulated buyer is never misled about what is live. */}
      <p className="rounded-lg border border-nexus-sky/25 bg-nexus-sky/5 px-3 py-2 text-xs leading-5 text-nexus-sky">
        Scope below is live for this workspace. Coverage, outstanding requirements, and memo
        progress are a worked example until evidence is connected.
      </p>

      {/* KPI strip — max four, each with a semantic colour and a label. */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Completeness</p>
          <p className="mt-2 text-3xl font-bold text-nexus-accent">{pct(EXAMPLE.completeness)}</p>
          <p className="mt-1 text-xs text-white/40">{scope.licenseType} · {scope.jurisdiction}</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Outstanding requirements</p>
          <p className="mt-2 text-3xl font-bold text-nexus-warn">{EXAMPLE.outstanding}</p>
          <p className="mt-1 text-xs text-white/40">blocking pre-submission sign-off</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Regulator deadline</p>
          <p className="mt-2 text-3xl font-bold text-white">{daysToDeadline ?? "—"}{daysToDeadline !== null ? "d" : ""}</p>
          <p className="mt-1 text-xs text-white/40">{scope.regulator}</p>
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
          {arcScreens.map((screen) => {
            const guidance = guidanceForMeridianScreen(screen.id);

            return (
              <div key={screen.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{screen.title}</p>
                  <span className="shrink-0 rounded-md border border-nexus-sky/25 px-2 py-0.5 text-[10px] text-nexus-sky">
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
            );
          })}
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
                A human still submits it to <span className="text-white">{scope.regulator}</span>{" "}
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
      <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="panel">
          <p className="panel-title">Global jurisdiction pack requirements</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            A Meridian pack must be localized before it becomes customer-facing. Pakistan examples
            prove the pattern; they do not become a universal regulatory library.
          </p>
          <div className="mt-3 space-y-2">
            {meridianJurisdictionPackRequirements.map((requirement) => (
              <div key={requirement.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white">{requirement.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{requirement.whyItMatters}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">What Meridian will not do</p>
          <div className="mt-3 space-y-2">
            {meridianRegulatoryBoundaries.map((b) => (
              <div key={b.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white">{b.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{b.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One primary action. */}
      <section className="flex flex-wrap items-center gap-3">
        <Link href="/meridian/evidence-coverage" className="btn-primary px-5 py-3" prefetch={false}>
          Review evidence and gaps
        </Link>
        <Link href="/meridian/filing-pack" className="btn-subtle px-5 py-3" prefetch={false}>
          Open filing-pack review
        </Link>
        <span className="text-xs text-white/40">
          {meridianRegulatoryScreens.length} screens defined across{" "}
          {meridianRegulatoryStages.length} stages in the code registry.
        </span>
      </section>
    </div>
  );
}
