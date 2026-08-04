"use client";

/**
 * Feeds REAL requirement coverage into the shared PilotHandoffWorkbench.
 *
 * The workbench already exists and is used by five vertical screens. Its
 * coverage items were illustrative placeholders ("Capital adequacy statement —
 * Matched"). This wrapper replaces them with the actual gaps computed by
 * GET /api/meridian/coverage from the workspace's licence pack and ingested
 * evidence, without changing the surrounding UI, its step rail, or its
 * decision-handoff action.
 *
 * Keeping the workbench matters: a buyer clicking Meridian, Vantage, and
 * Nucleus should see one product, not three teams' idea of a screen.
 *
 * BOUNDARY, unchanged and restated by the workbench itself: coverage means a
 * document carrying the matching tag exists. It is not a finding that the
 * requirement is satisfied.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PilotHandoffWorkbench,
  type PilotHandoffItem,
} from "@/components/pilot-handoff-workbench";
import { GuidedActionCard, SkeletonLines } from "@/components/ui/nexus-primitives";
import { GENERIC_PACK_NOTICE } from "@/components/meridian-coverage-panel";

type Severity = "critical" | "high" | "medium";
type Row = { itemId: string; requirement: string; severity: Severity; covered: boolean };

type Payload = {
  configured: boolean;
  reason?: "no_scope" | "no_license_type_key";
  licenseType?: string;
  scope?: { regulator: string; licenseType: string };
  selection?: { rationale: string; packSource: "dedicated" | "generic" };
  coverage: Row[];
  gaps: Row[];
  totals?: {
    total: number;
    covered: number;
    coveragePercent: number | null;
    criticalGaps: number;
    evidenceDocuments: number;
    restrictedExcluded: number;
  };
  boundary?: string;
};

const BOUNDARY_FALLBACK =
  "Coverage means a document carrying the matching evidence tag exists. It is not a " +
  "finding that the requirement is satisfied; a qualified reviewer makes that judgement.";

/** Severity drives urgency; covered drives state. */
function toItem(row: Row): PilotHandoffItem {
  if (row.covered) {
    return {
      label: row.requirement,
      detail: "A document carrying the matching evidence tag exists. Source quality still needs specialist confirmation.",
      state: "Matched",
      tone: "ready",
    };
  }
  const tone = row.severity === "critical" ? "blocked" : row.severity === "high" ? "warning" : "review";
  return {
    label: row.requirement,
    detail: `No approved source carries an evidence tag for this requirement. Severity: ${row.severity}.`,
    state: "Missing",
    tone,
  };
}

export function MeridianCoverageWorkbench() {
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
    // Two distinct cold starts. Telling them apart matters: one needs a scope,
    // the other needs the licence re-picked from the library.
    const needsKey = data?.reason === "no_license_type_key";
    return (
      <div className="space-y-4">
        <GuidedActionCard
          title={needsKey ? "Re-select the licence type" : "Set the regulatory scope first"}
          reason={
            needsKey
              ? `This workspace records "${data?.licenseType}" as free text from before licence types were standardised. Pick it again from the library so Meridian can select the right requirement pack — guessing from the label risks showing another regulator's obligations.`
              : "Meridian needs a jurisdiction, regulator, and licence before it can show which requirements apply."
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

  const t = data.totals!;
  // Gaps first, most severe already sorted by the API; then a sample of matched
  // items so the screen shows what IS covered rather than only what is missing.
  const items = [
    ...data.gaps.map(toItem),
    ...data.coverage.filter((r) => r.covered).slice(0, 4).map(toItem),
  ];

  return (
    <div className="space-y-4">
      {/* The percentage is meaningless without knowing what it is a percentage
          of. A generic pack must never be presented as the regulator's list. */}
      {data.selection?.packSource === "generic" && (
        <p className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/5 px-3 py-2 text-xs leading-5 text-nexus-warn">
          {GENERIC_PACK_NOTICE}
        </p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Requirements covered</p>
          <p className="mt-2 text-3xl font-bold text-nexus-accent">
            {t.coveragePercent === null ? "—" : `${t.coveragePercent}%`}
          </p>
          <p className="mt-1 text-xs text-white/40">
            {t.covered} of {t.total}
          </p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Critical gaps</p>
          <p className="mt-2 text-3xl font-bold text-nexus-danger">{t.criticalGaps}</p>
          <p className="mt-1 text-xs text-white/40">block pre-submission sign-off</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Evidence documents</p>
          <p className="mt-2 text-3xl font-bold text-nexus-sky">{t.evidenceDocuments}</p>
          <p className="mt-1 text-xs text-white/40">matched by department tag</p>
        </div>
        <div className="panel">
          <p className="text-xs uppercase tracking-wide text-white/40">Restricted</p>
          <p className="mt-2 text-3xl font-bold text-white">{t.restrictedExcluded}</p>
          {/* The contract is explicit: restricted must never look like absent. */}
          <p className="mt-1 text-xs text-white/40">excluded from coverage, not absent evidence</p>
        </div>
      </section>

      {/* The percentage never appears without this. "82% covered" quietly
          becoming "82% compliant" is the misreading this arc must prevent. */}
      <section className="panel border-nexus-warn/30">
        <p className="panel-title text-nexus-warn">What this number does not mean</p>
        <p className="mt-2 text-xs leading-5 text-white/60">{data.boundary ?? BOUNDARY_FALLBACK}</p>
        {data.selection?.rationale && (
          <p className="mt-2 text-xs leading-5 text-white/45">{data.selection.rationale}</p>
        )}
      </section>

      <PilotHandoffWorkbench
        config={{
          product: "Meridian",
          accentClass: "border-[#3E7BFA]/45 bg-[#3E7BFA]/15",
          accentTextClass: "text-[#8FB5FF]",
          activeStep: 1,
          steps: ["Scope", "Evidence", "Gaps", "Filing"],
          eyebrow: "Requirement coverage",
          title: "Evidence coverage becomes owned, reviewable gaps.",
          description: `${data.scope!.regulator} · ${data.scope!.licenseType}. Coverage is computed from the requirement pack and the documents ingested in this workspace.`,
          workbenchTitle: "Requirement coverage workbench",
          items,
          actionTitle: "Assign the critical evidence request",
          actionDescription:
            "Create a human-owned follow-up with the requirement context and reviewer note attached.",
          actionLabel: "Draft evidence decision",
          decisionTitle: "Resolve Meridian critical evidence gap",
          decisionRationale:
            "A Meridian evidence review identified an item that needs named ownership before the filing pack can proceed.",
          boundary:
            "Meridian can organize requirements, evidence, and caveats. It cannot determine legal compliance, certify readiness, submit, sign, or file.",
          inputs: ["requirement pack", "approved evidence link", "owner", "target date", "specialist note"],
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/meridian/requirements" className="text-xs text-nexus-sky hover:underline">
          Back: requirement library
        </Link>
        <Link href="/meridian" className="btn-subtle text-sm" prefetch={false}>
          Back to Submission Room
        </Link>
      </div>
    </div>
  );
}
