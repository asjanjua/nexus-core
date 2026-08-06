import type { MetadataRoute } from "next";

/**
 * Crawler policy.
 *
 * Everything behind auth is disallowed explicitly rather than left to the
 * sign-in redirect. Two reasons: crawlers still burn rate-limited API budget
 * following those links, and a regulated buyer running a security review will
 * check that workspace surfaces are not advertised to search engines.
 *
 * Keep in sync with sitemap.ts.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pinavia.io";

/** Authenticated or operator-only surfaces. Never indexable. */
const DISALLOW = [
  "/api/",
  "/dashboard",
  "/ask",
  "/approvals",
  "/decisions",
  "/recommendations",
  "/review",
  "/evidence",
  "/entities",
  "/knowledge",
  "/eval",
  "/sources",
  "/ingestion",
  "/workflows",
  "/workspace",
  // Product room hubs and their arcs. Each is gated with requireWorkspaceId,
  // so a crawler following one reaches only a sign-in redirect while still
  // consuming rate-limited budget. This list has fallen behind four times as
  // new rooms shipped — tests/robots-coverage.test.ts now fails the build if
  // it happens again.
  "/rooms",
  "/meridian",
  "/vantage",
  "/nucleus",
  "/governance",
  "/settings",
  "/export",
  "/board",
  "/pilot/",
  "/pilot-kit",
  "/funnel",
  "/reviewer-seat",
  // Staff-only portal and single-use trial redeem links. Neither is public and
  // an indexed redeem URL would leak invite codes into search results.
  "/admin",
  "/invite",
  "/onboarding",
  "/sign-in",
  "/sign-up",
  "/login",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
