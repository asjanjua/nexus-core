import { describe, expect, it } from "vitest";
import { BOUNDARIES, checkForbiddenAction } from "../lib/forbidden-actions";
import { nucleusEngagementBoundaries } from "../lib/nucleus-engagement-workflow";

/**
 * Nucleus publish boundary.
 *
 * Named by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md as
 * nucleus-forbidden-publish.test.ts.
 *
 * Nucleus is sold to advisory firms on a specific promise: you may put your
 * brand on this, and you may not weaken its governance. That promise is only
 * worth something if concealment is a blocked ACTION rather than a discouraged
 * practice — which is why `conceal_trust_mechanics` sits in the forbidden list
 * beside publishing and approving, and is asserted here.
 */

const FORBIDDEN = ["publish_client_advice", "approve_for_firm", "conceal_trust_mechanics"];

describe("nucleus forbidden publish", () => {
  it.each(FORBIDDEN)("refuses %s and audits it as nucleus.publish_blocked", (action) => {
    const check = checkForbiddenAction("nucleus", action);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.event).toBe("nucleus.publish_blocked");
    }
  });

  it("treats concealing trust mechanics as forbidden, not merely discouraged", () => {
    // The white-label offer is "restyle freely, weaken nothing". If hiding the
    // trust layer were permitted-but-frowned-upon, that offer is unenforceable
    // and the governance guarantee is marketing rather than product.
    const check = checkForbiddenAction("nucleus", "conceal_trust_mechanics");
    expect(check.allowed).toBe(false);
  });

  it("blocks approving on the firm's behalf as firmly as publishing", () => {
    // Both put the machine in the partner's chair; neither is the lesser act.
    const publish = checkForbiddenAction("nucleus", "publish_client_advice");
    const approve = checkForbiddenAction("nucleus", "approve_for_firm");
    expect(publish.allowed).toBe(false);
    expect(approve.allowed).toBe(false);
    if (!publish.allowed && !approve.allowed) {
      expect(approve.event).toBe(publish.event);
    }
  });

  it("still permits the delivery work Nucleus exists to do", () => {
    for (const allowed of [
      "draft_deliverable",
      "build_methodology",
      "score_coverage",
      "release_to_client",
    ]) {
      expect(checkForbiddenAction("nucleus", allowed).allowed).toBe(true);
    }
  });

  it("points a refused caller at the partner review queue", () => {
    const check = checkForbiddenAction("nucleus", "publish_client_advice");
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.humanPath).toMatch(/partner review/i);
    }
  });

  it("enforces in code what the workflow registry forbids in prose", () => {
    // Prose and enforcement drifting apart is how a boundary becomes
    // decorative. Same guard as the Quorum and Vantage suites.
    const byId = (id: string) =>
      nucleusEngagementBoundaries.find((b) => b.id === id)?.rule.toLowerCase();

    const partnerOwned = byId("partner-owned-advice");
    const noHidden = byId("no-hidden-client-output");
    const fixedTrust = byId("fixed-trust-layer");

    expect(partnerOwned, "partner-owned-advice boundary missing").toBeDefined();
    expect(noHidden, "no-hidden-client-output boundary missing").toBeDefined();
    expect(fixedTrust, "fixed-trust-layer boundary missing").toBeDefined();

    // The firm, not the product, owns client-facing conclusions.
    expect(partnerOwned).toContain("approvals");

    // The disclosure triple the release route enforces.
    for (const disclosure of ["source coverage", "reviewer status", "caveats"]) {
      expect(noHidden, `no-hidden-client-output omits "${disclosure}"`).toContain(disclosure);
    }

    // Concealment is forbidden in code because the registry forbids altering
    // the trust layer in prose.
    expect(fixedTrust).toContain("provenance");
    expect(BOUNDARIES.nucleus.forbiddenActions).toContain("conceal_trust_mechanics");
  });
});
