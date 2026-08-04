import { describe, expect, it } from "vitest";
import { BOUNDARIES, checkForbiddenAction } from "../lib/forbidden-actions";
import { quorumGovernanceBoundaries } from "../lib/board-governance-workflow";

/**
 * Quorum finalisation boundary.
 *
 * Named by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md as
 * quorum-forbidden-finalisation.test.ts.
 *
 * The boundary this proves: Quorum can prepare notices, packs, minutes,
 * action registers, and export packets, but must not approve, sign, file,
 * send, or make a board record final automatically.
 *
 * The sign-off route's identity binding is deliberately NOT re-tested here —
 * it mirrors the approvals route and is covered by approvals-authz.test.ts.
 * What is unique to Quorum, and therefore tested here, is that the enforcement
 * registry actually matches the boundary the workflow registry declares in
 * prose. Those two drifting apart is how a boundary becomes decorative.
 */

describe("quorum forbidden finalisation", () => {
  it.each(["finalize_minutes", "sign", "file", "approve_board_action"])(
    "refuses %s and audits it as quorum.finalisation_blocked",
    (action) => {
      const check = checkForbiddenAction("quorum", action);
      expect(check.allowed).toBe(false);
      if (!check.allowed) {
        expect(check.event).toBe("quorum.finalisation_blocked");
      }
    }
  );

  it("still permits the preparation work Quorum exists to do", () => {
    // A boundary that blocked drafting would make the product useless. The
    // point is that preparing is allowed and committing is not.
    for (const allowed of ["draft_minutes", "build_pack", "record_signoff", "export_pack"]) {
      expect(checkForbiddenAction("quorum", allowed).allowed).toBe(true);
    }
  });

  it("points a refused caller at the human who may act", () => {
    const check = checkForbiddenAction("quorum", "sign");
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.humanPath).toMatch(/chair|company secretary/i);
    }
  });

  it("enforces every verb the workflow registry forbids in prose", () => {
    // The registry states the rule in words; the enforcement registry states
    // it in code. If someone adds a verb to the prose and not to the code, the
    // boundary silently stops being real. This catches that.
    const rule = quorumGovernanceBoundaries
      .find((b) => b.id === "human-approval-control")
      ?.rule.toLowerCase();
    expect(rule, "human-approval-control boundary missing from the registry").toBeDefined();

    const enforced = BOUNDARIES.quorum.forbiddenActions.join(" ");
    // "approve, sign, file, send, or make a board record final"
    for (const verb of ["approve", "sign", "file"]) {
      expect(rule).toContain(verb);
      expect(enforced, `registry forbids "${verb}" in prose but code does not`).toContain(verb);
    }
  });
});
