import Link from "next/link";
import { PinaviaLockup } from "@/components/ui/pinavia-mark";

// Marketing accents (nexus-design-system level 2). These exist ONLY on
// marketing surfaces - never in app chrome, never as operating status.
// Raw hex is deliberate: these are brand-layer values, not app tokens.
const productFamily = [
  {
    name: "NexusAI",
    href: "/workspace",
    label: "Executive room",
    body: "Ask, evidence, decisions, approvals, and audit-ready operating memory.",
    status: "Live core",
    accent: "border-nexus-accent/40 text-nexus-accent",
  },
  {
    name: "Quorum",
    href: "/board",
    label: "Board room",
    body: "Board packs, quorum, conflicts, resolutions, minutes, and director handoff.",
    status: "Live route",
    accent: "border-[#C0A062]/40 text-[#C0A062]",
  },
  {
    name: "Meridian",
    href: "/product-brief",
    label: "Regulatory room",
    body: "Jurisdiction scope, requirement evidence, gap analysis, caveats, and filing-pack prep.",
    status: "Design candidate",
    accent: "border-[#3E7BFA]/40 text-[#7FA9FF]",
  },
  {
    name: "Vantage",
    href: "/product-brief",
    label: "Deal room",
    body: "Data-room coverage, red flags, diligence questions, and investment memo handoff.",
    status: "Design candidate",
    accent: "border-[#D9834A]/40 text-[#E5A171]",
  },
  {
    name: "Nucleus",
    href: "/product-brief",
    label: "Engagement room",
    body: "Consulting methodology packs, deliverables, evidence coverage, and white-label controls.",
    status: "Design candidate",
    accent: "border-[#9AA6B8]/40 text-[#9AA6B8]",
  },
];

const demoPath = ["Landing", "NexusAI", "Ask", "Decision", "Approval"];

const painPoints = [
  {
    title: "The same context is re-built every time.",
    body: "Documents, emails, board packs, deal rooms, and policies keep being re-uploaded or re-explained before useful work can start.",
  },
  {
    title: "The answer sounds complete before it is safe.",
    body: "A fluent response can still miss a jurisdiction, an approval boundary, a caveat, or the source a regulator will ask to see.",
  },
  {
    title: "The decision trail appears after the decision.",
    body: "Teams approve in chat, email, and meetings, then try to reconstruct evidence, ownership, and rationale when scrutiny arrives.",
  },
];

const proofStats = [
  {
    figure: "100%",
    body: "of governed answers carry source references or refuse when the source base is not strong enough.",
    credit: "Product guarantee",
  },
  {
    figure: "0",
    body: "consequential actions leave the system without a named, identity-bound human approval step.",
    credit: "Governance boundary",
  },
  {
    figure: "5",
    body: "regulated rooms run on one shared core for ingestion, evidence, agents, billing, and controls.",
    credit: "Product family",
  },
];

const layerLevers = [
  {
    title: "Evidence memory",
    body: "Pinavia remembers approved sources as structured operating context, so teams ask from the same evidence base instead of starting over.",
    metric: "one source base",
    tone: "text-nexus-accent",
  },
  {
    title: "Verification",
    body: "Claims are checked against visible sources before the output is treated as decision support.",
    metric: "source trace",
    tone: "text-nexus-sky",
  },
  {
    title: "Human routing",
    body: "Drafts move to the right owner, committee, or approval queue without pretending the machine has authority.",
    metric: "named owner",
    tone: "text-nexus-warn",
  },
];

const comparisonRows = [
  ["Jurisdiction", "Assumed from the question", "SBP EMI scope flagged before answer"],
  ["Evidence", "Generic summary", "Board pack, policy, and regulation cited"],
  ["Action", "Advice in chat", "Draft decision routed for approval"],
  ["Boundary", "May imply approval", "Human owner required before action"],
];

