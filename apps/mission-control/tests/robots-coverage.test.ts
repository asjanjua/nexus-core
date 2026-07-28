import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import robots from "../app/robots";
import sitemap from "../app/sitemap";

/**
 * Crawler-policy coverage.
 *
 * This exists because the same bug recurred three times: a new product room
 * (/meridian, then /vantage, then /nucleus) shipped gated with
 * requireWorkspaceId but was never added to the robots disallow list.
 * Crawlers then follow the link, hit a sign-in redirect, and burn
 * rate-limited request budget — and nothing fails, so nobody notices.
 *
 * The rule enforced here: every route that is NOT explicitly public must be
 * covered by a robots disallow prefix. Adding a room without updating
 * robots.ts now fails the build.
 */

const APP_DIR = join(__dirname, "..", "app");

/**
 * Routes reachable without a session. Mirrors `isPublicShell` in
 * app/layout.tsx. If you add a public page, add it in BOTH places — this list
 * is the test's source of truth for "deliberately not disallowed".
 */
const PUBLIC_ROUTES = new Set([
  "/",
  "/sign-in",
  "/sign-up",
  "/start-pilot",
  "/workspace",
  "/diagnostic",
  "/pro-waitlist",
  "/readiness",
  "/terms",
  "/privacy",
  "/security",
  "/acceptable-use",
  "/data-processing",
  "/product-brief",
  "/login",
]);

/** Walk app/ and collect every route that has a page.tsx. */
function discoverRoutes(dir: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    // Route groups and private folders do not create URL segments.
    if (entry.startsWith("_") || entry.startsWith("(")) continue;
    // Dynamic segments cannot be matched literally against a prefix list.
    if (entry.startsWith("[")) continue;
    if (entry === "api") continue;

    const routePath = `${prefix}/${entry}`;
    try {
      statSync(join(full, "page.tsx"));
      out.push(routePath);
    } catch {
      // no page at this level, keep descending
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
    expect(routes.length).toBeGreaterThan(20);
  });

  it("disallows every non-public route", () => {
    const uncovered = routes.filter((route) => {
      if (PUBLIC_ROUTES.has(route)) return false;
      return !disallow.some((d) => route === d || route.startsWith(d));
    });

    expect(
      uncovered,
      `These routes are authenticated but not in robots disallow. Add them to DISALLOW in app/robots.ts:\n${uncovered.join("\n")}`
    ).toEqual([]);
  });

  it("never disallows a route that the sitemap advertises", () => {
    const advertised = sitemap().map((entry) => new URL(entry.url).pathname);
    const contradictions = advertised.filter((path) =>
      disallow.some((d) => path === d || (d !== "/" && path.startsWith(d)))
    );

    expect(
      contradictions,
      `Sitemap advertises paths that robots.txt disallows:\n${contradictions.join("\n")}`
    ).toEqual([]);
  });

  it("only advertises routes that render the public shell", () => {
    const advertised = sitemap().map((entry) => new URL(entry.url).pathname);
    const notPublic = advertised.filter((path) => !PUBLIC_ROUTES.has(path));

    expect(
      notPublic,
      `Sitemap advertises paths that are not in the public-shell allowlist. Either add them to isPublicShell in app/layout.tsx or remove them from the sitemap:\n${notPublic.join("\n")}`
    ).toEqual([]);
  });
});
