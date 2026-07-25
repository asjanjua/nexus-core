import Link from "next/link";

const productFamily = [
  {
    name: "NexusAI",
    href: "https://nexus.pinavia.io",
    label: "Executive room",
    body: "Governed Ask, evidence, decisions, approvals, and audit-ready operating memory.",
    status: "Live core",
    accent: "border-nexus-accent/40 text-nexus-accent",
  },
  {
    name: "Quorum",
    href: "https://quorum.pinavia.io",
    label: "Board room",
    body: "Board packs, quorum, conflicts, resolutions, minutes, and director handoff.",
    status: "Live route",
    accent: "border-sky-300/40 text-sky-200",
  },
  {
    name: "Meridian",
    href: "https://meridian.pinavia.io",
    label: "Regulatory room",
    body: "Jurisdiction scope, requirement evidence, gaps, caveats, and filing-pack prep.",
    status: "Design candidate",
    accent: "border-emerald-300/40 text-emerald-200",
  },
  {
    name: "Vantage",
    href: "https://vantage.pinavia.io",
    label: "Deal room",
    body: "Data-room coverage, red flags, diligence questions, and investment memo handoff.",
    status: "Design candidate",
    accent: "border-amber-300/40 text-amber-200",
  },
  {
    name: "Nucleus",
    href: "https://nucleus.pinavia.io",
    label: "Engagement room",
    body: "Consulting methodology packs, deliverables, evidence coverage, and white-label controls.",
    status: "Design candidate",
    accent: "border-violet-300/40 text-violet-200",
  },
];

const trustSignals = [
  ["Evidence-first", "Every answer starts with the sources it used."],
  ["Human approval", "Consequential decisions route through named owners."],
  ["Product boundaries", "Each vertical says what the machine must not do."],
  ["One shared core", "Ingestion, governance, evidence, agents, and billing stay common."],
];

const commandFlow = [
  { label: "Ingest", value: "12 sources", tone: "text-sky-200" },
  { label: "Ask", value: "evidence first", tone: "text-violet-200" },
  { label: "Decide", value: "7 open", tone: "text-amber-200" },
  { label: "Prove", value: "audit ready", tone: "text-emerald-200" },
];

function PinaviaMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className="h-11 w-11 shrink-0"
      fill="none"
    >
      <rect x="6" y="6" width="52" height="52" rx="14" fill="#101826" />
      <rect x="6.5" y="6.5" width="51" height="51" rx="13.5" stroke="white" strokeOpacity="0.16" />
      <path
        d="M20 47V17h17.5c8.1 0 13.5 4.9 13.5 12.4 0 7.3-5.4 12.3-13.5 12.3H29v5.3h-9Zm9-13h7.7c3.5 0 5.7-1.8 5.7-4.6 0-2.9-2.2-4.7-5.7-4.7H29V34Z"
        fill="#86BC25"
      />
      <path d="M18 50h28" stroke="#8FC5FF" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M47 19l4-4M50 26h5M47 33l4 4" stroke="#B89BFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MiniRoomMap() {
  return (
    <div className="relative min-h-[540px] overflow-hidden rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/40">
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-70" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),transparent_42%,rgba(134,188,37,0.045))]" />

      <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-xs uppercase text-white/35">Pinavia command map</p>
          <p className="text-sm font-semibold text-white">Governed AI execution layer</p>
        </div>
        <span className="rounded-md border border-nexus-accent/35 bg-nexus-accent/10 px-2 py-1 text-xs text-nexus-accent">
          Demo ready
        </span>
      </div>

      <div className="relative grid gap-4 p-4 lg:grid-cols-[1fr_0.82fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-nexus-accent">NexusAI</p>
                <h2 className="mt-1 text-2xl font-semibold leading-tight text-white">
                  Ask becomes a governed decision path.
                </h2>
              </div>
              <span className="rounded-md border border-violet-300/35 bg-violet-300/10 px-2 py-1 text-[11px] font-semibold text-violet-200">
                AI
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/60">
              The answer is generated, the sources are visible, and the next action stays human-owned.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {["Evidence strip", "Confidence score", "Decision draft", "Approval queue"].map((item) => (
                <div key={item} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {commandFlow.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <p className="text-[11px] uppercase text-white/35">{item.label}</p>
                <p className={`mt-2 text-sm font-semibold ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs uppercase text-white/35">Trust drawer</p>
            <div className="mt-3 space-y-2">
              {["SBP EMI Regs 2019, Reg 5", "Board pack v4", "Risk register Q3"].map((source) => (
                <div key={source} className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2">
                  <span className="truncate text-xs text-white/65">{source}</span>
                  <span className="rounded border border-emerald-300/25 bg-emerald-300/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                    cited
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {productFamily.map((product, index) => (
            <a
              key={product.name}
              href={product.href}
              className="group block rounded-lg border border-white/10 bg-white/[0.035] p-3 transition hover:border-white/25 hover:bg-white/[0.06]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{product.name}</p>
                  <p className="text-xs text-white/40">{product.label}</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[10px] ${product.accent}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-x-0 top-0 h-[520px]" />

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
          <div className="flex min-h-[560px] flex-col justify-between py-4">
            <div className="space-y-7">
              <div className="flex items-center gap-3">
                <PinaviaMark />
                <div>
                  <p className="text-2xl font-semibold leading-tight text-white">Pinavia</p>
                  <p className="text-xs uppercase tracking-wide text-white/40">Governed AI for high-stakes teams</p>
                </div>
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  AI execution rooms for decisions that need evidence.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Pinavia builds governed AI products for executive teams, boards, regulated workflows,
                  diligence teams, and advisory firms. The shared core handles ingestion, evidence,
                  approval, agents, audit trail, and billing; each product owns its own workflow.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/workspace" className="btn-primary px-5 py-3" prefetch={false}>
                  Enter NexusAI
                </Link>
                <Link href="/readiness" className="btn-subtle px-5 py-3" prefetch={false}>
                  Start readiness check
                </Link>
                <Link href="/product-brief" className="btn-subtle px-5 py-3" prefetch={false}>
                  View product brief
                </Link>
              </div>
            </div>

            <div className="grid gap-3 pt-10 sm:grid-cols-2">
              {trustSignals.map(([title, body]) => (
                <div key={title} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/50">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <MiniRoomMap />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="border-y border-white/10 py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/35">Product family</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">One governed core, five rooms.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/50">
              Subdomains create clean buyer entrypoints. The runtime stays shared until each vertical
              deserves its own route, model, tests, and operating P&L.
            </p>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {productFamily.map((product) => (
              <a
                key={product.name}
                href={product.href}
                className="group rounded-lg border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{product.name}</p>
                  <span className={`rounded-md border px-2 py-1 text-[10px] ${product.accent}`}>
                    {product.status}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-white/35">{product.label}</p>
                <p className="mt-3 text-sm leading-6 text-white/55">{product.body}</p>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
