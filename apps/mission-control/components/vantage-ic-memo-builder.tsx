"use client";

/**
 * IC Memo Builder — the memo drafts the runner was already producing.
 *
 * `icMemoSections` has been computed on every diligence run and displayed
 * nowhere. The Deal Room hub showed "5/8 memo sections" as an invented figure
 * while the real drafts were discarded.
 *
 * THE SECTION STATUS IS THE PRODUCT. `requires_author` is not an empty state
 * to be filled in later by the machine — it marks the parts of an investment
 * memo that a human must write, because they are judgment rather than
 * evidence. Rendering those identically to the populated ones would quietly
 * suggest the memo is nearly done, which is the opposite of true.
 *
 * Every populated section is AI-drafted from cited evidence, so it carries the
 * violet AI marker. That rule exists precisely for a screen like this, where a
 * buyer might otherwise carry machine text into committee as their own.
 */

import { useMemo } from "react";
import { useDiligenceReview, type ICMemoSection } from "@/lib/vantage-review-client";
import { VantageReviewRunner } from "@/components/vantage-review-runner";

const STATUS_META = {
  populated: {
    label: "AI drafted",
    cls: "border-nexus-ai/40 bg-nexus-ai/10 text-[#c4a9ff]",
    note: "Drafted from cited evidence. Confirm every claim before it leaves.",
  },
  requires_author: {
    label: "Author must write",
    cls: "border-nexus-warn/30 bg-nexus-warn/10 text-nexus-warn",
    note: "Judgment, not evidence. Vantage will not draft this.",
  },
  flagged: {
    label: "Flagged",
    cls: "border-nexus-danger/30 bg-nexus-danger/10 text-nexus-danger",
    note: "Something in the evidence contradicts or undercuts this section.",
  },
} as const;

function SectionCard({ section }: { section: ICMemoSection }) {
  const meta = STATUS_META[section.status];
  const isAi = section.status === "populated";
  return (
    <div
      className={`rounded-lg border bg-black/20 p-4 ${
        isAi ? "border-l-2 border-l-nexus-ai border-white/10" : "border-white/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold text-nexus-text">{section.title}</p>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
          {meta.label}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-nexus-muted">{section.guidance}</p>

      {section.content.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {section.content.map((line, i) => (
            <li key={`${section.key}-${i}`} className="text-sm leading-6 text-nexus-text">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        // Not a blank box. An empty author section states whose job it is.
        <p className="mt-3 rounded border border-dashed border-white/15 px-3 py-2 text-xs leading-5 text-nexus-muted">
          Nothing drafted. {meta.note}
        </p>
      )}

      {section.content.length > 0 && (
        <p className="mt-3 text-[11px] leading-4 text-nexus-muted">{meta.note}</p>
      )}
    </div>
  );
}

export function VantageIcMemoBuilder() {
  const { dealType, setDealType, review, running, error, run } = useDiligenceReview("ic-memo");

  const counts = useMemo(() => {
    const sections = review?.icMemoSections ?? [];
    return {
      total: sections.length,
      drafted: sections.filter((s) => s.status === "populated").length,
      author: sections.filter((s) => s.status === "requires_author").length,
      flagged: sections.filter((s) => s.status === "flagged").length,
    };
  }, [review]);

  return (
    <VantageReviewRunner
      dealType={dealType}
      setDealType={setDealType}
      running={running}
      error={error}
      onRun={run}
      hasResult={Boolean(review)}
      coldStartTitle="No memo drafted yet"
      coldStartBody="Memo sections are drafted from the evidence behind each checklist item, so they need a review run first. Sections that require human judgment will stay empty by design."
    >
      {review && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-nexus-muted">Sections drafted</p>
              <p className="mt-2 text-[32px] font-bold leading-none text-nexus-text">
                {counts.drafted}
                <span className="text-xl text-nexus-muted">/{counts.total}</span>
              </p>
              <p className="mt-2 text-xs text-nexus-muted">from cited evidence</p>
            </div>
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-nexus-muted">Awaiting the author</p>
              <p className="mt-2 text-[32px] font-bold leading-none text-nexus-warn">{counts.author}</p>
              <p className="mt-2 text-xs text-nexus-muted">judgment sections Vantage will not write</p>
            </div>
            <div className="panel">
              <p className="text-xs uppercase tracking-wide text-nexus-muted">Flagged</p>
              <p className="mt-2 text-[32px] font-bold leading-none text-nexus-danger">{counts.flagged}</p>
              <p className="mt-2 text-xs text-nexus-muted">evidence contradicts the section</p>
            </div>
          </section>

          <section className="panel">
            <p className="panel-title">Memo sections</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Drafted sections are machine-written from evidence and marked in violet. They are a
              starting point for the author, never the committee&apos;s basis for a decision.
            </p>
            <div className="mt-3 space-y-3">
              {review.icMemoSections.map((s) => (
                <SectionCard key={s.key} section={s} />
              ))}
            </div>
          </section>

          <section className="panel border-nexus-danger/30">
            <p className="panel-title text-nexus-danger">Authority boundary</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              Vantage drafts memo material from evidence. It does not recommend, approve, or reject an
              investment, and no section here constitutes an investment decision. The named author
              owns the memo that reaches committee.
            </p>
          </section>
        </>
      )}
    </VantageReviewRunner>
  );
}
