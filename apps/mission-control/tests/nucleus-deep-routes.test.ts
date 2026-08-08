import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { nucleusEngagementScreens } from "@/lib/nucleus-engagement-workflow";
import { PROTECTED_TRUST_ELEMENTS } from "@/lib/forbidden-actions";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const routeExists = (r: string) => existsSync(join(process.cwd(), "app", r, "page.tsx"));

const HUB = "components/nucleus-engagement-panel.tsx";

function builtRoutes(): string[] {
  const src = read(HUB);
  const start = src.indexOf("const BUILT_ROUTES");
  const block = src.slice(start, src.indexOf("]);", start));
  return [...block.matchAll(/"(\/nucleus\/[a-z-]+)"/g)].map((m) => m[1]);
}

/**
 * Nucleus is sold to consulting firms on one promise: brand what you like,
 * you cannot remove the trust layer. These tests guard the two ways that
 * promise can quietly stop being true — the hub lying about what is built, and
 * the publish screen hiding the boundary instead of demonstrating it.
 */
describe("Nucleus deep routes", () => {
  it("every route the hub calls live actually exists", () => {
    for (const r of builtRoutes()) {
      expect(routeExists(r.replace(/^\//, "")), `${r} claimed live, no page`).toBe(true);
    }
  });

  it("every screen whose page exists is claimed live", () => {
    const built = new Set(builtRoutes());
    for (const s of nucleusEngagementScreens) {
      if (routeExists(s.routeCandidate.replace(/^\//, ""))) {
        expect(built.has(s.routeCandidate), `${s.routeCandidate} exists but hub says planned`).toBe(true);
      }
    }
  });

  it("the new routes are present and workspace-scoped", () => {
    for (const r of ["nucleus/methodologies", "nucleus/publish"]) {
      expect(routeExists(r), `${r} missing`).toBe(true);
      expect(read(join("app", r, "page.tsx"))).toContain("requireWorkspaceId");
    }
  });
});

describe("publish screen exposes the boundary rather than hiding it", () => {
  const src = read("components/nucleus-client-release.tsx");

  it("offers every protected trust element as a suppression the API will refuse", () => {
    // Removing the toggles would make the screen pass a naive review and
    // destroy its purpose: a partner must be able to TRY to hide provenance
    // and watch the release be refused and audited.
    //
    // Asserted by MAPPING over the shared constant, not by looking for four
    // string literals. An earlier version of this test did the latter and
    // failed against correct code — hardcoding the list in the component would
    // let it drift from the list the API actually enforces, which is the bug
    // this test is supposed to prevent rather than require.
    expect(src).toContain("PROTECTED_TRUST_ELEMENTS.map");
    expect(src).toContain("PROTECTED_TRUST_ELEMENT_LABELS");
    expect(PROTECTED_TRUST_ELEMENTS.length).toBeGreaterThan(0);
  });

  it("does not disable the action until the form is complete", () => {
    // Client-side gating would skip the server refusal and, with it, the audit
    // record of the blocked attempt. The button is disabled only while in
    // flight.
    const button = src.slice(src.indexOf("onClick={release}"), src.indexOf("onClick={release}") + 200);
    expect(button).toContain("disabled={busy}");
    expect(button).not.toMatch(/disabled=\{[^}]*(partnerName|sourceCoverage|suppress)/);
  });

  it("distinguishes 'no caveats' from 'nobody answered'", () => {
    // The API treats an absent unresolvedCaveats differently from an empty
    // array, because "we checked, none" and "nobody looked" must not render
    // the same way to a client. The UI has to make that an explicit choice.
    expect(src).toContain("caveatsAnswered");
    expect(src).toContain("undefined");
  });

  it("explains the refusal in the partner's language, not a status code", () => {
    expect(src).toContain("conceal_trust_mechanics");
    expect(src.toLowerCase()).toContain("brand is yours");
  });
});
