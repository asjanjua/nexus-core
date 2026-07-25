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

const specialUsps = [
  {
    title: "Human approval is a product primitive",
    proof: "The machine can draft, route, summarize, and compare. It cannot approve, sign, file, certify, or mark a matter complete.",
    detail:
      "That boundary is designed into the workflow, not hidden in a policy note. Every consequential output lands with an owner, a status, and an approval path.",
    signal: "approval boundary",
  },
  {
    title: "Evidence is visible before the answer becomes useful",
    proof: "Sources, caveats, confidence, and missing-evidence warnings sit beside the answer rather than behind a separate audit export.",
    detail:
      "A buyer can see what the system relied on before they turn an answer into a decision, minutes note, filing pack, or investment memo.",
    signal: "source-first UI",
  },
  {
    title: "Each vertical owns its own workflow",
    proof: "Quorum, Meridian, Vantage, and Nucleus are not skins over one generic chatbot arc.",
    detail:
      "Board governance, regulatory filings, diligence, and consulting delivery each use their own objects, stages, refusal rules, and user inputs.",
    signal: "domain registry",
  },
  {
    title: "Regulated work is designed around what AI must not do",
    proof: "The product describes no-go zones as clearly as capabilities.",
    detail:
      "For Meridian that means no automatic filing or certification. For Vantage, no autonomous investable/rejected decision. For Quorum, no silent approval of board actions.",
    signal: "refusal logic",
  },
  {
    title: "One governed core, many product P&Ls",
    proof: "Ingestion, governance, evidence, agent controls, and billing are shared. Buyer-facing workflows stay separate.",
    detail:
      "This lets Pinavia sell credible vertical products without rebuilding the infrastructure layer each time or forcing every buyer into the same vocabulary.",
    signal: "shared engine",
  },
  {
    title: "White-label governance for advisory firms",
    proof: "Nucleus is designed for partners that need their own methodology and brand on top of Pinavia controls.",
    detail:
      "Logos, accents, and templates can flex; status colours, trust patterns, human approval, and consequence previews stay contractually fixed.",
    signal: "partner-ready",
  },
];

const regulatedCaseStudies = [
  {
    entity: "Digital bank or EMI",
    stage: "Regulatory expansion",
    question: "Can we expand a product while our evidence file still has licensing and customer-protection gaps?",
    workflow: "Meridian scopes the jurisdiction, maps requirements, shows missing evidence, drafts a filing-pack outline, and routes caveats to counsel or compliance.",
    proof: "Requirement matrix, clause-level citations, missing-evidence list, human sign-off trail.",
    boundary: "Pinavia does not submit, certify, or sign the filing.",
  },
  {
    entity: "Board of a regulated company",
    stage: "Board meeting and circular resolution",
    question: "Do we have quorum, conflicts, and source-backed rationale before this agenda item is approved?",
    workflow: "Quorum assembles the board pack, checks quorum and conflicts, tracks director inputs, drafts minutes, and separates recommendations from approved resolutions.",
    proof: "Attendance record, agenda evidence, conflict register, minutes draft, approval status.",
    boundary: "Pinavia does not approve board decisions or replace directors' duties.",
  },
  {
    entity: "Investment manager or regulated fund",
    stage: "Deal diligence and IC memo",
    question: "Which red flags need investment committee attention before we move this deal forward?",
    workflow: "Vantage reads the deal room, measures coverage, clusters red flags, produces diligence questions, and drafts the IC handoff with cited evidence.",
    proof: "Coverage map, red-flag register, source-linked IC memo, unresolved questions.",
    boundary: "Pinavia does not mark a deal approved, investable, or rejected.",
  },
  {
    entity: "Professional services firm",
    stage: "Client delivery and white-label workflow",
    question: "Can our methodology become a governed client-facing workflow without losing our brand or control model?",
    workflow: "Nucleus packages methodology, deliverables, evidence requirements, reviewer checkpoints, and client-ready outputs under the firm's brand layer.",
    proof: "Method pack, deliverable coverage, reviewer queue, white-label boundary panel.",
    boundary: "Brand can change; core trust patterns and approval controls cannot.",
  },
];

const competitorDifferences = [
  {
    topic: "Primary problem",
    category: "Context-memory platforms reduce the cost and drift of repeatedly feeding knowledge back into AI.",
    pinavia: "Pinavia turns evidence into governed workflows where answers become decisions, approvals, minutes, filings, memos, and audit trails.",
  },
  {
    topic: "Buyer moment",
    category: "Best when the buyer asks: why is our AI expensive, repetitive, or losing context?",
    pinavia: "Best when the buyer asks: can we safely use AI in a board, regulatory, diligence, or client-delivery workflow?",
  },
  {
    topic: "Unit of value",
    category: "A better context layer: memory, retrieval, verification, and routing across AI usage.",
    pinavia: "A governed decision loop: source, answer, caveat, draft, owner, approval status, and proof artifact.",
  },
  {
    topic: "Governance boundary",
    category: "Verification explains why an answer can be trusted.",
    pinavia: "Verification plus authority control: the system also shows what AI is not allowed to approve, submit, sign, or decide.",
  },
  {
    topic: "Domain shape",
    category: "The layer is horizontal and model-adjacent, designed to improve many AI interactions.",
    pinavia: "The verticals are product-specific: Quorum, Meridian, Vantage, and Nucleus each own their objects, gates, and buyer language.",
  },
  {
    topic: "Pilot proof",
    category: "A diagnostic can show re-read cost, learning gaps, token waste, and context failure.",
    pinavia: "A diagnostic shows the first regulated workflow that can reach governed value proof: inputs, blockers, owner, approval path, and evidence readiness.",
  },
];

