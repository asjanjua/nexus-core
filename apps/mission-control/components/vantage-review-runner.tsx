"use client";

/**
 * Shared "choose scope and run" control for the Vantage deep routes.
 *
 * Every one of these screens needs the same three things before it can show
 * anything: a checklist to run, a button to run it, and an honest cold start
 * before the first run. Repeating that in four components is how four screens
 * drift into four slightly different products.
 *
 * The cold start is a first-class state, not a spinner placeholder. Nothing
 * here is precomputed on the server: a diligence review reads the workspace's
 * evidence, so it runs when a human asks for it, and the screen says so
 * instead of showing an empty table that reads as a broken page.
 */

import type { ReactNode } from "react";
import { DEAL_TYPES, type DealType } from "@/lib/vantage-review-client";
import { SkeletonLines } from "@/components/ui/nexus-primitives";

export function VantageReviewRunner({
  dealType,
  setDealType,
  running,
  error,
  onRun,
  hasResult,
  coldStartTitle,
  coldStartBody,
  children,
}: {
  dealType: DealType;
  setDealType: (d: DealType) => void;
  running: boolean;
  error: string | null;
  onRun: () => void;
  hasResult: boolean;
  coldStartTitle: string;
  coldStartBody: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <section className="panel border-[#D9834A]/30">
        <p className="panel-title text-[#F1B084]">Review scope</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEAL_TYPES.map((t) => {
            const active = t.value === dealType;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setDealType(t.value)}
                aria-pressed={active}
                className={[
                  "rounded-lg border px-3 py-2 text-sm transition",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D9834A]",
                  active
                    ? "border-[#D9834A]/50 bg-[#D9834A]/15 text-white"
                    : "border-white/10 text-white/60 hover:text-white",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs leading-5 text-nexus-muted">
          {DEAL_TYPES.find((t) => t.value === dealType)?.hint}
        </p>
        {/* One primary action per screen. */}
        <button type="button" onClick={onRun} disabled={running} className="btn-primary mt-4">
          {running ? "Running review…" : hasResult ? "Re-run review" : "Run review"}
        </button>
      </section>

      {error && (
        <section className="panel border-nexus-danger/40">
          <p className="text-sm font-semibold text-nexus-danger">Review did not complete</p>
          {/* The raw reason, not a friendly euphemism. A diligence manager
              needs to know whether this was a permission boundary or a fault. */}
          <p className="mt-1 text-xs leading-5 text-nexus-muted">{error}</p>
        </section>
      )}

      {running && !hasResult && (
        <section className="panel">
          <SkeletonLines lines={4} />
        </section>
      )}

      {!running && !hasResult && !error && (
        <section className="panel border-nexus-sky/25">
          <p className="text-sm font-semibold text-nexus-text">{coldStartTitle}</p>
          <p className="mt-1 text-xs leading-5 text-nexus-muted">{coldStartBody}</p>
        </section>
      )}

      {hasResult && children}
    </div>
  );
}
