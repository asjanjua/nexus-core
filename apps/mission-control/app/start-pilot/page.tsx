import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Start a Pilot | Pinavia",
  description:
    "Start a governed AI pilot with Pinavia: choose the first workflow, prepare the evidence pack, and route into onboarding with human approval boundaries intact.",
  alternates: { canonical: "/start-pilot" },
};

const PILOT_OPTIONS = [
  {
    product: "NexusAI",
    route: "/dashboard/ceo",
    buyer: "Executive teams",
    firstWorkflow: "Evidence-backed Ask \u2192 draft decision \u2192 approval",
    bestWhen: "You need one board-level operating loop across documents, risks, actions, and decisions.",
    accent: "border-nexus-accent/30 bg-nexus-accent/10 text-nexus-accent",
  },
  {
    product: "Quorum",
    route: "/board",
    buyer: "Boards and company secretariat teams",
    firstWorkflow: "Board pack \u2192 quorum \u2192 decisions \u2192 minutes",
    bestWhen: "You need directors to see what changed, what is approved, and what remains unresolved.",
    accent: "border-[#C0A062]/35 bg-[#C0A062]/10 text-[#E2C887]",
  },
  {
    product: "Meridian",
    route: "/meridian",
    buyer: "Regulated entities and compliance teams",
    firstWorkflow: "Scope \u2192 evidence coverage \u2192 gap triage \u2192 filing pack",
    bestWhen: "You need a reviewable regulatory pack, not an automated filing or legal certification.",
    accent: "border-[#3E7BFA]/35 bg-[#3E7BFA]/10 text-[#8FB5FF]",
  },
  {
    product: "Vantage",
    route: "/vantage",
    buyer: "Deal teams and investment committees",
    firstWorkflow: "Deal room \u2192 coverage \u2192 red flags \u2192 IC memo",
    bestWhen: "You need diligence coverage and red-flag triage while humans keep investment authority.",
    accent: "border-[#D9834A]/35 bg-[#D9834A]/10 text-[#F1B084]",
  },
  {
    product: "Nucleus",
    route: "/nucleus",
    buyer: "Consulting and advisory firms",
    firstWorkflow: "Firm profile \u2192 method package \u2192 delivery \u2192 assurance",
    bestWhen: "You need a white-label client engagement layer with fixed trust controls underneath.",
    accent: "border-[#9AA6B8]/35 bg-[#9AA6B8]/10 text-[#C8D1DE]",
  },
];

const REQUIRED_INPUTS = [
  "Sponsor name, role, and decision authority",
  "Pilot buyer lane: regulated enterprise, advisory firm, board, deal team, or executive team",
  "One high-stakes workflow to prove first",
  "Three to five representative documents or evidence sources",
  "Named reviewer for any output that leaves the system",
  "Success measure for Day 30, Day 60, and Day 90",
];

const PILOT_STEPS = [
  {
    label: "01",
    title: "Pick the first workflow",
    body: "Choose the product room and one narrow workflow. The pilot should prove one serious loop before it expands.",
  },
  {
    label: "02",
    title: "Prepare the evidence pack",
    body: "Bring a small, current set of board papers, regulatory sources, diligence files, or engagement material.",
  },
  {
    label: "03",
    title: "Create the workspace",
    body: "Sign up, complete onboarding, and confirm the sponsor, reviewer, role scope, and governance posture.",
  },
  {
    label: "04",
    title: "Run the governed loop",
    body: "Ask, cite sources, draft the decision or pack, and route anything consequential to a named human.",
  },
];

export default async function StartPilotPage({
  searchParams,
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const isDiagnosticIntent = params.intent === "diagnostic";

  return (
    <main className="min-h-screen bg-nexus-bg text-nexus-text">
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="micro-label text-nexus-accent">
              {isDiagnosticIntent ? "Diagnostic intake" : "Pilot start"}
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {isDiagnosticIntent ? "Start by scoping the evidence test." : "Start with one governed workflow."}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60">
              {isDiagnosticIntent
                ? "Pinavia diagnostics are deliberately narrow. Bring one sponsor, a small evidence pack, and the decisions you need tested before the pilot scope is agreed."
                : "Pinavia pilots are deliberately narrow at the start. Pick the first room, bring a small evidence pack, and prove the loop from source to human approval before expanding."}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up?redirect_url=/onboarding"
                className="btn-primary w-full justify-center px-5 py-3 sm:w-auto"
                prefetch={false}
              >
                Create pilot workspace
              </Link>
              <Link href="/diagnostic" className="btn-subtle w-full justify-center px-5 py-3 sm:w-auto" prefetch={false}>
                Run diagnostic first
              </Link>
              <a
                href="mailto:hello@pinavia.io?subject=Pinavia%20pilot%20scope"
                className="btn-subtle w-full justify-center px-5 py-3 sm:w-auto"
              >
                Email pilot scope
              </a>
            </div>

            <div className="mt-8 rounded-lg border border-nexus-warn/30 bg-nexus-warn/10 p-4">
              <p className="text-sm font-semibold text-nexus-warn">Launch boundary</p>
              <p className="mt-2 text-sm leading-6 text-amber-50/75">
                Pinavia can prepare, cite, draft, compare, and route work. It does not approve,
                sign, file, certify, submit, or make investment decisions. Those actions belong to
                named humans.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5">
            <p className="panel-title">What we need before kickoff</p>
            <div className="mt-4 grid gap-2">
              {REQUIRED_INPUTS.map((input) => (
                <div key={input} className="flex gap-3 rounded-md bg-black/20 px-3 py-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-nexus-accent" />
                  <p className="text-sm leading-5 text-white/65">{input}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {PILOT_STEPS.map((step) => (
            <div key={step.label} className="panel">
              <p className="text-xs font-semibold text-nexus-accent">{step.label}</p>
              <p className="mt-3 text-base font-semibold text-white">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/50">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="micro-label text-white/35">Choose the first room</p>
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
              The pilot should have one obvious buyer and one obvious workflow.
            </h2>
          </div>
          <Link href="/product-brief" className="btn-subtle px-4 py-2" prefetch={false}>
            Compare the product family
          </Link>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {PILOT_OPTIONS.map((option) => (
            <article key={option.product} className="panel flex min-h-[300px] flex-col">
              <div className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${option.accent}`}>
                {option.product}
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{option.buyer}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-white/35">First workflow</p>
              <p className="mt-1 text-sm leading-5 text-white/70">{option.firstWorkflow}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-white/35">Best when</p>
              <p className="mt-1 flex-1 text-sm leading-5 text-white/50">{option.bestWhen}</p>
              <Link href={option.route} className="mt-4 text-sm font-medium text-nexus-accent" prefetch={false}>
                Preview route
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-nexus-accent/25 bg-nexus-accent/5 p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="micro-label text-nexus-accent">Ready to start</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                Create the workspace when the sponsor and first workflow are clear.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                If the first workflow is still unclear, run the diagnostic first. If it is clear,
                create the workspace and complete onboarding with the pilot sponsor.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/sign-up?redirect_url=/onboarding"
                className="btn-primary w-full justify-center px-5 py-3 sm:w-auto"
                prefetch={false}
              >
                Create pilot workspace
              </Link>
              <Link href="/diagnostic" className="btn-subtle w-full justify-center px-5 py-3 sm:w-auto" prefetch={false}>
                Run diagnostic first
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
