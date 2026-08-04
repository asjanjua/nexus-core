"use client";

/**
 * Client-side triggers for the Trust Drawer. Kept separate from
 * nexus-primitives.tsx so that file can stay server-renderable for the
 * (many) screens that only need its static presentational pieces — these
 * two components are the only ones that need the click handler + context.
 */

import { useTrustDrawer, type TrustDrawerEntity, type TrustDrawerSource } from "@/lib/trust-drawer-context";
import { TONE_SOFT, type Tone } from "@/components/ui/nexus-primitives";
import type { EvidenceRecord } from "@/lib/contracts";
import { bandMeta } from "@/lib/confidence-bands";

function confidenceTone(pct: number): Tone {
  if (pct >= 70) return "accent";
  if (pct >= 40) return "warn";
  return "danger";
}

/**
 * Pill badge — the canonical trust marker used throughout the product.
 * Clicking it opens the Trust Drawer scoped to this answer's sources.
 *
 * The BAND is the signal; the percentage is secondary detail in the tooltip.
 * Required by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md — a bare
 * percentage invites "82% means probably right", which is not what the number
 * measures. Most surfaces inherit their trust rendering from this component,
 * so this is the single place the rule is enforced.
 */
export function ConfidenceBadge({
  confidence,
  title,
  sources,
  entities,
  records,
  humanReviewed,
  blocked,
}: {
  confidence: number;
  title: string;
  sources: TrustDrawerSource[];
  entities?: TrustDrawerEntity[];
  records?: EvidenceRecord[];
  /** A named reviewer approved this. Required to reach the Verified band. */
  humanReviewed?: boolean;
  /** A control, permission, or missing reviewer prevents progress. */
  blocked?: boolean;
}) {
  const { openDrawer } = useTrustDrawer();
  const pct = Math.round(confidence * 100);
  const meta = bandMeta(confidence, { humanReviewed, blocked });

  return (
    <button
      type="button"
      onClick={() => openDrawer({ title, overallConfidence: confidence, sources, entities, records })}
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition hover:brightness-110 ${meta.bg} ${meta.tone}`}
      // Percentage and the band's negative claim live here: available on
      // demand, never presented as the headline.
      title={`${meta.label} · ${pct}% · ${meta.meaning} Not a claim that ${meta.notAClaimThat} Open Trust Drawer.`}
    >
      {/* Non-colour signal, so the band never depends on colour alone. */}
      <span aria-hidden className="text-[10px]">
        {meta.glyph}
      </span>
      {meta.label}
      <span aria-hidden className="text-[10px] opacity-60">
        ›
      </span>
    </button>
  );
}

/**
 * Quiet text-link variant for panels that already hold full EvidenceRecord
 * objects (e.g. a server component that loaded them for the page) — no
 * network round-trip needed since records are passed straight through.
 */
export function EvidenceTrustLink({
  label,
  title,
  confidence,
  records,
}: {
  label: string;
  title: string;
  confidence: number;
  records: EvidenceRecord[];
}) {
  const { openDrawer } = useTrustDrawer();

  return (
    <button
      type="button"
      onClick={() =>
        openDrawer({
          title,
          overallConfidence: confidence,
          sources: records.map((r) => ({ id: r.id, sourceType: r.sourceType, department: r.department })),
          records,
        })
      }
      className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-nexus-text/80 transition hover:border-white/30 hover:bg-white/[0.07] hover:text-nexus-text"
    >
      {label}
    </button>
  );
}

/**
 * Pill badge for surfaces that have real evidence references but no single
 * aggregate confidence score of their own (e.g. a Decision created from a
 * rationale with evidenceRefs, where there is no one number that honestly
 * represents "how confident is this decision"). Opens the Trust Drawer with
 * the confidence header hidden rather than inventing a percentage.
 */
export function EvidenceCountLink({
  title,
  sources,
  records,
}: {
  title: string;
  sources: TrustDrawerSource[];
  records?: EvidenceRecord[];
}) {
  const { openDrawer } = useTrustDrawer();
  const count = sources.length;

  return (
    <button
      type="button"
      onClick={() => openDrawer({ title, overallConfidence: null, sources, records })}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition hover:brightness-110 ${TONE_SOFT.sky}`}
      title="Open Trust Drawer"
    >
      {count} source{count !== 1 ? "s" : ""}
      <span aria-hidden className="text-[10px] opacity-60">
        ›
      </span>
    </button>
  );
}
