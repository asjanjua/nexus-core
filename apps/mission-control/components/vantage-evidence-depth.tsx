"use client";

/**
 * Evidence Depth — how well-supported each covered requirement actually is.
 *
 * Coverage is binary: an item is cited or it is not. That flatters a deal
 * where every requirement rests on exactly one document scraping past the
 * confidence threshold. "94% covered" and "94% covered, of which half sits on
 * a single weak source" are very different things to take into a committee,
 * and only the second is diligence.
 *
 * Everything here is derived from citations the runner already returns. No new
 * engine, no new numbers — the same review, asked a harder question.
 */

import { useMemo } from "react";
import Link from "next/link";
import { evidenceDepth, meanConfidence, useDiligenceReview } from "@/lib/vantage-review-client";
import { VantageReviewRunner } from "@/components/vantage-review-runner";

const DEPTH_META = {
  none: { label: "No source", cls: "border-nexus-danger/30 bg-nexus-danger/10 text-nexus-danger" },
  thin: { label: "Thin", cls: "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-warn" },
  supported: { label: "Supported", cls: "border-nexus-sky/30 bg-nexus-sky/10 text-nexus-sky" },
  corroborated: { label: "Corroborated", cls: "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent" },
} as const;

function DepthPill({ depth }: { depth: keyof typeof DEPTH_META }) {
  const m = DEPTH_META[depth];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
}

export function VantageEvidenceDepth() {
  const { dealType, setDealType, review, running, error, run } = useDiligenceReview("depth");

  const rows = useMemo(() => {
    if (!review) return [];
    return [...review.coverage]
      .filter((r) => r.covered)
      .sort((a, b) => {
        // Thinnest support first, and critical before high within that — this
        // list is a work queue, so the ordering is the product.
        const order = { none: 0, thin: 1, supported: 2, corroborated: 3 } as const;
        const d = order[evidenceDepth(a)] - order[evidenceDepth(b)];
        if (d !== 0) return d;
        const sev = { critical: 0, high: 1, medium: 2, low: 3 } as const;
        return sev[a.severity] - sev[b.severity];
      });
  }, [review]);

  const counts = useMemo(() => {
    const c = { none: 0, thin: 0, supported: 0, corroborated: 0 };
    for (const r of rows) c[evidenceDepth(r)] += 1;
    return c;
  }, [rows]);

  /** Covered, critical, and resting on a single or weak source. */
  const fragile = useMemo(
    () => rows.filter((r) => r.severity === "critical" && evidenceDepth(r) === "thin"),
    [rows]
  );

  return (
    <VantageReviewRunner
      dealType={dealType}
      setDealType={setDealType}
      running={running}
      error={error}
      onRun={run}
      hasResult={Boolean(review)}
      coldStartTitle="Nothing has been measured yet"
      coldStartBody="Depth is computed from the citations behind each covered requirement, so it needs a review run against this workspace's evidence. Choose the checklist above and run it."
    >
      {review && (
        <>
          {fragile.length > 0 && (
            <section className="panel border-nexus-warn/40">
              <p className="text-sm font-semibold text-nexus-warn">
                {fragile.length} critical requirement{fragile.length === 1 ? "" : "s"} rest on thin evidence
              </p>
              <p className="mt-1 text-xs leading-5 text-nexus-muted">
                These count as covered. Each is supported by a single citation, or by sources averaging
                under 70% confidence. Coverage percentage alone would not show this.
              </p>
              <ul className="mt-3 space-y-1">
                {fragile.map((r) => (
                  <li key={r.itemId} className="text-xs text-nexus-text">
                    · {r.requirement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(["thin", "supported", "corroborated", "none"] as const).map((k) => (
              <div key={k} className="panel">
                <p className="text-xs uppercase tracking-wide text-nexus-muted">{DEPTH_META[k].label}</p>
                <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">{counts[k]}</p>
                <p className="mt-2 text-xs text-nexus-muted">covered requirements</p>
              </div>
            ))}
          </section>

          <section className="panel">
            <p className="panel-title">Covered requirements, thinnest support first</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Depth is the citation count and mean confidence behind each item. It is a measure of
              support, not a judgment about the deal.
            </p>
            <div className="mt-3 space-y-2">
              {rows.map((row) => {
                const depth = evidenceDepth(row);
                const mean = meanConfidence(row.citations);
                return (
                  <div key={row.itemId} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-nexus-text">{row.requirement}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-nexus-muted">
                          {row.category} · {row.severity}
                        </p>
                      </div>
                      <DepthPill depth={depth} />
                    </div>
                    <p className="mt-2 text-xs text-nexus-muted">
                      {row.citations.length} citation{row.citations.length === 1 ? "" : "s"}
                      {mean !== null ? ` · mean confidence ${Math.round(mean * 100)}%` : ""}
                    </p>
                    {/* Sources named, not summarised. The point of the screen is
                        that a reviewer can go and read them. */}
                    <ul className="mt-2 space-y-1">
                      {row.citations.map((c) => (
                        <li key={`${row.itemId}-${c.evidenceId}`} className="truncate text-[11px] text-nexus-sky">
                          <Link href={`/evidence/${c.evidenceId}`} className="hover:underline" prefetch={false}>
                            {c.sourcePath}
                          </Link>
                          <span className="text-nexus-muted"> · {Math.round(c.confidence * 100)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel border-nexus-danger/30">
            <p className="panel-title text-nexus-danger">Authority boundary</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Depth describes how well a requirement is evidenced. It is not a view on price, quality,
              or whether the deal should proceed, and Vantage cannot mark a deal investable or rejected.
            </p>
          </section>
        </>
      )}
    </VantageReviewRunner>
  );
}
