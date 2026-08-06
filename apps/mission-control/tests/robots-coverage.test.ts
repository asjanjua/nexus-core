import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

/**
 * Crawler-policy and public-shell coverage.
 *
 * WHY THIS EXISTS, and why deleting it is expensive:
 *
 * Two bug classes keep recurring because nothing fails when they happen.
 *
 *   1. A new authenticated route ships without a robots disallow entry.
 *      Crawlers follow it, hit a sign-in redirect, and consume rate-limited
 *      request budget. Happened for /meridian, /vantage, and /nucleus.
 *
 *   2. A route is advertised in sitemap.ts but is missing from the
 *      `isPublicShell` allowlist in app/layout.tsx. Google then indexes a URL
 *      that shows visitors a signed-out application frame instead of the page
 *      they were promised. Happened twice for /pro-waitlist — once fixed, then
 *      reintroduced when layout.tsx was rewritten, because this test had been
 *      removed in the meantime.
 *
 * Both are invisible in review and invisible at runtime. This file is the only
 * thing that makes them fail loudly. If it is in your way, fix the routing, do
 * not delete the test.
 */

const APP_DIR = join(__dirname, "..", "app");

/**
 * Routes reachable without a session. MUST mirror `isPublicShell` in
 * app/layout.tsx. Adding a public page means updating both.
 */
const PUBLIC_ROUTES = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/start-pilot",
  "/workspace",
  "/diagnostic",
  "/solutions",
  // Deliberately crawlable and high priority in the sitemap: pricing is the
  // page buyers search for by name.
  "/pricing",
  "/research",
  "/pro-waitlist",
  "/readiness",
  "/status",
  "/support",
  "/compliance",
  "/pilot-sla",
  "/terms",
  "/privacy",
  "/security",
  "/acceptable-use",
  "/data-processing",
  "/product-brief",
  // Legacy alias kept reachable; renders its own redirect to /sign-in.
  "/login",
]);

/** Walk app/ and collect every route that has a page.tsx. */
function discoverRoutes(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    // Route groups and private folders create no URL segment.
    if (entry.startsWith("_") || entry.startsWith("(")) continue;
    // Dynamic segments cannot be matched literally against a prefix list.
    if (entry.startsWith("[")) continue;
    if (entry === "api") continue;

    const routePath = `${prefix}/${entry}`;
    try {
      statSync(join(full, "page.tsx"));
      out.push(routePath);
    } catch {
      // No page at this level; keep descending.
    }
    out.push(...discoverRoutes(full, routePath));
  }
  return out;
}

describe("robots coverage", () => {
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;
  const disallow = ([] as string[]).concat(rule.disallow ?? []);
  const routes = discoverRoutes(APP_DIR);

  it("discovers the app routes", () => {
    expect(routes.length).toBeGreaterThan(30);
  });

  it("disallows every non-public route", () => {
    const uncovered = routes.filter((route) => {
      if (PUBLIC_ROUTES.has(route)) return false;
      return !disallow.some((d) => route === d || route.startsWith(d));
    });

    expect(
      uncovered,
      `Authenticated routes missing from robots disallow. Add them to DISALLOW in app/robots.ts:\n${uncovered.join("\n")}`
    ).toEqual([]);
  });

  it("never disallows a route that the sitemap advertises", () => {
    const advertised = sitemap().map((entry) => new URL(entry.url).pathname);
    const contradictions = advertised.filter((path) =>
      disallow.some((d) => path === d || (d !== "/" && path.startsWith(d)))
    );

    expect(
      contradictions,
      `sitemap.ts advertises paths that robots.ts disallows:\n${contradictions.join("\n")}`
    ).toEqual([]);
  });

  it("only advertises routes that render the public shell", () => {
    const advertised = sitemap().map((entry) => new URL(entry.url).pathname);
    const notPublic = advertised.filter((path) => !PUBLIC_ROUTES.has(path));

    expect(
      notPublic,
      `sitemap.ts advertises paths that are not public. Either add them to isPublicShell in app/layout.tsx (and to PUBLIC_ROUTES here), or remove them from the sitemap:\n${notPublic.join("\n")}`
    ).toEqual([]);
  });

  it("keeps PUBLIC_ROUTES in sync with isPublicShell in layout.tsx", () => {
    // Drift between these two lists is what let /pro-waitlist regress. Compare
    // against the actual source rather than trusting the constant above.
    const layout = readFileSync(join(APP_DIR, "layout.tsx"), "utf8");
    const block = layout.slice(
      layout.indexOf("const isPublicShell"),
      layout.indexOf("const showCompanySetupHelper")
    );
    const declared = new Set(
      [...block.matchAll(/"(\/[a-z0-9/-]*)"/g)].map((m) => m[1])
    );

    const missingHere = [...declared].filter((p) => !PUBLIC_ROUTES.has(p));
    expect(
      missingHere,
      `layout.tsx treats these as public but PUBLIC_ROUTES here does not:\n${missingHere.join("\n")}`
    ).toEqual([]);
  });
});
