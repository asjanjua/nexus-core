import Link from "next/link";

const proofPoints = [
  "Evidence-backed specialist agents with source links",
  "Agent rooms for strategy, operations, growth, technology, data, risk, finance, and people",
  "Human-approved recommendations and decision memos",
  "Cloud or local processing path for sensitive files",
];

const productCards = [
  {
    title: "CEO Brief",
    body: "Strategic priorities, top risks, open decisions, and cross-functional bottlenecks.",
  },
  {
    title: "Risk Radar",
    body: "Weak evidence, stale sources, and emerging risks are separated from trusted signals.",
  },
  {
    title: "Decision Memo",
    body: "Turn scattered documents into source-backed rationale, owners, and next actions.",
  },
  {
    title: "Evidence Panel",
    body: "Every insight keeps provenance, freshness, sensitivity, confidence, and source path.",
  },
];

const steps = [
  "Describe your company and sector.",
  "Upload a starter pack of documents.",
  "Review evidence confidence and approvals.",
  "Open role dashboards and ask source-backed questions.",
];

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10rem] top-[-8rem] h-80 w-80 rounded-full bg-nexus-accent/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/60">
              NexusAI Mission Control
            </div>
            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Your company&apos;s second brain for decisions, risks, and executive action.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-white/70">
                NexusAI gives every company a team of evidence-backed AI analysts, each focused
                on a business function, with human approval built in.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/sign-up" className="btn-primary px-5 py-3">
                Start a Pilot
              </Link>
              <Link href="/sign-in" className="btn-subtle px-5 py-3">
                View Demo Workspace
              </Link>
            </div>
            <p className="max-w-2xl text-sm text-white/50">
              Built for human-approved executive intelligence. Every answer links back to evidence.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30">
            <div className="rounded-2xl border border-white/10 bg-[#0d1629] p-5">
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-nexus-accent">Executive Command Room</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">This week&apos;s agent briefs</h2>
                </div>
                <span className="rounded-full bg-green-400/10 px-3 py-1 text-xs text-green-300">
                  Evidence OK
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {productCards.map((card) => (
                  <div key={card.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-semibold text-white">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-white/60">{card.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-nexus-accent/30 bg-nexus-accent/10 p-4">
                <p className="text-sm font-medium text-white">Recommendation</p>
                <p className="mt-1 text-sm leading-6 text-white/70">
                  Approve the updated partner pipeline review before next week&apos;s sponsor meeting.
                </p>
                <p className="mt-3 text-xs text-white/40">Based on 4 sources | Freshness: 18h | Confidence: 82%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {proofPoints.map((point) => (
            <div key={point} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/70">
              {point}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-nexus-accent">Pilot flow</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">From signup to first brief in one guided path.</h2>
              <p className="mt-4 text-sm leading-7 text-white/60">
                NexusAI starts narrow: docs, comms, evidence, approvals, and role dashboards.
                It does not claim to replace ERP, CRM, HR, finance, or BI systems in V1.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-[#0b1220]/70 p-5">
                  <span className="text-xs text-white/35">0{index + 1}</span>
                  <p className="mt-3 text-sm font-medium text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
