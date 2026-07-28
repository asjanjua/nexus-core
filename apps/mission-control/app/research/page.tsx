import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Research | Pinavia",
  description:
    "Pinavia research on governed AI adoption in regulated, board, diligence, and advisory workflows.",
  alternates: { canonical: "/research" },
};

const QUESTIONS = [
  ["Evidence", "What source, confidence, freshness, and caveat should accompany an AI output before a professional relies on it?"],
  ["Authority", "Which verbs can the system prepare, and which must always remain a named human action?"],
  ["Workflow", "Where does AI reduce review friction without erasing the approvals, records, and accountability the workflow requires?"],
];

const PATTERNS = [
  ["Regulatory readiness", "A compliance team scopes one jurisdiction and licence objective, identifies missing evidence, and prepares a reviewer-owned pack. Meridian does not file or certify."],
  ["Board continuity", "A board team compares a new pack with a stable prior baseline, highlights material movement, and routes director questions into human-owned decisions. Quorum does not approve or sign."],
  ["Diligence coverage", "A deal team maps governed evidence to a checklist, surfaces gaps and red flags, and prepares material for a named advisor and committee. Vantage does not recommend investment."],
];

const METHOD = [
  "Start with a real operating question, not a model benchmark.",
  "Use a narrow evidence pack with a named source owner and a documented sensitivity boundary.",
  "Measure evidence coverage, review effort, unresolved gaps, and the quality of the human handoff.",
  "Publish pilot findings as observed workflow evidence, not as anonymous ROI claims or synthetic case studies.",
];

export default function ResearchPage() {
  return (
    <main className="min-h-screen bg-nexus-bg text-nexus-text">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <p className="micro-label text-nexus-accent">Pinavia research</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Research for AI work that has to be explained, reviewed, and defended.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              Pinavia studies the operational layer between institutional evidence and AI output: provenance,
              authority, review design, and proof. We do not treat a polished answer as evidence of a safe workflow.
            </p>
          </div>
          <aside className="rounded-lg border border-nexus-sky/25 bg-nexus-sky/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-nexus-sky">Research stance</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-white">Measured pilot evidence beats generic AI claims.</p>
            <p className="mt-3 text-sm leading-6 text-white/55">Published material distinguishes a working pattern, a design hypothesis, and a proven client outcome.</p>
          </aside>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="micro-label text-white/35">Research agenda</p>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {QUESTIONS.map(([title, body]) => (
              <article key={title} className="panel">
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/55">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <p className="micro-label text-white/35">Regulated pilot patterns</p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">The cases we are designed to test, without pretending they are finished case studies.</h2>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {PATTERNS.map(([title, body], index) => (
            <article key={title} className="panel">
              <p className="text-xs font-semibold text-nexus-accent">0{index + 1}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">{body}</p>
              <span className="mt-5 inline-flex rounded-md border border-white/10 px-2 py-1 text-xs text-white/45">Pilot pattern, not client claim</span>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="micro-label text-white/35">How we evaluate a pilot</p>
          <ol className="mt-7 grid gap-3 md:grid-cols-2">
            {METHOD.map((item, index) => (
              <li key={item} className="flex gap-4 rounded-lg border border-white/10 bg-black/20 p-4">
                <span className="text-sm font-semibold text-nexus-accent">0{index + 1}</span>
                <p className="text-sm leading-6 text-white/60">{item}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 p-6 sm:flex sm:items-end sm:justify-between sm:gap-8 sm:p-8">
          <div>
            <p className="micro-label text-nexus-accent">Bring a real question</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Run a diagnostic before making a broad AI claim.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">We start with one workflow, one sponsor, an evidence pack, and a visible human boundary.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 sm:mt-0">
            <Link href="/diagnostic" className="btn-primary px-5 py-3" prefetch={false}>Run diagnostic</Link>
            <Link href="/start-pilot" className="btn-subtle px-5 py-3" prefetch={false}>Start pilot</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
