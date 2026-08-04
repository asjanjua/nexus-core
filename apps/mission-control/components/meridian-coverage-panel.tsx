"use client";

/**
 * Meridian Evidence arc, screen 1 — the requirement library.
 *
 * `/meridian/requirements`  what the licence demands
 *
 * Screen 2 (`/meridian/evidence-coverage`, what the evidence proves) reads the
 * same GET /api/meridian/coverage but renders through the shared
 * PilotHandoffWorkbench, so it lives in meridian-coverage-workbench.tsx. They
 * are two screens because the registry models two user tasks with different
 * primary users (regulatory analyst vs compliance analyst), not two datasets.
 *
 * This screen shows what each requirement demands and which evidence tags
 * would satisfy it. It deliberately shows no coverage percentage: reading the
 * obligations and judging whether they are met are separate acts, and mixing
 * them is how "72% covered" becomes "72% compliant" in someone's head.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { GuidedActionCard, SkeletonLines } from "@/components/ui/nexus-primitives";

type Severity = "critical" | "high" | "medium";

type RequirementRow = {
  id: string;
  requirement: string;
  severity: Severity;
  evidenceTags: string[];
  gapIndicator: string;
};

type Payload = {
  configured: boolean;
  reason?: "no_scope" | "no_license_type_key";
  licenseType?: string;
  scope?: {
    jurisdiction: string;
    regulator: string;
    licenseType: string;
    licenseStatus: string;
    deadline: string | null;
  };
  selection?: { sets: string[]; rationale: string; packSource: "dedicated" | "generic" };
  requirements: RequirementRow[];
};

/** Shown wherever a requirement count appears. See hasDedicatedRequirementPack. */
export const GENERIC_PACK_NOTICE =
  "No purpose-built requirement pack exists for this licence yet, so a generic baseline is shown. " +
  "It is not the regulator's requirement list and must not be read as complete.";

const SEVERITY: Record<Severity, { label: string; tone: string; bg: string; glyph: string }> = {
  critical: { label: "Critical", tone: "text-nexus-danger", bg: "bg-nexus-danger/15", glyph: "■" },
  high: { label: "High", tone: "text-nexus-warn", bg: "bg-nexus-warn/15", glyph: "▲" },
  medium: { label: "Medium", tone: "text-nexus-sky", bg: "bg-nexus-sky/15", glyph: "●" },
};

function SeverityPill({ severity }: { severity: Severity }) {
  const s = SEVERITY[severity];
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.tone}`}>
      {/* Glyph so severity never depends on colour alone. */}
      <span aria-hidden>{s.glyph}</span> {s.label}
    </span>
  );
}

export function MeridianCoveragePanel() {
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
    // Two different cold starts. Telling them apart matters: one needs a scope,
    // the other needs a licence re-picked from the library.
    const needsKey = data?.reason === "no_license_type_key";
    return (
      <div className="space-y-4">
        <GuidedActionCard
          title={needsKey ? "Re-select the licence type" : "Set the regulatory scope first"}
          reason={
            needsKey
              ? `This workspace records "${data?.licenseType}" as free text from before licence types were standardised. Pick it again from the library so Meridian can select the right requirement pack. Guessing from the label risks showing another regulator's obligations.`
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

  return (
    <div className="space-y-4">
      {data.selection?.packSource === "generic" && (
        <p className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/5 px-3 py-2 text-xs leading-5 text-nexus-warn">
          {GENERIC_PACK_NOTICE}
        </p>
      )}

      <p className="rounded-lg border border-nexus-sky/25 bg-nexus-sky/5 px-3 py-2 text-xs leading-5 text-nexus-sky">
        {data.selection?.rationale} Requirement content is domain-reviewed and must be checked by a
        qualified specialist before customer or regulator use.
      </p>

      <section className="panel">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="panel-title">
            Requirement library — {data.scope!.regulator} · {data.scope!.licenseType}
          </p>
          <span className="text-xs text-white/40">{data.requirements.length} requirements</span>
        </div>
        {data.requirements.length === 0 ? (
          <p className="mt-3 text-xs leading-5 text-white/50">
            No requirements are recorded for this licence yet. That is a gap in the library, not a
            finding that the licence has no obligations.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {data.requirements.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-6 text-white">{r.requirement}</p>
                  <SeverityPill severity={r.severity} />
                </div>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  If unevidenced: {r.gapIndicator}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.evidenceTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-nexus-sky/10 px-1.5 py-0.5 text-[10px] text-nexus-sky/90"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/meridian" className="btn-subtle text-sm" prefetch={false}>
          Back to Submission Room
        </Link>
        <Link href="/meridian/evidence-coverage" className="text-xs text-nexus-sky hover:underline">
          Next: evidence coverage
        </Link>
      </div>
    </div>
  );
}
