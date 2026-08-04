"use client";

/**
 * Meridian Evidence arc, screen 3 — pack completeness from real state.
 *
 * Was four hardcoded items that always read the same way ("Caveat register —
 * Blocked"), which is the worst kind of placeholder: it looks like a finding.
 *
 * Every row below is computed from GET /api/meridian/coverage. Where something
 * genuinely cannot be computed it says so rather than inventing a state. The
 * submission memo, for instance, is always Draft, because whether a narrative
 * is adequate is a judgement no amount of data answers.
 *
 * BOUNDARY. "Ready" here means the pack is ready for a qualified reviewer to
 * look at. It never means ready to file. Meridian may prepare and organize;
 * it must not file, submit, certify, or sign.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { PilotHandoffWorkbench } from "@/components/pilot-handoff-workbench";
import { GuidedActionCard, SkeletonLines } from "@/components/ui/nexus-primitives";
import { GENERIC_PACK_NOTICE } from "@/components/meridian-coverage-panel";
import { buildFilingPackItems, countBlockers } from "@/lib/meridian-filing-pack";

type Payload = {
  configured: boolean;
  reason?: "no_scope" | "no_license_type_key";
  licenseType?: string;
  scope?: {
    regulator: string;
    licenseType: string;
    deadline: string | null;
    reviewerName: string | null;
  };
  selection?: { rationale: string; packSource: "dedicated" | "generic" };
  totals?: {
    total: number;
    covered: number;
    coveragePercent: number | null;
    criticalGaps: number;
    evidenceDocuments: number;
    restrictedExcluded: number;
    untypedDocuments: number;
    inferredDocuments: number;
  };
};

export function MeridianFilingPackWorkbench() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/meridian/coverage")
      .then((r) => r.json())
      .then((p) => {
        if (!cancelled && p.ok) setData(p.data as Payload);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="panel">
        <SkeletonLines lines={6} />
      </section>
    );
  }

  if (!data || !data.configured) {
    const needsKey = data?.reason === "no_license_type_key";
    return (
      <div className="space-y-4">
        <GuidedActionCard
          title={needsKey ? "Re-select the licence type" : "Set the regulatory scope first"}
          reason={
            needsKey
              ? `This workspace records "${data?.licenseType}" as free text from before licence types were standardised. Pick it again from the library so the pack can be built against the right requirements.`
              : "A filing pack is assembled against a specific licence. Set the jurisdiction, regulator, and licence before preparing one."
          }
          href="/meridian/scope"
          cta={needsKey ? "Re-select licence" : "Set regulatory scope"}
        />
        <Link href="/meridian" className="btn-subtle inline-flex text-sm" prefetch={false}>
          Back to Submission Room
        </Link>
      </div>
    );
  }

  const items = buildFilingPackItems({
    regulator: data.scope!.regulator,
    licenseType: data.scope!.licenseType,
    reviewerName: data.scope!.reviewerName,
    packSource: data.selection?.packSource ?? "generic",
    totals: data.totals!,
  });
  const blockers = countBlockers(items);

  return (
    <div className="space-y-4">
      {data.selection?.packSource === "generic" && (
        <p className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/5 px-3 py-2 text-xs leading-5 text-nexus-warn">
          {GENERIC_PACK_NOTICE}
        </p>
      )}

      <section className={`panel ${blockers > 0 ? "border-nexus-danger/30" : "border-nexus-accent/25"}`}>
        <p className={`panel-title ${blockers > 0 ? "text-nexus-danger" : "text-nexus-accent"}`}>
          {blockers > 0
            ? `${blockers} item${blockers === 1 ? "" : "s"} block reviewer handoff`
            : "Nothing blocks reviewer handoff"}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/60">
          {blockers > 0
            ? "Each blocked row below needs resolution or a written caveat before a qualified reviewer should be asked to look at this pack."
            : "The pack can be routed to a qualified reviewer. That is not the same as being ready to file — Meridian cannot file, submit, certify, or sign, and the reviewer's judgement comes first."}
        </p>
        {data.scope!.deadline && (
          <p className="mt-2 text-xs leading-5 text-nexus-sky">
            Regulator deadline recorded on the scope: {data.scope!.deadline}.
          </p>
        )}
      </section>

      <PilotHandoffWorkbench
        config={{
          product: "Meridian",
          accentClass: "border-[#3E7BFA]/45 bg-[#3E7BFA]/15",
          accentTextClass: "text-[#8FB5FF]",
          activeStep: 3,
          steps: ["Scope", "Evidence", "Gaps", "Filing"],
          eyebrow: "Reviewer-ready pack",
          title: "A filing pack is prepared, never automatically filed.",
          description:
            "The pack is only ready for reviewer consideration once requirement coverage, caveats, and attestations are visible together.",
          workbenchTitle: "Submission pack completeness",
          items,
          actionTitle: "Route the pack to the qualified reviewer",
          actionDescription:
            "Create a decision draft that names the reviewer and puts caveats before any export or external submission step.",
          actionLabel: "Draft review decision",
          decisionTitle: "Request Meridian filing-pack review",
          decisionRationale:
            "A Meridian filing pack needs qualified human review before it can be exported or used for an external submission.",
          boundary:
            "Meridian may prepare and organize a pack. It must not file, submit, certify, sign, or represent a conclusion to a regulator.",
          inputs: ["memo section", "evidence index", "caveat", "attestation", "qualified reviewer"],
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/meridian/evidence-coverage" className="text-xs text-nexus-sky hover:underline">
          Back: evidence coverage
        </Link>
        <Link href="/meridian/scope" className="text-xs text-nexus-sky hover:underline">
          Edit regulatory scope
        </Link>
        <Link href="/meridian" className="btn-subtle text-sm" prefetch={false}>
          Back to Submission Room
        </Link>
      </div>
    </div>
  );
}
