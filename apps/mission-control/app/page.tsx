import Link from "next/link";

const operatingStats = [
  { label: "Evidence confidence", value: "82%", tone: "text-emerald-300" },
  { label: "Open decisions", value: "7", tone: "text-amber-300" },
  { label: "High-risk items", value: "3", tone: "text-rose-300" },
  { label: "Agent briefs", value: "16", tone: "text-sky-300" },
];

const rooms = [
  {
    title: "Executive",
    body: "Priorities, tradeoffs, decision memos, and board-ready synthesis.",
    metric: "4 blockers",
    tone: "border-amber-300/35 text-amber-200",
  },
  {
    title: "Operations",
    body: "Owners, bottlenecks, overdue work, and evidence-backed execution status.",
    metric: "11 owners",
    tone: "border-sky-300/35 text-sky-200",
  },
  {
    title: "Risk",
    body: "Weak evidence, stale sources, regulatory exposure, and controls to review.",
    metric: "3 critical",
    tone: "border-rose-300/35 text-rose-200",
  },
  {
    title: "Growth",
    body: "Pipeline signals, partner asks, market notes, and proposal readiness.",
    metric: "$1.2M pipe",
    tone: "border-emerald-300/35 text-emerald-200",
  },
];

const steps = [
  { label: "Connect", body: "Add board packs, strategy docs, operating reports, or comms exports." },
  { label: "Verify", body: "Review provenance, confidence, freshness, sensitivity, and gaps." },
  { label: "Decide", body: "Approve recommendations, assign owners, and export executive briefs." },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[560px] flex-col justify-between py-4">
            <div className="space-y-6">
              <div className="inline-flex rounded-md border border-white/15 bg-white/[0.04] px-3 py-1 text-xs uppercase text-white/60">
                Nexus Core
              </div>
              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  Executive intelligence with evidence, approval, and memory built in.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Mission Control turns company documents and communications into governed agent rooms for decisions,
                  risks, recommendations, and role-aware executive briefs.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/start-pilot" className="btn-primary px-5 py-3" prefetch={false}>
                  Start pilot
                </Link>
                <Link href="/workspace" className="btn-subtle px-5 py-3" prefetch={false}>
                  Open workspace
                </Link>
              </div>
            </div>

            <dl className="grid gap-3 pt-10 sm:grid-cols-2">
              {operatingStats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <dt className="text-xs uppercase text-white/45">{stat.label}</dt>
                  <dd className={`mt-2 text-2xl font-semibold ${stat.tone}`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#0c1424]/95 shadow-2xl shadow-black/35">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-xs uppercase text-white/45">Mission Control</p>
                <h2 className="text-lg font-semibold text-white">Base command surface</h2>
              </div>
              <div className="flex gap-2 text-xs">
                <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-emerald-200">
                  Evidence OK
                </span>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-white/55">
                  Pilot mode
                </span>
              </div>
            </div>

            <div className="grid min-h-[520px] lg:grid-cols-[180px_1fr]">
              <aside className="border-b border-white/10 p-3 lg:border-b-0 lg:border-r">
                <p className="mb-3 px-2 text-xs uppercase text-white/35">Rooms</p>
                <div className="space-y-1">
                  {["Executive", "Operations", "Growth", "Risk", "Technology"].map((item, index) => (
                    <div
                      key={item}
                      className={[
                        "rounded-lg px-3 py-2 text-sm",
                        index === 0 ? "bg-white/10 text-white" : "text-white/55",
                      ].join(" ")}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </aside>

              <div className="space-y-4 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Priority", "Approve partner risk review", "amber"],
                    ["Owner", "Strategy office", "sky"],
                    ["Freshness", "18h", "emerald"],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                      <p className="text-xs uppercase text-white/35">{label}</p>
                      <p
                        className={[
                          "mt-2 text-sm font-semibold",
                          tone === "amber" ? "text-amber-200" : tone === "sky" ? "text-sky-200" : "text-emerald-200",
                        ].join(" ")}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-nexus-accent">Executive brief</p>
                      <h3 className="mt-1 text-xl font-semibold text-white">This week needs three decisions</h3>
                    </div>
                    <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-xs text-emerald-200">
                      82% confidence
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/60">
                    Revenue expansion is blocked by partner due diligence, compliance sign-off, and unresolved
                    operating capacity. Evidence comes from the board pack, KPI update, and payments market notes.
                  </p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {["Board pack", "Risk register", "Market brief"].map((source) => (
                      <div key={source} className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs text-white/55">
                        {source}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <div key={room.title} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">{room.title}</p>
                        <span className={`rounded-md border px-2 py-1 text-xs ${room.tone}`}>{room.metric}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/55">{room.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 border-y border-white/10 py-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.label} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-white/55">
                {index + 1}
              </span>
              <div>
                <h2 className="font-semibold text-white">{step.label}</h2>
                <p className="mt-1 text-sm leading-6 text-white/55">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