const footerLinks: Array<{ heading: string; items: Array<{ label: string; href: string }> }> = [
  {
    heading: "Product",
    items: [
      { label: "NexusAI", href: "/workspace" },
      { label: "Quorum", href: "/board" },
      { label: "Meridian", href: "/product-brief" },
      { label: "Vantage", href: "/product-brief" },
      { label: "Nucleus", href: "/product-brief" },
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

function ExternalOrInternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className} prefetch={false}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

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
          {i < demoPath.length - 1 ? (
            <span aria-hidden className="text-white/25">
              /
            </span>
          ) : null}
        </span>
      ))}
    </nav>
  );
}

function HeroQueryPanel() {
  return (
    <section
      aria-label="Governed answer comparison"
      className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0b1220] shadow-2xl shadow-black/45"
    >
      <div className="surface-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(100,216,196,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_36%)]" />

      <div className="relative border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="micro-label text-white/35">Live product pattern</p>
            <h2 className="mt-1 text-base font-semibold text-white">A single question becomes a governed path</h2>
          </div>
          <span className="rounded-md border border-nexus-accent/35 bg-nexus-accent/10 px-2.5 py-1 text-xs font-semibold text-nexus-accent">
            Evidence-first
          </span>
        </div>
      </div>

      <div className="relative space-y-4 p-4 sm:p-5">
        <div className="rounded-lg border border-white/10 bg-black/25 p-4">
          <p className="micro-label text-white/35">User question</p>
          <p className="mt-2 text-sm leading-6 text-white/80">
            What changes if we approve market expansion while the compliance file is incomplete?
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-nexus-danger/25 bg-nexus-danger/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="micro-label text-nexus-danger">Ordinary AI</p>
              <span className="rounded-md border border-nexus-danger/30 px-2 py-1 text-[10px] text-nexus-danger">
                plausible
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-white">A confident answer, but no operating proof.</p>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-white/55">
              <li>Source base is unclear.</li>
              <li>Jurisdiction and approval limits are inferred.</li>
              <li>No owner is forced before action.</li>
            </ul>
          </div>

          <div className="rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="micro-label text-nexus-accent">Pinavia</p>
              <span className="rounded-md border border-nexus-ai/35 bg-nexus-ai/10 px-2 py-1 text-[10px] font-semibold text-nexus-ai">
                AI drafted
              </span>
            </div>
            <p className="mt-4 text-sm font-semibold text-white">A sourced answer with the next human step attached.</p>
            <ul className="mt-4 space-y-2 text-xs leading-5 text-white/65">
              <li>Regulation, board pack, and risk register cited.</li>
              <li>Gaps and caveats shown before recommendation.</li>
              <li>Decision draft routed to the named approver.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="grid gap-3 text-xs sm:grid-cols-4">
            {comparisonRows.map(([label, ordinary, pinavia]) => (
              <div key={label} className="rounded-md border border-white/10 bg-black/20 p-3">
                <p className="font-semibold text-white">{label}</p>
                <p className="mt-2 text-white/35">{ordinary}</p>
                <p className="mt-2 text-nexus-accent">{pinavia}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MechanismBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="platform">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-start">
        <div>
          <p className="micro-label text-white/35">02 / The operating layer</p>
          <h2 className="display-hero mt-5 text-white" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
            Add evidence once. Use it everywhere decisions happen.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/55">
            Pinavia sits between your institutional knowledge and the models your teams already want
            to use. It keeps source memory, checks claims, and routes consequential work to humans.
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="grid gap-3 lg:grid-cols-[0.85fr_1fr_0.85fr]">
            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="micro-label text-white/35">Inputs</p>
              <div className="mt-4 space-y-2">
                {["Board packs", "Policies", "Deal rooms", "Regulations", "Email evidence"].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/60">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 p-4">
              <p className="micro-label text-nexus-accent">Pinavia governed core</p>
              <div className="mt-5 space-y-3">
                {layerLevers.map((lever) => (
                  <div key={lever.title} className="rounded-md border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{lever.title}</p>
                      <span className={`text-xs font-semibold ${lever.tone}`}>{lever.metric}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/50">{lever.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 p-4">
              <p className="micro-label text-white/35">Outputs</p>
              <div className="mt-4 space-y-2">
                {["Sourced answers", "Decision drafts", "Approval queues", "Audit trails", "Client-ready packs"].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 px-3 py-2 text-sm text-white/60">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProofBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="trust">
      <p className="micro-label text-white/35">03 / Why it holds up</p>
      <h2 className="display-hero mt-5 max-w-3xl text-white" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
        An answer you can <span className="display-accent text-nexus-accent">prove</span> you were
        right to approve.
      </h2>
      <div className="mt-14 grid gap-10 md:grid-cols-3">
        {proofStats.map((stat) => (
          <div key={stat.credit} className="border-t border-white/10 pt-6">
            <p className="stat-numeral">{stat.figure}</p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/60">{stat.body}</p>
            <p className="micro-label mt-4 text-white/30">{stat.credit}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProductFamilySection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8" id="rooms">
      <div className="border-t border-white/10 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="micro-label text-white/35">04 / Product family</p>
            <h2 className="display-hero mt-5 text-white" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
              One governed core, <span className="display-accent text-nexus-accent">five rooms</span>.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/45">
            Each vertical owns its workflow and buyer language. The shared core owns ingestion,
            governance, evidence, agents, and billing.
          </p>
        </div>

        <div className="mt-10 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {productFamily.map((product) => (
            <Link
              key={product.name}
              href={product.href}
              className="group rounded-lg border border-white/10 bg-white/[0.035] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent motion-reduce:hover:translate-y-0"
              prefetch={false}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-white">{product.name}</p>
                <span className={`rounded-md border px-2 py-1 text-[10px] ${product.accent}`}>
                  {product.status}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase text-white/35">{product.label}</p>
              <p className="mt-3 text-sm leading-6 text-white/55">{product.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
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
              <p className="text-xs uppercase text-white/35">{group.heading}</p>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <ExternalOrInternalLink
                      href={item.href}
                      className="rounded text-sm text-white/55 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nexus-accent"
                    >
                      {item.label}
                    </ExternalOrInternalLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
          <p className="text-xs text-white/35">
            Copyright {new Date().getFullYear()} Pinavia. All rights reserved.
          </p>
          <p className="text-xs text-white/35">
            Evidence-first by design. Humans approve anything that leaves the system.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="surface-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]" />

      <section className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <div className="space-y-8 py-4">
            <div className="space-y-6">
              <p className="micro-label text-white/35">01 / The governed AI layer</p>
              <h1 className="display-hero max-w-3xl text-white">
                Your AI can sound right.
                <br />
                Pinavia makes it
                <br />
                <span className="display-accent text-nexus-accent">provable.</span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-white/60 sm:text-lg">
                Pinavia turns institutional evidence into governed AI workflows for boards,
                regulated teams, diligence teams, and consulting firms. Ask a question, see the
                sources, draft the decision, and keep the approval trail intact.
              </p>
            </div>

            <DemoPathStrip />

            <div className="flex flex-wrap gap-3">
              <Link href="/workspace" className="btn-primary px-5 py-3" prefetch={false}>
                Enter NexusAI
              </Link>
              <Link href="/readiness" className="btn-subtle px-5 py-3" prefetch={false}>
                Run readiness check
              </Link>
              <Link href="/product-brief" className="btn-subtle px-5 py-3" prefetch={false}>
                View product brief
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {painPoints.map((point) => (
                <div key={point.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                  <p className="text-sm font-semibold text-white">{point.title}</p>
                  <p className="mt-2 text-xs leading-5 text-white/45">{point.body}</p>
                </div>
              ))}
            </div>
          </div>

          <HeroQueryPanel />
        </div>
      </section>

      <MechanismBand />
      <ProofBand />
      <ProductFamilySection />

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="micro-label text-nexus-accent">Pilot path</p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                Start with one high-stakes workflow, not a generic AI rollout.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                We map your evidence, configure the room, and prove the loop from Ask to approval
                before expanding across the product family.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/start-pilot" className="btn-primary px-5 py-3" prefetch={false}>
                Start pilot
              </Link>
              <a href="mailto:hello@pinavia.io" className="btn-subtle px-5 py-3">
                Contact
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
