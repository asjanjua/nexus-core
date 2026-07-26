import Script from "next/script";

/**
 * Marketing analytics — cookieless, env-gated, inert by default.
 *
 * WHY NOT GA4: Google Analytics sets identifying cookies, which would oblige
 * a consent banner on our own marketing site and create PDPL/GDPR processing
 * we would then have to document in the DPA we hand regulated buyers. A
 * governance product asking a bank CFO to accept tracking cookies before
 * reading the security page is an own goal. Plausible is cookieless, stores
 * no personal data, needs no banner, and is EU-hosted.
 *
 * ENABLEMENT: renders nothing unless NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set, so
 * this is a no-op in development, in preview builds, and until you decide to
 * turn it on. Set it to the bare host, e.g. "pinavia.io".
 *
 * SELF-HOSTED: optionally set NEXT_PUBLIC_PLAUSIBLE_SRC to your own script
 * URL. Note the CSP in middleware must allow that origin in script-src, or
 * the tag will be blocked silently.
 *
 * ATTRIBUTION: Plausible reads UTM params automatically. For BD, tag links
 * you send by hand, e.g.
 *   https://pinavia.io/?utm_source=whatsapp&utm_campaign=gcc-emi-outreach
 * so a reply can be traced to the message that produced it.
 */

export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;

  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";

  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
