import { describe, expect, it } from "vitest";
import { BOUNDARIES, checkForbiddenAction, assertActionAllowed, ForbiddenActionError } from "../lib/forbidden-actions";

/**
 * Meridian filing boundary.
 *
 * Named by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md as
 * meridian-forbidden-filing.test.ts. Quorum, Vantage and Nucleus each had
 * their file; Meridian's coverage lived only as a describe block inside
 * forbidden-actions.test.ts, so the one boundary with the most external
 * consequence was the one hardest to find.
 *
 * This is the severest boundary in the family. The other three fail inside the
 * customer's organisation: an unfinalised minute, an unmade investment call, an
 * unreleased deliverable. A filing leaves the building and arrives at a named
 * regulator, and it cannot be recalled. So the refusal has to hold on the
 * ACTION, not on a UI affordance that a different client could route around.
 */

const FORBIDDEN = ["file", "submit", "certify", "sign"];

describe("meridian forbidden filing", () => {
  it.each(FORBIDDEN)("refuses %s and audits it as meridian.filing_blocked", (action) => {
    const check = checkForbiddenAction("meridian", action);
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.event).toBe("meridian.filing_blocked");
    }
  });

  it("throws a typed error carrying the audit event", () => {
    // The audit record IS the feature here. An untyped throw would let a
    // caller degrade a refusal into a generic 500 and lose the trail.
    try {
      assertActionAllowed("meridian", "submit");
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenActionError);
      expect((err as ForbiddenActionError).event).toBe("meridian.filing_blocked");
    }
  });

  it("treats certifying as gravely as filing", () => {
    // Certifying is the quieter act and the more dangerous one: it asserts a
    // conclusion about compliance without anything leaving the system, so
    // nobody notices until a regulator relies on it.
    const file = checkForbiddenAction("meridian", "file");
    const certify = checkForbiddenAction("meridian", "certify");
    expect(file.allowed).toBe(false);
    expect(certify.allowed).toBe(false);
    if (!file.allowed && !certify.allowed) {
      expect(certify.event).toBe(file.event);
    }
  });

  it("points a refused caller at an authorised human filer", () => {
    const check = checkForbiddenAction("meridian", "file");
    expect(check.allowed).toBe(false);
    if (!check.allowed) {
      expect(check.humanPath).toMatch(/authorised filer/i);
      expect(check.refusal.length).toBeGreaterThan(0);
    }
  });

  it("still permits the preparation work Meridian exists to do", () => {
    // A boundary that blocked the product's actual job would be replaced by
    // whatever the customer used before it.
    for (const allowed of [
      "map_requirements",
      "score_coverage",
      "draft_memo",
      "assemble_filing_pack",
      "request_evidence",
    ]) {
      expect(checkForbiddenAction("meridian", allowed).allowed).toBe(true);
    }
  });

  it("keeps the registry entry and the event name in agreement", () => {
    // The event string is contractual: audit queries and the governance trace
    // both match on it, so a rename here silently breaks the record.
    expect(BOUNDARIES.meridian.event).toBe("meridian.filing_blocked");
    for (const action of FORBIDDEN) {
      expect(BOUNDARIES.meridian.forbiddenActions).toContain(action);
    }
  });
});
