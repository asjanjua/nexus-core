import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { vantageDDScreens } from "@/lib/vantage-dd-workflow";
import { evidenceDepth, type CoverageRow } from "@/lib/vantage-review-client";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const routeExists = (route: string) => existsSync(join(process.cwd(), "app", route, "page.tsx"));

/**
 * The Deal Room hub must not describe a route as live unless it exists, and
 * must not describe one as planned once it does.
 *
 * Both directions have bitten this product. The hub showed invented KPI
 * figures for months, and it labelled screens "planned deep route" whose data
 * the diligence runner was already computing and discarding. A buyer reading
 * either is being told something untrue about what they can use.
 */

const HUB = "components/vantage-deal-room-panel.tsx";

function builtRoutes(): string[] {
  const src = read(HUB);
  const block = src.slice(src.indexOf("const BUILT_ROUTES"), src.indexOf("]);", src.indexOf("const BUILT_ROUTES")));
  return [...block.matchAll(/"(\/vantage\/[a-z-]+)"/g)].map((m) => m[1]);
}

describe("Vantage deep routes", () => {
  it("every route the hub calls live actually exists", () => {
    for (const route of builtRoutes()) {
      expect(routeExists(route.replace(/^\//, "")), `${route} is claimed live but has no page`).toBe(true);
    }
  });

  it("every screen whose page exists is claimed live", () => {
    // The reverse drift: shipping a page and leaving the hub saying "planned",
    // which hides finished work from the person evaluating the product.
    const built = new Set(builtRoutes());
    for (const screen of vantageDDScreens) {
      if (routeExists(screen.routeCandidate.replace(/^\//, ""))) {
        expect(built.has(screen.routeCandidate), `${screen.routeCandidate} exists but the hub still calls it planned`).toBe(true);
      }
    }
  });

  it("the four new routes are all present", () => {
    for (const r of ["vantage/data-room", "vantage/evidence-depth", "vantage/ic-memo", "vantage/decision-handoff"]) {
      expect(routeExists(r), `${r} missing`).toBe(true);
    }
  });

  it("each new route is workspace-scoped", () => {
    // These read a client's data room. An unauthenticated or cross-tenant read
    // here is the worst possible bug in a diligence product.
    for (const r of ["vantage/data-room", "vantage/evidence-depth", "vantage/ic-memo", "vantage/decision-handoff"]) {
      expect(read(join("app", r, "page.tsx"))).toContain("requireWorkspaceId");
    }
  });

  it("each new route states the authority boundary", () => {
    // Vantage cannot mark a deal investable or rejected, and every screen that
    // touches the IC path has to say so where the user is, not in a policy doc.
    const surfaces = [
      "app/vantage/data-room/page.tsx",
      "components/vantage-evidence-depth.tsx",
      "components/vantage-ic-memo-builder.tsx",
      "components/vantage-decision-handoff.tsx",
    ];
    for (const f of surfaces) {
      expect(read(f).toLowerCase()).toMatch(/cannot (mark|approve)|does not recommend|not approved/);
    }
  });
});

/** Depth is the judgment this arc adds over binary coverage, so pin the rule. */
describe("evidenceDepth", () => {
  const row = (n: number, conf: number): CoverageRow => ({
    itemId: "i", category: "c", requirement: "r", severity: "critical", covered: true,
    citations: Array.from({ length: n }, (_, i) => ({
      evidenceId: `e${i}`, sourcePath: `/d/${i}.pdf`, sourceSpan: "p1", confidence: conf,
    })),
  });

  it("reports no source when nothing is cited", () => {
    expect(evidenceDepth(row(0, 0))).toBe("none");
  });

  it("treats a single citation as thin however confident it is", () => {
    // One document is one document. High confidence in a single source is not
    // corroboration, and this is the distinction the screen exists to make.
    expect(evidenceDepth(row(1, 0.99))).toBe("thin");
  });

  it("treats low mean confidence as thin even with several sources", () => {
    expect(evidenceDepth(row(4, 0.62))).toBe("thin");
  });

  it("requires three sources and high confidence to call it corroborated", () => {
    expect(evidenceDepth(row(3, 0.85))).toBe("corroborated");
    expect(evidenceDepth(row(2, 0.85))).toBe("supported");
  });

  it("flags an item that only just clears the runner threshold", () => {
    // 0.61 passes the runner's 0.6 bar and still must not carry a critical
    // requirement into committee unchallenged.
    expect(evidenceDepth(row(1, 0.61))).toBe("thin");
  });
});
