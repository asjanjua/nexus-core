import { describe, expect, it } from "vitest";
import { BOUNDARIES, checkForbiddenAction } from "../lib/forbidden-actions";
import { vantageDDBoundaries } from "../lib/vantage-dd-workflow";

/**
 * Vantage decision boundary.
 *
 * Named by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md as
 * vantage-forbidden-decision.test.ts.
 *
 * Vantage prepares diligence; the investment committee decides. Two things
 * make this boundary distinct from Quorum's and Meridian's and are therefore
 * worth locking:
 *
 *   1. It is SYMMETRIC. Rejecting a deal autonomously is the same authority
 *      breach as approving one, and a guard that only blocks the optimistic
 *      direction is not a guard.
 *   2. The real risk is not a rogue Approve button — nobody built one. It is a
 *      recommendation posture with no named human behind it quietly becoming
 *      the committee's basis for a decision. That is enforced at the handoff
 *      route and asserted below via the registry.
 */

const FORBIDDEN = [
  "approve_deal",
  "mark_investable",
  "reject_deal",
  "clear_legally",
  "mark_risk_free",
];

describe("vantage forbidden decision", () => {
  it.each(FORBIDDEN)("refuses %s and audits it as vantage.decision_blocked", (action) => {
    const check = checkForbiddenAction("vantage", action);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.event).toBe("vantage.decision_blocked");
    }
  });

  it("blocks rejection exactly as firmly as approval", () => {
    const approve = checkForbiddenAction("vantage", "approve_deal");
    const reject = checkForbiddenAction("vantage", "reject_deal");
    expect(approve.allowed).toBe(false);
    expect(reject.allowed).toBe(false);
    // Same event, so an audit reader cannot infer that one direction was
    // treated as less serious than the other.
    if (!approve.allowed && !reject.allowed) {
      expect(reject.event).toBe(approve.event);
    }
  });

  it("blocks 'risk-free' and 'legally cleared' as decisions, not opinions", () => {
    // These read like descriptions but function as clearances. If the machine
    // may assert them, it has decided.
    expect(checkForbiddenAction("vantage", "mark_risk_free").allowed).toBe(false);
    expect(checkForbiddenAction("vantage", "clear_legally").allowed).toBe(false);
  });

  it("still permits the diligence work Vantage exists to do", () => {
    for (const allowed of ["draft_memo", "score_coverage", "raise_red_flag", "handoff"]) {
      expect(checkForbiddenAction("vantage", allowed).allowed).toBe(true);
    }
  });

  it("points a refused caller at the committee", () => {
    const check = checkForbiddenAction("vantage", "approve_deal");
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.humanPath).toMatch(/IC memo|decision-maker/i);
    }
  });

  it("enforces in code every verb the workflow registry forbids in prose", () => {
    // Prose and enforcement drifting apart is how a boundary becomes
    // decorative. Same guard as the Quorum suite.
    const rule = vantageDDBoundaries
      .find((b) => b.id === "no-investment-decision")
      ?.rule.toLowerCase();
    expect(rule, "no-investment-decision boundary missing from the registry").toBeDefined();

    const enforced = BOUNDARIES.vantage.forbiddenActions.join(" ");
    for (const verb of ["approved", "investable", "rejected"]) {
      expect(rule).toContain(verb);
    }
    // The enforcement uses imperative forms of the same three concepts.
    for (const action of ["approve_deal", "mark_investable", "reject_deal"]) {
      expect(enforced).toContain(action);
    }
  });

  it("requires the advisor-judgment boundary to exist for the handoff gate to mean anything", () => {
    // The handoff route refuses a posture with no named advisor. That refusal
    // is only legitimate because the registry demands the attribution.
    const judgment = vantageDDBoundaries.find((b) => b.id === "advisor-judgment-visible");
    expect(judgment, "advisor-judgment-visible boundary missing").toBeDefined();
    expect(judgment!.rule.toLowerCase()).toContain("human reviewer");
  });
});
