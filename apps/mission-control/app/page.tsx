import Link from "next/link";
import { PinaviaLockup } from "@/components/ui/pinavia-mark";

// Marketing accents (nexus-design-system level 2). These exist ONLY on
// marketing surfaces — never in app chrome, never as operating status.
// Raw hex is deliberate: these are brand-layer values, not app tokens.
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
    accent: "border-[#C0A062]/40 text-[#C0A062]",
  },
  {
    name: "Meridian",
    href: "https://meridian.pinavia.io",
    label: "Regulatory room",
    body: "Jurisdiction scope, requirement evidence, gaps, caveats, and filing-pack prep.",
    status: "Design candidate",
    accent: "border-[#3E7BFA]/40 text-[#7FA9FF]",
  },
  {
    name: "Vantage",
    href: "https://vantage.pinavia.io",
    label: "Deal room",
    body: "Data-room coverage, red flags, diligence questions, and investment memo handoff.",
    status: "Design candidate",
    accent: "border-[#D9834A]/40 text-[#E5A171]",
  },
  {
    name: "Nucleus",
    href: "https://nucleus.pinavia.io",
    label: "Engagement room",
    body: "Consulting methodology packs, deliverables, evidence coverage, and white-label controls.",
    status: "Design candidate",
    accent: "border-[#9AA6B8]/40 text-[#9AA6B8]",
  },
];

// The demo path — the one sentence that explains what the product does.
const demoPath = ["Landing", "NexusAI", "Ask", "Decision", "Approval"];

const footerLinks: Array<{ heading: string; items: Array<{ label: string; href: string }> }> = [
  {
    heading: "Product",
    items: [
      { label: "NexusAI", href: "https://nexus.pinavia.io" },
      { label: "Quorum", href: "https://quorum.pinavia.io" },
      { label: "Meridian", href: "https://meridian.pinavia.io" },
      { label: "Vantage", href: "https://vantage.pinavia.io" },
      { label: "Nucleus", href: "https://nucleus.pinavia.io" },
    ],
  },
  {
    heading: "Trust",
    items: [
      { label: "Security", href: "/security" },
      { label: "Data processing", href: "/data-processing" },
      { label: "Acceptable use", href: "/acceptable-use" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    heading: "Get started",
    items: [
      { label: "Readiness check", href: "/readiness" },
      { label: "Product brief", href: "/product-brief" },
      { label: "Contact", href: "mailto:hello@pinavia.io" },
    ],
  },
];

const trustSignals = [
  ["Evidence-first", "Every answer starts with the sources it used."],
  ["Human approval", "Consequential decisions route through named owners."],
  ["Product boundaries", "Each vertical says what the machine must not do."],
  ["One shared core", "Ingestion, governance, evidence, agents, and billing stay common."],
];

// Locked tokens only — the arc values below describe operating state, so they
// use nexus semantic colours rather than raw Tailwind hues.
const commandFlow = [
  { label: "Ingest", value: "12 sources", tone: "text-nexus-sky" },
  { label: "Ask", value: "evidence first", tone: "text-nexus-accent" },
  { label: "Decide", value: "7 open", tone: "text-nexus-warn" },
  { label: "Prove", value: "audit ready", tone: "text-nexus-accent" },
];

/** The demo path strip — teaches the governed loop in one glance. */
function DemoPathStrip() {
  return (
    <nav aria-label="Product demo path" className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      {demoPath.map((step, i) => (
        <span key={step} className="flex items-center gap-2">
          <span
            className={[
              "rounded-md border px-2.5 py-1 text-xs",
              i === 0
                ? "border-white/20 text-white/70"
                : "border-nexus-accent/30 bg-nexus-accent/5 text-nexus-accent",
            ].join(" ")}
          >
            {step}
          </span>
          {i < demoPath.length - 1 && (
            <span aria-hidden className="text-white/25">
              →
            </span>
          )}
        </span>
      ))}
    </nav>
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
              <span className="rounded-md border border-nexus-ai/35 bg-nexus-ai/10 px-2 py-1 text-[11px] font-semibold text-nexus-ai">
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
                  <span className="rounded border border-nexus-accent/25 bg-nexus-accent/10 px-1.5 py-0.5 text-[10px] text-nexus-accent">
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
              className="group block rounded-lg border border-white/10 bg-white/[0.035] p-3 transition duration-150 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent motion-reduce:hover:translate-y-0"
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
          <div className="flex flex-col justify-between py-4 lg:min-h-[560px]">
            <div className="space-y-7">
              <PinaviaLockup />

              <div className="space-y-5">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
                  Every AI decision. Evidence-backed. Human-approved.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
                  Your team already has the documents. Pinavia reads them, runs specialist analysis
                  across strategy, risk and compliance, and returns one answer you can act on — with
                  every claim traceable to its source and every consequential action approved by a
                  named human.
                </p>
              </div>

              <DemoPathStrip />

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
                className="group rounded-lg border border-white/10 bg-white/[0.035] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent motion-reduce:hover:translate-y-0"
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

      <footer className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
            <div className="space-y-3">
              <PinaviaLockup descriptor="" />
              <p className="max-w-xs text-xs leading-5 text-white/45">
                Governed AI for executive teams, boards, regulated workflows, diligence teams, and
                advisory firms.
              </p>
            </div>

            {footerLinks.map((group) => (
              <div key={group.heading}>
                <p className="text-xs uppercase tracking-wide text-white/35">{group.heading}</p>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        className="rounded text-sm text-white/55 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <p className="text-xs text-white/35">
              &copy; {new Date().getFullYear()} Pinavia. All rights reserved.
            </p>
            <p className="text-xs text-white/35">
              Evidence-first by design. Humans approve anything that leaves the system.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
