import type { Metadata } from "next";
import Link from "next/link";
import { PRICING_TIERS, ctaHref, selfServeCheckoutAvailable } from "@/lib/pricing-tiers";
import { ENGAGEMENT_WAIVER, waiverStatus } from "@/lib/diagnostic-offer";

export const metadata: Metadata = {
  title: "Pricing | Pinavia",
  description:
    "Pinavia pricing by team size. Starter for up to 10 people, Growth for 11 to 50, Enterprise from 51 people with scoping on a call.",
  alternates: { canonical: "/pricing" },
};

/**
 * Public pricing page. Renders from lib/pricing-tiers so the published numbers
 * and the ones the product reasons about cannot drift apart.
 *
 * Deliberately says what is NOT included in the price. A governance product
 * whose pricing page overstates what you get would undercut its own pitch on
 * the first page a buyer reads.
 */
export default function PricingPage() {
  const waiver = waiverStatus();
  // Server-side: is there a Stripe key to check out against at all?
  const selfServe = selfServeCheckoutAvailable();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-nexus-accent">Pricing</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight text-white">
          Priced by the size of the team, not by how much you upload.
        </h1>
        <p className="mt-4 text-sm leading-6 text-white/60">
          Every plan includes the governance record: provenance on each answer, the approval trail,
          and the boundaries that stop the system acting on your behalf. Those are not an upgrade.
        </p>
      </header>

      {/* Renders only while the window is open; waiverStatus() closes it on
          the date without anyone editing this page. */}
      {waiver.active && (
        <section className="mt-8 rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 px-4 py-3">
          <p className="text-sm font-medium text-nexus-accent">{ENGAGEMENT_WAIVER.headline}</p>
          <p className="mt-1 text-xs leading-5 text-white/60">{ENGAGEMENT_WAIVER.terms}</p>
          <Link href="/diagnostic" className="mt-2 inline-flex text-xs text-nexus-sky hover:underline">
            What the review covers
          </Link>
        </section>
      )}

      {/* Honest about the gap rather than letting a buyer find it at checkout. */}
      {!selfServe && (
        <section className="mt-8 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-sm font-medium text-white/80">Card payment is not switched on yet</p>
          <p className="mt-1 text-xs leading-5 text-white/55">
            These prices are final. Until self-serve checkout is live we set your plan up directly,
            which takes a short conversation.
          </p>
        </section>
      )}

      <section className="mt-12 grid gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`panel flex flex-col ${tier.key === "growth" ? "border-nexus-accent/40" : ""}`}
          >
            <p className="text-xs uppercase tracking-wide text-white/40">{tier.label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{tier.priceLabel}</p>
            <p className="mt-1 text-xs text-white/40">
              per month{tier.quoteRequired ? ", scoped on a call" : ""}
            </p>
            <p className="mt-4 text-sm font-medium text-nexus-sky">{tier.seatRangeLabel}</p>
            <p className="mt-3 flex-1 text-xs leading-5 text-white/55">{tier.positioning}</p>
            <Link
              href={ctaHref(tier, selfServe)}
              className={`mt-6 inline-flex justify-center rounded-lg px-4 py-2 text-sm ${
                tier.key === "growth" ? "btn-primary" : "btn-subtle"
              }`}
              prefetch={false}
            >
              {tier.quoteRequired || selfServe ? tier.cta.label : "Talk to us"}
            </Link>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="panel">
          <p className="panel-title">What every plan includes</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-white/60">
            <li>Evidence-backed answers with the source behind each one.</li>
            <li>An approval trail that survives the person who made the decision leaving.</li>
            <li>
              Enforced boundaries: the system prepares work but does not file, sign, approve, or
              release on anyone&apos;s behalf.
            </li>
            <li>Your data stays yours and is not used to train anything.</li>
          </ul>
        </div>
        <div className="panel border-nexus-warn/30">
          <p className="panel-title text-nexus-warn">What the price does not include</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-white/60">
            <li>
              Regulatory content review. Requirement packs are a starting point and need a
              qualified specialist before customer or regulator use.
            </li>
            <li>
              Advisory work. Implementation, licence applications, and diligence engagements are
              scoped separately.
            </li>
            <li>
              Data residency in a specific jurisdiction, which is an Enterprise conversation.
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-10 panel">
        <p className="panel-title">Which band am I in?</p>
        <p className="mt-2 text-xs leading-5 text-white/60">
          Count the people who will have a login. At exactly ten people you are on Starter. At
          eleven you move to Growth. Above fifty, Enterprise pricing starts at $2,500 a month and is
          set after a conversation about deployment, residency, and review obligations.
        </p>
        <Link href="/start-pilot" className="btn-primary mt-4 inline-flex text-sm" prefetch={false}>
          Talk it through
        </Link>
      </section>
    </main>
  );
}
