import type { Metadata } from "next";
import Link from "next/link";

import {
  APPROACH,
  CLIENT_RESPONSIBILITIES,
  DELIVERABLES,
  DIMENSIONS,
  ENGAGEMENT,
  EXCLUSIONS,
  FEE,
  SELF_SERVE_OUTPUT,
  TIMELINE,
} from "@/lib/diagnostic-offer";

/**
 * Public offer page for the paid Readiness Diagnostic.
 *
 * Renders entirely from `lib/diagnostic-offer.ts`. No scope, timeline, or
 * commercial term is written into this component — a change to the offer is a
 * change to the registry, which is what keeps the free `/readiness` instrument
 * and the paid engagement describing the same seven dimensions.
 *
 * Server component with no client boundary: nothing here is interactive, and
 * production build constraints (CLAUDE.md) keep Clerk client components out of
 * marketing bundles.
 */

export const metadata: Metadata = {
  title: "Readiness Diagnostic | Pinavia",
  description:
    "A two-week fixed-scope diagnostic that tests AI readiness against your evidence, not your opinion. Board-ready findings pack and prioritised remediation roadmap.",
  alternates: { canonical: "/diagnostic" },
};

const SECTION = "mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8";
const PANEL = "rounded-lg border border-nexus-border bg-nexus-panel p-6";
const LABEL = "text-xs font-semibold uppercase tracking-wider text-nexus-muted";

export default function DiagnosticPage() {
  return (
    <main className="min-h-screen bg-nexus-bg text-nexus-text">
      {/* Rung one: self-serve. One primary action, brand lime reserved for it. */}
      <section className="mx-auto max-w-5xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        <p className={LABEL}>Readiness Diagnostic</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight">
          Find out what your AI readiness actually is, before someone asks you to prove it.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-nexus-muted">
          Seven dimensions, scored against your own answers, returned the same day. It tells you which
          questions a board or a regulator would ask that you cannot currently answer.
        </p>

        {/* Fee block renders only when set. Price stated before the CTA, never after. */}
        {FEE ? (
          <div className={`mt-8 ${PANEL} max-w-xl`}>
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-bold">{FEE.amount}</p>
              <p className="text-sm text-nexus-muted">{FEE.basis}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-nexus-muted">{FEE.note}</p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/start-pilot"
            className="inline-flex items-center rounded-lg bg-nexus-brand px-4 py-2 text-sm font-semibold text-[#0b1a00]"
          >
            {FEE ? `Get the diagnostic for ${FEE.amount}` : "Get the diagnostic"}
          </Link>
          <Link
            href="/readiness"
            className="inline-flex items-center rounded-lg border border-white/20 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.08]"
          >
            Try the free self-assessment first
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {SELF_SERVE_OUTPUT.map((item) => (
            <div key={item.title} className={PANEL}>
              <p className="text-base font-semibold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-nexus-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The commercial argument: what a self-assessment cannot establish. */}
      <section className={SECTION}>
        <h2 className="text-2xl font-semibold">The seven dimensions, at two depths</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nexus-muted">
          Scoring establishes what your team believes. Evidence testing establishes what is true. Both
          examine the same seven dimensions, which is why the second follows cleanly from the first.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-nexus-border">
                <th scope="col" className={`pb-3 pr-4 ${LABEL}`}>
                  Dimension
                </th>
                <th scope="col" className={`pb-3 pr-4 ${LABEL}`}>
                  Scored (USD 49)
                </th>
                <th scope="col" className={`pb-3 ${LABEL}`}>
                  Evidence-tested (review)
                </th>
              </tr>
            </thead>
            <tbody>
              {DIMENSIONS.map((dimension) => (
                <tr key={dimension.id} className="border-b border-nexus-border/60 align-top">
                  <th scope="row" className="py-4 pr-4 font-semibold">
                    {dimension.label}
                  </th>
                  <td className="py-4 pr-4 leading-relaxed text-nexus-muted">
                    {dimension.selfAssessed}
                  </td>
                  <td className="py-4 leading-relaxed text-nexus-text">{dimension.diagnostic}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rung two. Visually separated so the USD 49 figure cannot anchor it. */}
      <section className="border-y border-nexus-border bg-nexus-surface">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <p className={LABEL}>When scoring is not enough</p>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight">{ENGAGEMENT.name}</h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-nexus-muted">
            {ENGAGEMENT.summary}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className={PANEL}>
              <p className={LABEL}>Duration</p>
              <p className="mt-2 text-2xl font-semibold">{TIMELINE.duration}</p>
              <p className="mt-3 text-sm leading-relaxed text-nexus-muted">{TIMELINE.detail}</p>
            </div>
            <div className={PANEL}>
              <p className={LABEL}>{ENGAGEMENT.fee ? "Fee" : "Scope"}</p>
              <p className="mt-2 text-2xl font-semibold">
                {ENGAGEMENT.fee ? ENGAGEMENT.fee.amount : "Fixed"}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-nexus-muted">
                {ENGAGEMENT.fee
                  ? ENGAGEMENT.fee.basis
                  : "Seven dimensions, three traced decisions, one consolidated evidence request. Scope is agreed in the first two days and does not move after that."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How the two weeks run. Numbered so sequence is unambiguous. */}
      <section className={SECTION}>
        <h2 className="text-2xl font-semibold">How the two weeks run</h2>
        <ol className="mt-8 space-y-4">
          {APPROACH.map((step, index) => (
            <li key={step.stage} className={`${PANEL} flex gap-4`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-nexus-border text-sm font-semibold text-nexus-muted">
                {index + 1}
              </span>
              <div>
                <p className={LABEL}>{step.stage}</p>
                <p className="mt-1 text-base font-semibold">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-nexus-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={SECTION}>
        <h2 className="text-2xl font-semibold">What you receive</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DELIVERABLES.map((deliverable) => (
            <div key={deliverable.title} className={PANEL}>
              <p className="text-base font-semibold">{deliverable.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-nexus-muted">{deliverable.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Exclusions and responsibilities sit together: both sides of the deal. */}
      <section className={SECTION}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={PANEL}>
            <h2 className="text-base font-semibold">What this engagement is not</h2>
            <ul className="mt-4 space-y-3">
              {EXCLUSIONS.map((exclusion) => (
                <li key={exclusion} className="text-sm leading-relaxed text-nexus-muted">
                  {exclusion}
                </li>
              ))}
            </ul>
          </div>
          <div className={PANEL}>
            <h2 className="text-base font-semibold">What we need from you</h2>
            <ul className="mt-4 space-y-3">
              {CLIENT_RESPONSIBILITIES.map((item) => (
                <li key={item} className="text-sm leading-relaxed text-nexus-muted">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className={`${PANEL} flex flex-wrap items-center justify-between gap-6`}>
          <div>
            <p className="text-lg font-semibold">Start with the score, or go straight to evidence</p>
            <p className="mt-1 text-sm text-nexus-muted">
              Most organisations score first. If you already know where the gaps are, scope the review
              directly.
            </p>
          </div>
          <Link
            href="/start-pilot"
            className="inline-flex items-center rounded-lg bg-nexus-brand px-4 py-2 text-sm font-semibold text-[#0b1a00]"
          >
            Scope the review
          </Link>
        </div>
      </section>
    </main>
  );
}