const overlapPoints = [
  "Both theses agree that model capability alone is not enough.",
  "Both care about verified context, source traceability, and model-agnostic infrastructure.",
  "Both reject the idea that a generic chat window is enough for enterprise AI.",
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

function USPSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="usp">
      <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <p className="micro-label text-white/35">04 / What is uniquely Pinavia</p>
          <h2 className="display-hero mt-5 text-white" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
            Built for the moment after an AI answer sounds convincing.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/55">
            Pinavia is not trying to be the loudest model interface. Its job is to make high-stakes
            AI work legible, sourced, bounded, and safe enough for regulated teams to use in front of
            boards, committees, clients, and regulators.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {specialUsps.map((item) => (
            <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold leading-6 text-white">{item.title}</h3>
                <span className="shrink-0 rounded-md border border-nexus-accent/30 bg-nexus-accent/5 px-2 py-1 text-[10px] text-nexus-accent">
                  {item.signal}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">{item.proof}</p>
              <p className="mt-3 text-xs leading-5 text-white/45">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RegulatedCaseStudiesSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="case-studies">
      <div className="border-t border-white/10 pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="micro-label text-white/35">06 / Regulated entity case studies</p>
            <h2 className="display-hero mt-5 max-w-4xl text-white" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
              The pitch gets stronger when the boundary is visible.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-white/45">
            These are representative regulated workflows for demos and pilots. They show the
            operating pattern without implying public customer endorsements.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          {regulatedCaseStudies.map((study) => (
            <article key={study.entity} className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="micro-label text-nexus-accent">{study.stage}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{study.entity}</h3>
                </div>
                <span className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/50">
                  Representative
                </span>
              </div>

              <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="micro-label text-white/35">Buyer question</p>
                <p className="mt-2 text-sm leading-6 text-white/75">{study.question}</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-white/35">Workflow</p>
                  <p className="mt-2 text-xs leading-5 text-white/55">{study.workflow}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-white/35">Proof artifact</p>
                  <p className="mt-2 text-xs leading-5 text-white/55">{study.proof}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-white/35">Boundary</p>
                  <p className="mt-2 text-xs leading-5 text-nexus-warn">{study.boundary}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetitiveDifferenceSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8" id="difference">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.035]">
        <div className="grid gap-8 border-b border-white/10 p-5 sm:p-6 lg:grid-cols-[0.78fr_1.22fr]">
          <div>
            <p className="micro-label text-white/35">05 / Why Pinavia is different</p>
            <h2 className="display-hero mt-5 text-white" style={{ fontSize: "clamp(2rem,4vw,3rem)" }}>
              Context memory is necessary. Governed action is the product.
            </h2>
          </div>
          <div className="space-y-5">
            <p className="text-sm leading-6 text-white/60">
              A context-memory company helps AI remember, retrieve, verify, and route knowledge more
              efficiently. Pinavia starts from the next operational question: what happens when that
              sourced answer needs to become a regulated decision with a named human accountable for
              the outcome?
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {overlapPoints.map((point) => (
                <div key={point} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <p className="text-xs leading-5 text-white/55">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid border-b border-white/10 bg-black/15 px-5 py-3 text-xs font-semibold uppercase text-white/35 sm:grid-cols-[0.55fr_1fr_1fr] sm:px-6">
          <span>Dimension</span>
          <span className="hidden sm:block">Context-memory infrastructure</span>
          <span className="hidden sm:block">Pinavia governed workflow infrastructure</span>
        </div>

        <div className="divide-y divide-white/10">
          {competitorDifferences.map((row) => (
            <article key={row.topic} className="grid gap-4 px-5 py-5 sm:grid-cols-[0.55fr_1fr_1fr] sm:px-6">
              <h3 className="text-sm font-semibold text-white">{row.topic}</h3>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-white/30 sm:hidden">
                  Context-memory infrastructure
                </p>
                <p className="text-sm leading-6 text-white/50">{row.category}</p>
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase text-nexus-accent sm:hidden">
                  Pinavia governed workflow infrastructure
                </p>
                <p className="text-sm leading-6 text-white/75">{row.pinavia}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="grid gap-4 bg-nexus-accent/5 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <p className="max-w-3xl text-sm leading-6 text-white/60">
            The diagnostic should therefore measure a different thing: not only whether AI is wasting
            tokens or losing context, but whether a specific high-stakes workflow has enough evidence,
            owners, approvals, and refusal boundaries to be safely piloted.
          </p>
          <Link href="/readiness" className="btn-primary px-5 py-3" prefetch={false}>
            Run the diagnostic
          </Link>
        </div>
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
            <p className="micro-label text-white/35">07 / Product family</p>
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
                Run the diagnostic
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
      <USPSection />
      <CompetitiveDifferenceSection />
      <RegulatedCaseStudiesSection />
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
