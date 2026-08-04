import { describe, expect, it } from "vitest";
import {
  BOUNDARIES,
  FORBIDDEN_EVENT,
  ForbiddenActionError,
  assertActionAllowed,
  checkForbiddenAction,
  governedProductSchema,
  isForbiddenAction,
} from "../lib/forbidden-actions";

/**
 * Shared forbidden-action contract.
 *
 * The four per-product suites named in the trust contract
 * (quorum-forbidden-finalisation, meridian-forbidden-filing,
 * vantage-forbidden-decision, nucleus-forbidden-publish) each cover their own
 * product. This suite covers the properties that must hold ACROSS all four,
 * because that is where drift actually happens: a fifth vertical gets added,
 * or someone renames an event and only one product's test notices.
 */

describe("forbidden-action registry", () => {
  it("covers every governed product — a new vertical cannot be forgotten", () => {
    for (const product of governedProductSchema.options) {
      expect(BOUNDARIES[product], `no boundary declared for ${product}`).toBeDefined();
      expect(BOUNDARIES[product].forbiddenActions.length).toBeGreaterThan(0);
    }
  });

  it("uses the exact audit event names the contract specifies", () => {
    // These strings land in an audit trail a regulator may read. Renaming one
    // silently breaks the contract, so they are asserted literally.
    expect(FORBIDDEN_EVENT).toEqual({
      quorum: "quorum.finalisation_blocked",
      meridian: "meridian.filing_blocked",
      vantage: "vantage.decision_blocked",
      nucleus: "nucleus.publish_blocked",
    });
  });

  it("gives every refusal a human path, so a block is never a dead end", () => {
    for (const product of governedProductSchema.options) {
      const b = BOUNDARIES[product];
      expect(b.refusal.length).toBeGreaterThan(20);
      expect(b.humanPath.length).toBeGreaterThan(10);
    }
  });

  it("never reuses an audit event between products", () => {
    const events = Object.values(FORBIDDEN_EVENT);
    expect(new Set(events).size).toBe(events.length);
  });

  it("allows actions that are not on the forbidden list", () => {
    expect(isForbiddenAction("meridian", "draft_memo")).toBe(false);
    expect(checkForbiddenAction("meridian", "draft_memo").allowed).toBe(true);
    expect(() => assertActionAllowed("meridian", "draft_memo")).not.toThrow();
  });
});

describe("meridian-forbidden-filing", () => {
  // The severest boundary in the family: a filing leaves the system and goes
  // to a named regulator through an external channel.
  it.each(["file", "submit", "certify", "sign"])("blocks %s", (action) => {
    const check = checkForbiddenAction("meridian", action);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.event).toBe("meridian.filing_blocked");
      expect(check.humanPath).toMatch(/authorised filer/i);
    }
  });

  it("throws a typed error carrying the audit event", () => {
    try {
      assertActionAllowed("meridian", "submit");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenActionError);
      expect((err as ForbiddenActionError).event).toBe("meridian.filing_blocked");
    }
  });
});

describe("quorum-forbidden-finalisation", () => {
  it.each(["finalize_minutes", "sign", "file", "approve_board_action"])("blocks %s", (action) => {
    const check = checkForbiddenAction("quorum", action);
    expect(check.allowed).toBe(false);
    if (!check.allowed) expect(check.event).toBe("quorum.finalisation_blocked");
  });
});

describe("vantage-forbidden-decision", () => {
  it.each(["approve_deal", "mark_investable", "reject_deal", "clear_legally", "mark_risk_free"])(
    "blocks %s",
    (action) => {
      const check = checkForbiddenAction("vantage", action);
      expect(check.allowed).toBe(false);
      if (!check.allowed) expect(check.event).toBe("vantage.decision_blocked");
    }
  );

  it("blocks rejection as firmly as approval", () => {
    // Rejecting a deal autonomously is the same authority breach as approving
    // one. A guard that only blocks the optimistic direction is not a guard.
    expect(checkForbiddenAction("vantage", "reject_deal").allowed).toBe(false);
  });
});

describe("nucleus-forbidden-publish", () => {
  it.each(["publish_client_advice", "approve_for_firm", "conceal_trust_mechanics"])(
    "blocks %s",
    (action) => {
      const check = checkForbiddenAction("nucleus", action);
      expect(check.allowed).toBe(false);
      if (!check.allowed) expect(check.event).toBe("nucleus.publish_blocked");
    }
  );

  it("treats concealing trust mechanics as forbidden, not merely discouraged", () => {
    // The white-label promise is that a firm may restyle but not weaken
    // governance. If concealment were allowed, that promise is unenforceable.
    expect(isForbiddenAction("nucleus", "conceal_trust_mechanics")).toBe(true);
  });
});
