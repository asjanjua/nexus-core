/**
 * Artefact provenance strip — contract-mandated.
 *
 * docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md, "Shared Trust Layer":
 * every generated or reviewable artefact carries a quiet, consistent strip
 * with authorship, source count, source freshness band, and access-scope
 * state. This is that component, so the four facts appear identically on every
 * surface instead of being reinvented per screen.
 *
 * Two additions beyond the contract's minimum, both justified:
 *
 *  - RETRIEVAL METHOD. "graph" is a materially different claim from "keyword":
 *    the evidence surfaced through a relationship, not a string match. A
 *    reviewer is entitled to know which, and silently swapping retrieval paths
 *    is precisely the kind of invisible change this product exists to prevent.
 *
 *  - ACCESS-SCOPE state is rendered as its own item rather than folded into
 *    the source count, because the contract is explicit that restricted
 *    evidence must never look like absent evidence.
 *
 * Deliberately NOT here: a bare confidence percentage. Bands are the primary
 * signal (lib/confidence-bands.ts); this strip describes where the artefact
 * came from, not how much to believe it.
 */

import type { RetrievalMethod } from "@/lib/contracts";

export type Authorship = "ai-assisted" | "human-authored" | "human-reviewed";

const AUTHORSHIP: Record<Authorship, { label: string; tone: string; bg: string }> = {
  // Violet is AI provenance and nothing else. This is the one place in the
  // strip it may appear.
  "ai-assisted": { label: "AI-assisted", tone: "text-nexus-ai", bg: "bg-nexus-ai/15" },
  "human-authored": { label: "Human-authored", tone: "text-nexus-text", bg: "bg-white/10" },
  "human-reviewed": { label: "Human-reviewed", tone: "text-nexus-accent", bg: "bg-nexus-accent/15" },
};

const RETRIEVAL: Record<RetrievalMethod, { label: string; hint: string }> = {
  graph: {
    label: "via entity graph",
    hint: "Evidence surfaced through relationships between entities, not a text match.",
  },
  vector: {
    label: "via semantic search",
    hint: "Evidence surfaced by meaning similarity to the question.",
  },
  keyword: {
    label: "via keyword match",
    hint: "Evidence surfaced by term overlap with the question.",
  },
  none: {
    label: "no retrieval ran",
    hint: "No evidence was retrieved. This is not the same as finding nothing relevant.",
  },
};

/** Freshness expressed as a band, consistent with the confidence-band rule. */
function freshnessBand(hours: number | null | undefined): { label: string; tone: string } {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) {
    return { label: "freshness unknown", tone: "text-nexus-warn" };
  }
  if (hours <= 24 * 7) return { label: "fresh (7d)", tone: "text-nexus-accent" };
  if (hours <= 24 * 90) return { label: "recent (90d)", tone: "text-nexus-sky" };
  return { label: "stale (90d+)", tone: "text-nexus-warn" };
}

function Item({ children, tone }: { children: React.ReactNode; tone?: string }) {
  return <span className={`whitespace-nowrap ${tone ?? "text-white/45"}`}>{children}</span>;
}

export function ProvenanceStrip({
  authorship,
  sourceCount,
  freshnessHours,
  retrievalMethod,
  restrictedCount = 0,
  className = "",
}: {
  authorship: Authorship;
  sourceCount: number;
  freshnessHours?: number | null;
  retrievalMethod?: RetrievalMethod;
  /** Items withheld by access scope. Rendered distinctly from "no evidence". */
  restrictedCount?: number;
  className?: string;
}) {
  const author = AUTHORSHIP[authorship];
  const fresh = freshnessBand(freshnessHours);
  const retrieval = retrievalMethod ? RETRIEVAL[retrievalMethod] : null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] leading-5 ${className}`}
      // One label for the whole strip: a screen reader should hear provenance
      // as a single statement, not five orphaned fragments.
      aria-label="Artefact provenance"
    >
      <span className={`rounded-md px-1.5 py-0.5 font-medium ${author.bg} ${author.tone}`}>
        {author.label}
      </span>

      <Item>
        {sourceCount} source{sourceCount === 1 ? "" : "s"}
      </Item>

      <Item tone={fresh.tone}>{fresh.label}</Item>

      {retrieval && (
        <Item>
          <span title={retrieval.hint} className="underline decoration-dotted underline-offset-2">
            {retrieval.label}
          </span>
        </Item>
      )}

      {restrictedCount > 0 && (
        <Item tone="text-nexus-warn">
          <span
            title="Some items are restricted by your access scope and are not shown. This is not the same as no evidence."
            className="underline decoration-dotted underline-offset-2"
          >
            {restrictedCount} restricted by access scope
          </span>
        </Item>
      )}
    </div>
  );
}
