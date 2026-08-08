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
 *
 * DESIGN PASS 2026-08-08 against the locked design system. This page shipped
 * straight to code, and carried the marks of it:
 *
 *   - two `btn-primary` actions, so nothing was actually primary;
 *   - `text-3xl`/`text-4xl` (30px/36px), neither on the 12/14/16/20/24/32/40
 *     ramp;
 *   - `mt-10` (40px), off the 4/8/12/16/24/32/48/64 spacing scale;
 *   - five different white opacities standing in for the `nexus-muted` token,
 *     with `text-white/40` at 12px falling under the AA contrast floor;
 *   - the recommended tier distinguished by colour alone, so it vanished under
 *     the grayscale gate.
 *
 * The information architecture was already right — priced by team size, honest
 * about exclusions, honest about checkout not being live — so this pass changes
 * how it is expressed, not what it says.
 */

/** Small non-colour marker so a state never depends on hue alone. */
function NoticeIcon({ tone }: { tone: "offer" | "info" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "offer" ? "text-nexus-accent" : "text-nexus-warn"}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="6.5" />
      {tone === "offer" ? (
        <path d="M5.5 8.2l1.8 1.8 3.2-3.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 4.8v4M8 11.1v.1" strokeLinecap="round" />
      )}
    </svg>
  );
}

export default function PricingPage() {
  const waiver = waiverStatus();
  // Server-side: is there a Stripe key to check out against at all?
  const selfServe = selfServeCheckoutAvailable();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="max-w-2xl">
        <p className="text-xs uppercase tracking-[0.2em] text-nexus-accent">Pricing</p>
        {/* 32 -> 40 across the breakpoint; both are on the ramp, 36 was not. */}
        <h1 className="mt-3 text-[32px] font-semibold leading-tight text-nexus-text sm:text-[40px]">
          Priced by the size of the team, not by how much you upload.
        </h1>
        <p className="mt-4 text-base leading-6 text-nexus-muted">
          Every plan includes the governance record: provenance on each answer, the approval trail,
          and the boundaries that stop the system acting on your behalf. Those are not an upgrade.
        </p>
      </header>

      {/* Renders only while the window is open; waiverStatus() closes it on
          the date without anyone editing this page. */}
      {waiver.active && (
        <section className="mt-8 flex gap-3 rounded-lg border border-nexus-accent/30 bg-nexus-accent/5 px-4 py-3">
          <NoticeIcon tone="offer" />
          <div>
            <p className="text-sm font-semibold text-nexus-accent">{ENGAGEMENT_WAIVER.headline}</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">{ENGAGEMENT_WAIVER.terms}</p>
            <Link href="/diagnostic" className="mt-2 inline-flex text-xs text-nexus-sky hover:underline">
              What the review covers
            </Link>
          </div>
        </section>
      )}

      {/* Honest about the gap rather than letting a buyer find it at checkout.
          Amber, not grey: this is a live limitation the buyer must act around,
          and grey reads as boilerplate nobody needs to finish reading. */}
      {!selfServe && (
        <section className="mt-8 flex gap-3 rounded-lg border border-nexus-warn/30 bg-nexus-warn/5 px-4 py-3">
          <NoticeIcon tone="info" />
          <div>
            <p className="text-sm font-semibold text-nexus-warn">Card payment is not switched on yet</p>
            <p className="mt-1 text-xs leading-5 text-nexus-muted">
              These prices are final. Until self-serve checkout is live we set your plan up directly,
              which takes a short conversation.
            </p>
          </div>
        </section>
      )}

      <section className="mt-12 grid items-start gap-4 lg:grid-cols-3">
        {PRICING_TIERS.map((tier) => {
          const featured = tier.key === "growth";
          return (
            <div
              key={tier.key}
              className={`panel flex h-full flex-col ${
                // Raised surface + accent border + the chip below. Three signals,
                // only one of which is colour, so the recommendation survives
                // the grayscale gate.
                featured ? "border-nexus-accent/40 bg-white/[0.07]" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-nexus-muted">{tier.label}</p>
                {featured && (
                  <span className="rounded-md bg-nexus-accent/15 px-2 py-0.5 text-xs font-medium text-nexus-accent">
                    Most teams start here
                  </span>
                )}
              </div>

              {/* The one bold value in the panel — the display tier exists for
                  exactly this. */}
              <p className="mt-3 text-[32px] font-bold leading-none text-nexus-text">
                {tier.priceLabel}
              </p>
              <p className="mt-2 text-xs text-nexus-muted">
                per month{tier.quoteRequired ? ", scoped on a call" : ""}
              </p>

              <p className="mt-4 text-sm font-medium text-nexus-sky">{tier.seatRangeLabel}</p>
              <p className="mt-3 flex-1 text-sm leading-5 text-nexus-muted">{tier.positioning}</p>

              <Link
                href={ctaHref(tier, selfServe)}
                className={`mt-6 w-full ${featured ? "btn-primary" : "btn-subtle"}`}
                prefetch={false}
              >
                {tier.quoteRequired || selfServe ? tier.cta.label : "Talk to us"}
              </Link>
            </div>
          );
        })}
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="panel">
          <p className="panel-title">What every plan includes</p>
          <ul className="mt-3 space-y-2 text-sm leading-5 text-nexus-muted">
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
          <ul className="mt-3 space-y-2 text-sm leading-5 text-nexus-muted">
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

      <section className="panel mt-12">
        <p className="panel-title">Which band am I in?</p>
        <p className="mt-2 text-sm leading-5 text-nexus-muted">
          Count the people who will have a login. At exactly ten people you are on Starter. At
          eleven you move to Growth. Above fifty, Enterprise pricing starts at $2,500 a month and is
          set after a conversation about deployment, residency, and review obligations.
        </p>
        {/* Secondary on purpose. The page already has its one primary action in
            the Growth card; a second accent button here would compete with the
            thing we actually want a buyer to press. */}
        <Link href="/start-pilot" className="btn-subtle mt-4 inline-flex" prefetch={false}>
          Talk it through
        </Link>
      </section>
    </main>
  );
}
