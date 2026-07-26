"use client";

/**
 * /product-brief — Pinavia product-family brief
 *
 * Public, print-ready one-pager for buyer follow-up. Keep it grounded in live
 * routes and launch boundaries; do not let it drift into speculative product
 * claims.
 */

import Link from "next/link";

const productRooms = [
  {
    name: "NexusAI",
    route: "/workspace",
    buyer: "Executive teams",
    workflow: "Ask → evidence → draft decision → approval",
    proof: "Source-backed answers, decision drafts, approval queue, audit trail.",
    boundary: "Does not approve or execute decisions for the team.",
  },
  {
    name: "Quorum",
    route: "/board",
    buyer: "Boards and company secretariat teams",
    workflow: "Board pack → quorum/conflicts → resolutions → minutes",
    proof: "Board-pack evidence, attendance/quorum signals, conflicts, minutes draft.",
    boundary: "Does not replace directors' duties or approve resolutions.",
  },
  {
    name: "Meridian",
    route: "/meridian",
    buyer: "Regulated entities and compliance teams",
    workflow: "Scope → evidence coverage → gap triage → filing pack",
    proof: "Requirement matrix, cited sources, missing-evidence list, caveats.",
    boundary: "Does not file, submit, certify, sign, or provide legal advice.",
  },
  {
    name: "Vantage",
    route: "/vantage",
    buyer: "Deal teams and investment committees",
    workflow: "Deal room → coverage → red flags → IC memo",
    proof: "Coverage map, red-flag register, diligence questions, IC handoff.",
    boundary: "Does not mark a deal approved, investable, or rejected.",
  },
  {
    name: "Nucleus",
    route: "/nucleus",
    buyer: "Consulting and advisory firms",
    workflow: "Firm profile → method package → delivery → assurance",
    proof: "Method pack, deliverable coverage, reviewer queue, white-label controls.",
    boundary: "Brand can flex; core trust and approval controls stay fixed.",
  },
];

const pilotInputs = [
  "Named sponsor with decision authority",
  "One high-stakes workflow to prove first",
  "Three to five representative evidence sources",
  "Named reviewer for consequential outputs",
  "Success measures for Day 30, Day 60, and Day 90",
];

const pilotOutputs = [
  "Configured product room and workspace",
  "Evidence map with gaps and caveats",
  "Source-backed Ask and decision workflow",
  "Approval handoff with named human owner",
  "Pilot value-proof pack for expansion or stop/hold decision",
];

const trustClaims = [
  ["Evidence first", "Answers cite governed sources or refuse when the source base is too weak."],
  ["Human authority", "AI can draft, route, compare, and prepare; humans approve, sign, submit, and decide."],
  ["Domain-owned workflows", "Each vertical owns its objects, stages, buyer language, and refusal boundaries."],
  ["One shared core", "Ingestion, evidence, governance, agents, and billing stay common across the product family."],
];

function PrintButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="rounded-lg bg-[#08111f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#172033]"
    >
      Save as PDF
    </button>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55706a]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-[#08111f]">{title}</h2>
    </div>
  );
}

