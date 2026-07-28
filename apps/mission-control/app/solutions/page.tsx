import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Solutions | Pinavia",
  description:
    "Governed AI execution rooms for executive, board, regulatory, diligence, and advisory workflows.",
  alternates: { canonical: "/solutions" },
};

const ROOMS = [
  {
    name: "NexusAI",
    buyer: "Executive teams",
    workflow: "Evidence-backed Ask to a human-owned decision draft.",
    route: "/workspace",
    accent: "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent",
  },
  {
    name: "Quorum",
    buyer: "Boards and company secretariats",
    workflow: "Board pack baseline to a reviewable change brief.",
    route: "/board",
    accent: "border-[#C0A062]/35 bg-[#C0A062]/10 text-[#E2C887]",
  },
  {
    name: "Meridian",
    buyer: "Regulated entities and compliance teams",
    workflow: "Scope, evidence coverage, gaps, and a reviewer-ready filing pack.",
    route: "/meridian",
    accent: "border-[#3E7BFA]/35 bg-[#3E7BFA]/10 text-[#8FB5FF]",
  },
  {
    name: "Vantage",
    buyer: "Deal teams and investment committees",
    workflow: "Diligence coverage and red-flag triage before IC review.",
    route: "/vantage",
    accent: "border-[#D9834A]/35 bg-[#D9834A]/10 text-[#F1B084]",
  },
  {
    name: "Nucleus",
    buyer: "Consulting and advisory firms",
    workflow: "A branded engagement layer with trust controls that cannot be re-skinned away.",
    route: "/nucleus",
    accent: "border-[#9AA6B8]/35 bg-[#9AA6B8]/10 text-[#C8D1DE]",
  },
];

const LOOP = [
  ["01", "Connect", "Bring a narrow, approved evidence source into a controlled workspace."],
  ["02", "Understand", "Ask from evidence; show the source, confidence, caveat, and freshness."],
  ["03", "Route", "Turn the work into a draft with an owner, deadline, and named approver."],
  ["04", "Prove", "Keep the approval status and evidence trail ready for the next review."],
];

export default function SolutionsPage() {
  return (
    <main className="min-h-screen bg-nexus-bg text-nexus-text">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <p className="micro-label text-nexus-accent">Pinavia solutions</p>
        <div className="mt-4 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
          <div>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              AI work that stays attached to evidence, authority, and proof.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              Pinavia is not a generic chat interface. It is a shared governed core with product rooms
              for the places where a fluent answer is not enough: executive operations, boards,
              regulatory submissions, diligence, and client delivery.
            </p>
          </div>
          <div className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-nexus-accent">The operating rule</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-white">
              The machine can prepare, cite, compare, and draft. A named human owns every consequential action.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/start-pilot" className="btn-primary px-5 py-3" prefetch={false}>Start pilot</Link>
              <Link href="/diagnostic" className="btn-subtle px-5 py-3" prefetch={false}>Run diagnostic</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="micro-label text-white/35">One governed core</p>
          <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">A repeatable path for work that has to stand up to review.</h2>
          <div className="mt-7 grid gap-3 md:grid-cols-4">
            {LOOP.map(([number, title, body]) => (
              <article key={number} className="panel">
                <p className="text-xs font-semibold text-nexus-accent">{number}</p>
                <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="micro-label text-white/35">Product rooms</p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Different buyer language. The same governed foundation.</h2>
          </div>
          <Link href="/product-brief" className="btn-subtle px-4 py-2" prefetch={false}>Open product brief</Link>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {ROOMS.map((room) => (
            <article key={room.name} className="panel flex min-h-[260px] flex-col">
              <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${room.accent}`}>{room.name}</span>
              <p className="mt-5 text-sm font-semibold text-white">{room.buyer}</p>
              <p className="mt-3 flex-1 text-sm leading-6 text-white/55">{room.workflow}</p>
              <Link href={room.route} className="mt-5 text-sm font-medium text-nexus-accent" prefetch={false}>Preview room</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-6 sm:p-8">
          <p className="micro-label text-nexus-warn">Authority stays visible</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">The boundary is part of the product, not a footnote.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-50/75">
            Pinavia does not approve board action, make an investment decision, submit a filing, sign a document,
            or certify a conclusion. Each room shows the named human step before that action can leave the system.
          </p>
        </div>
      </section>
    </main>
  );
}
