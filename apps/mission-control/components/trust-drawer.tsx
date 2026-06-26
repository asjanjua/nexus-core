"use client";

/**
 * Trust Drawer — the one overlay-elevation slide-over in the product (see
 * nexus-design-system skill). Rendered once near the root layout; opened via
 * useTrustDrawer().openDrawer(...) from any confidence badge.
 *
 * Shows, per source: sourceType/department, sensitivity, freshness,
 * extraction confidence, a text snippet, a review-status pill derived
 * honestly from ingestionStatus (never an invented "reviewed at" date),
 * and a link into the full evidence record. Linked entities render below
 * the source list when the caller supplied any.
 */

import Link from "next/link";
import { useTrustDrawer, type TrustDrawerSource } from "@/lib/trust-drawer-context";
import { MetaChip, type Tone } from "@/components/ui/nexus-primitives";
import type { EvidenceRecord, IngestionStatus, Sensitivity } from "@/lib/contracts";

function confidenceTone(pct: number): Tone {
  if (pct >= 70) return "accent";
  if (pct >= 40) return "warn";
  return "danger";
}

function sensitivityTone(sensitivity: Sensitivity): Tone {
  switch (sensitivity) {
    case "restricted":
      return "danger";
    case "confidential":
      return "warn";
    case "internal":
      return "sky";
    default:
      return "accent";
  }
}

/** Derived honestly from the real ingestionStatus field — never fabricated. */
function reviewStatus(status: IngestionStatus): { label: string; tone: Tone } {
  switch (status) {
    case "processed":
      return { label: "Cleared into synthesis", tone: "accent" };
    case "pending_approval":
      return { label: "Awaiting human review", tone: "warn" };
    case "quarantined":
      return { label: "Rejected — quarantined", tone: "danger" };
    case "failed":
      return { label: "Ingestion failed", tone: "danger" };
    default:
      return { label: "Queued, not yet reviewed", tone: "sky" };
  }
}

function fileName(path: string): string {
  return path.split("/").pop() || path;
}

function snippet(text: string, max = 220): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function SourceRow({ source, record }: { source: TrustDrawerSource; record?: EvidenceRecord }) {
  if (!record) {
    return (
      <div className="rounded-lg border border-nexus-border bg-nexus-bg/40 p-3">
        <p className="text-sm font-medium text-nexus-text">{source.label ?? source.id}</p>
        <p className="mt-1 text-xs text-nexus-muted">Loading evidence details…</p>
      </div>
    );
  }

  const review = reviewStatus(record.ingestionStatus);
  const pct = Math.round(record.extractionConfidence * 100);

  return (
    <div className="rounded-lg border border-nexus-border bg-nexus-bg/40 p-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/evidence/${record.id}`}
          className="text-sm font-medium text-nexus-text hover:text-nexus-accent"
        >
          {source.label ?? fileName(record.sourcePath)}
        </Link>
        <MetaChip label={`${pct}% confidence`} tone={confidenceTone(pct)} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <MetaChip label={record.sourceType} tone="sky" />
        {record.department && <MetaChip label={record.department} tone="sky" />}
        <MetaChip label={record.sensitivity} tone={sensitivityTone(record.sensitivity)} />
        <MetaChip label={review.label} tone={review.tone} />
        <MetaChip
          label={record.freshnessHours < 24 ? "Updated <24h ago" : `Updated ${Math.round(record.freshnessHours / 24)}d ago`}
          tone="sky"
        />
      </div>
      {record.text && <p className="mt-2 text-xs leading-5 text-nexus-muted">{snippet(record.text)}</p>}
    </div>
  );
}

export function TrustDrawer() {
  const { state, closeDrawer } = useTrustDrawer();

  if (!state.open) return null;

  const pct = Math.round(state.overallConfidence * 100);
  const tone = confidenceTone(pct);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close trust drawer"
        onClick={closeDrawer}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-nexus-border bg-nexus-panel">
        <div className="flex items-start justify-between gap-3 border-b border-nexus-border p-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-nexus-muted">Trust Drawer</p>
            <h2 className="mt-1 truncate text-base font-semibold text-nexus-text">{state.title}</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-nexus-text/70 transition hover:bg-white/[0.08] hover:text-nexus-text"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-nexus-muted">Confidence</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-3xl font-bold text-nexus-text">{pct}%</p>
              <MetaChip
                label={pct >= 70 ? "Strong" : pct >= 40 ? "Needs review" : "Weak — verify before relying on this"}
                tone={tone}
              />
            </div>
            <div className="mt-2 h-1 rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${tone === "accent" ? "bg-nexus-accent" : tone === "warn" ? "bg-nexus-warn" : "bg-nexus-danger"}`}
                style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-nexus-muted">
              Sources ({state.sources.length})
            </p>
            <div className="mt-2 space-y-2">
              {state.sources.length === 0 ? (
                <p className="rounded-md border border-dashed border-nexus-border px-3 py-4 text-center text-xs text-nexus-muted">
                  No sources linked to this answer yet.
                </p>
              ) : (
                state.sources.map((source) => (
                  <SourceRow key={source.id} source={source} record={state.records[source.id]} />
                ))
              )}
              {state.loading && (
                <p className="text-center text-xs text-nexus-muted">Loading evidence details…</p>
              )}
            </div>
          </div>

          {state.entities.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-nexus-muted">Linked entities</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {state.entities.map((entity) => (
                  <MetaChip
                    key={entity.id}
                    label={`${entity.name} · ${Math.round(entity.confidence * 100)}%`}
                    tone="sky"
                  />
                ))}
              </div>
            </div>
          )}

          <p className="text-[11px] leading-4 text-nexus-muted">
            Review status above reflects each source&apos;s actual ingestion pipeline state. NexusAI does not
            invent review history — sources that were never routed through human approval show their real
            queue state instead.
          </p>
        </div>
      </aside>
    </div>
  );
}
