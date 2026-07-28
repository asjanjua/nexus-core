"use client";

/**
 * Nucleus Engagement Room — launch-grade route entry.
 *
 * Nucleus is the white-label methodology platform. The core trust layer stays
 * fixed while a partner firm's client-facing brand can change. This route
 * demonstrates that boundary explicitly instead of presenting white-label as
 * a vague re-skin.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  guidanceForNucleusScreen,
  nucleusEngagementArcLabels,
  nucleusEngagementBoundaries,
  nucleusEngagementScreens,
  nucleusEngagementStages,
  nucleusScreensForArc,
  nucleusWhiteLabelRequirements,
  type NucleusEngagementArc,
} from "@/lib/nucleus-engagement-workflow";

const ARC_ORDER: NucleusEngagementArc[] = ["profile", "package", "delivery", "assurance"];

const ARC_SHORT: Record<NucleusEngagementArc, string> = {
  profile: "Profile",
  package: "Package",
  delivery: "Delivery",
  assurance: "Assurance",
};

const OVERRIDABLE = ["Logo", "Brand accent", "Typeface", "Client-facing product name", "Practice terminology"];
const FIXED = [
  "Status colours",
  "AI provenance",
  "Approval boundaries",
  "Evidence citations",
  "Audit labels",
  "Consequence previews",
];

export function NucleusEngagementPanel() {
  const [activeArc, setActiveArc] = useState<NucleusEngagementArc>("profile");

  const arcScreens = useMemo(() => nucleusScreensForArc(activeArc), [activeArc]);
  const activeStage = useMemo(
    () => nucleusEngagementStages.find((stage) => stage.arc === activeArc),
    [activeArc]
  );

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-[#9AA6B8]/30 bg-[#9AA6B8]/10 px-3 py-2 text-xs leading-5 text-[#C8D1DE]">
        Launch route. Nucleus now has a dedicated engagement workflow registry and a protected route
        entry; figures and partner names are illustrative until a consulting partner workspace is connected.
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Method packs</p>
          <p className="mt-2 text-3xl font-bold text-[#C8D1DE]">4</p>
          <p className="mt-1 text-xs text-white/40">readiness, compliance, diligence, operating model</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Partner reviewers</p>
          <p className="mt-2 text-3xl font-bold text-nexus-accent">6</p>
          <p className="mt-1 text-xs text-white/40">named humans before client output</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Brand overrides</p>
          <p className="mt-2 text-3xl font-bold text-[#9AA6B8]">5</p>
          <p className="mt-1 text-xs text-white/40">restricted to the brand layer</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Fixed trust controls</p>
          <p className="mt-2 text-3xl font-bold text-nexus-sky">6</p>
          <p className="mt-1 text-xs text-white/40">cannot be re-skinned away</p>
        </div>
      </section>

      <section className="panel">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/40">Now</p>
            <p className="mt-1 text-sm font-medium text-white">
              {activeStage?.title ?? "Define the firm operating model"}
            </p>
            <p className="mt-1 text-xs leading-5 text-white/45">{activeStage?.userOutcome}</p>
          </div>
          <div className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/10 p-3">
            <p className="text-xs uppercase tracking-wide text-nexus-accent">White-label contract</p>
            <p className="mt-1 text-xs leading-5 text-emerald-100/80">
              Partners can make the platform feel like their firm. They cannot change the meaning of
              approved, blocked, AI-drafted, stale, missing, or human-reviewed.
            </p>
          </div>
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Brand layer versus trust layer</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-[#9AA6B8]/30 bg-[#9AA6B8]/10 p-4">
            <p className="text-xs uppercase tracking-wide text-[#C8D1DE]">Overridable</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {OVERRIDABLE.map((item) => (
                <span key={item} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/65">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-4">
            <p className="text-xs uppercase tracking-wide text-nexus-warn">Contractually fixed</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {FIXED.map((item) => (
                <span key={item} className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs text-white/65">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <p className="panel-title">Engagement arc</p>
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
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9AA6B8]",
                    active
                      ? "border-[#9AA6B8]/50 bg-[#9AA6B8]/15 text-white"
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
        <p className="mt-3 text-xs leading-5 text-white/45">{nucleusEngagementArcLabels[activeArc]}</p>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {arcScreens.map((screen) => {
            const guidance = guidanceForNucleusScreen(screen.id);
            return (
              <div key={screen.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{screen.title}</p>
                  <span className="shrink-0 rounded-md border border-[#9AA6B8]/25 px-2 py-0.5 text-[10px] text-[#C8D1DE]">
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
                  {screen.engagementObjects.map((obj) => (
                    <span key={obj} className="rounded bg-[#9AA6B8]/10 px-1.5 py-0.5 text-[10px] text-[#C8D1DE]">
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
          <p className="panel-title">White-label launch requirements</p>
          <div className="mt-3 space-y-2">
            {nucleusWhiteLabelRequirements.map((requirement) => (
              <div key={requirement.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white">{requirement.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{requirement.whyItMatters}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <p className="panel-title">What Nucleus will not do</p>
          <div className="mt-3 space-y-2">
            {nucleusEngagementBoundaries.map((boundary) => (
              <div key={boundary.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-xs font-semibold text-white">{boundary.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{boundary.rule}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <Link href="/nucleus/profile" className="btn-primary px-5 py-3" prefetch={false}>
          Set firm brand
        </Link>
        <Link href="/nucleus/reviewer-console" className="btn-subtle px-5 py-3" prefetch={false}>
          Open reviewer console
        </Link>
        <span className="text-xs text-white/40">
          {nucleusEngagementScreens.length} screens defined across {nucleusEngagementStages.length} stages in the Nucleus registry.
        </span>
      </section>
    </div>
  );
}