export default function ProductBriefPage() {
  return (
    <>
      <div className="no-print flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
        <Link href="/" className="text-sm font-semibold text-slate-700" prefetch={false}>
          Pinavia Product Brief
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/start-pilot"
            className="rounded-lg bg-[#7de3c0] px-4 py-2 text-sm font-semibold text-[#06110f] transition hover:bg-[#9af0d2]"
            prefetch={false}
          >
            Start pilot
          </Link>
          <PrintButton />
        </div>
      </div>

      <main className="mx-auto max-w-5xl bg-white px-8 py-10 text-slate-900 print:max-w-none print:px-0 print:py-0">
        <header className="grid gap-8 border-b-2 border-[#08111f] pb-8 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#55706a]">Pinavia</p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight text-[#08111f]">
              Governed AI execution rooms
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Pinavia turns institutional evidence into governed AI workflows for executive,
              board, regulatory, diligence, and advisory teams. The point is not a better chat
              window. The point is a decision path that carries sources, caveats, ownership,
              approval status, and proof.
            </p>
          </div>
          <aside className="rounded-xl border border-[#7de3c0]/45 bg-[#f1fbf7] p-5">
            <p className="text-sm font-bold text-[#08111f]">Pilot entry point</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Start with one workflow, one sponsor, one evidence pack, and one human approval
              boundary. Expand only after the value proof is visible.
            </p>
            <div className="mt-5 space-y-2 text-sm">
              <p>
                <span className="font-semibold">Web:</span> pinavia.io/start-pilot
              </p>
              <p>
                <span className="font-semibold">Email:</span> hello@pinavia.io
              </p>
              <p>
                <span className="font-semibold">Status:</span> Launch-pilot ready surfaces,
                deep routes staged by product.
              </p>
            </div>
          </aside>
        </header>

        <section className="grid gap-5 border-b border-slate-200 py-8 md:grid-cols-3">
          <div className="rounded-xl bg-[#08111f] p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7de3c0]">Promise</p>
            <p className="mt-3 text-lg font-semibold leading-7">
              Every consequential AI output reaches a named human before it becomes an action.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Best first pilot</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-[#08111f]">
              A regulated workflow where evidence, approvals, and audit readiness already matter.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">What changes</p>
            <p className="mt-3 text-lg font-semibold leading-7 text-[#08111f]">
              AI work becomes source-backed, bounded, routed, and reviewable instead of just fluent.
            </p>
          </div>
        </section>

        <section className="border-b border-slate-200 py-8">
          <SectionTitle eyebrow="Product family" title="Five rooms on one governed core" />
          <div className="product-brief-mobile-rooms grid gap-3">
            {productRooms.map((room) => (
              <article key={room.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Link href={room.route} className="font-bold text-[#0d7f68]" prefetch={false}>
                    {room.name}
                  </Link>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {room.route}
                  </span>
                </div>
                <p className="mt-2 text-sm font-semibold text-[#08111f]">{room.buyer}</p>
                <dl className="mt-3 space-y-3 text-xs leading-5">
                  <div>
                    <dt className="font-bold uppercase tracking-[0.12em] text-slate-400">Workflow</dt>
                    <dd className="mt-1 text-slate-700">{room.workflow}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.12em] text-slate-400">Proof</dt>
                    <dd className="mt-1 text-slate-600">{room.proof}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.12em] text-slate-400">Boundary</dt>
                    <dd className="mt-1 text-[#9b6728]">{room.boundary}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="product-brief-desktop-table overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Room</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">First workflow</th>
                  <th className="px-4 py-3">Proof</th>
                  <th className="px-4 py-3">Boundary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {productRooms.map((room) => (
                  <tr key={room.name} className="align-top">
                    <td className="px-4 py-4">
                      <Link href={room.route} className="font-bold text-[#0d7f68]" prefetch={false}>
                        {room.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{room.buyer}</td>
                    <td className="px-4 py-4 text-slate-700">{room.workflow}</td>
                    <td className="px-4 py-4 text-slate-600">{room.proof}</td>
                    <td className="px-4 py-4 text-[#9b6728]">{room.boundary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-8 border-b border-slate-200 py-8 md:grid-cols-2">
          <div>
            <SectionTitle eyebrow="Pilot inputs" title="What we need before kickoff" />
            <ul className="space-y-2">
              {pilotInputs.map((item) => (
                <li key={item} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#7de3c0]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionTitle eyebrow="Pilot outputs" title="What the pilot should prove" />
            <ul className="space-y-2">
              {pilotOutputs.map((item) => (
                <li key={item} className="flex gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#08111f]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-b border-slate-200 py-8">
          <SectionTitle eyebrow="Trust model" title="Designed around what AI must not do" />
          <div className="grid gap-4 md:grid-cols-4">
            {trustClaims.map(([title, body]) => (
              <div key={title} className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-bold text-[#08111f]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-900">Standing authority boundary</p>
            <p className="mt-2 text-sm leading-6 text-amber-900/80">
              Pinavia can prepare, cite, draft, compare, and route work. It does not approve, sign,
              file, certify, submit, or make investment decisions. Those verbs belong to named humans.
            </p>
          </div>
        </section>

        <section className="grid gap-6 border-b border-slate-200 py-8 md:grid-cols-[0.78fr_1.22fr]">
          <div>
            <SectionTitle eyebrow="Pilot package" title="Commercial shape for the first conversation" />
            <p className="text-sm leading-6 text-slate-600">
              Use this as a scoping brief, not a fixed quote. Pricing and scope should follow the
              diagnostic, evidence estate, security needs, and the number of workflows included.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-[#08111f] p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7de3c0]">Pilot</p>
              <p className="mt-3 text-2xl font-bold">90 days</p>
              <p className="mt-2 text-xs leading-5 text-white/65">
                One room, one workflow, one workspace, sponsor/reviewer model, evidence pack, and
                weekly value proof.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Expansion</p>
              <p className="mt-3 text-2xl font-bold text-[#08111f]">Room by room</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Add more workflows only after the first path proves evidence quality, adoption, and
                approval discipline.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Enterprise</p>
              <p className="mt-3 text-2xl font-bold text-[#08111f]">Custom</p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Data residency, connector depth, support/SLA, white-label, and product-domain setup
                are scoped separately.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#55706a]">Next step</p>
            <h2 className="mt-2 text-2xl font-bold text-[#08111f]">
              Start with the workflow where a proof trail matters most.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              If the workflow is clear, create the pilot workspace. If it is not clear, run the
              diagnostic first and use the result to choose the room.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-3">
            <Link
              href="/start-pilot"
              className="rounded-lg bg-[#7de3c0] px-5 py-3 text-sm font-bold text-[#06110f] transition hover:bg-[#9af0d2]"
              prefetch={false}
            >
              Start pilot
            </Link>
            <Link
              href="/diagnostic"
              className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              prefetch={false}
            >
              Run diagnostic
            </Link>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-slate-200 pt-6 text-xs text-slate-400">
          <span>Pinavia · Governed AI execution rooms · Shareable product brief</span>
          <span>pinavia.io · hello@pinavia.io</span>
        </footer>
      </main>

      <style>{`
        .product-brief-desktop-table {
          display: none;
        }
        @media (min-width: 768px) {
          .product-brief-mobile-rooms {
            display: none;
          }
          .product-brief-desktop-table {
            display: block;
          }
        }
        @media print {
          .no-print { display: none !important; }
          .product-brief-mobile-rooms { display: none !important; }
          .product-brief-desktop-table { display: block !important; }
          body { background: white; }
          a { color: inherit; text-decoration: none; }
        }
      `}</style>
    </>
  );
}
