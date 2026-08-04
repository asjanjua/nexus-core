import { describe, expect, it } from "vitest";
import {
  buildReviewerConsoleItems,
  countReviewBlockers,
  PARSE_QUALITY_FLOOR,
  type ReviewReadinessInput,
} from "@/lib/nucleus-review-readiness";
import {
  PROTECTED_TRUST_ELEMENTS,
  isProtectedTrustElement,
} from "@/lib/forbidden-actions";

const CLEAN: ReviewReadinessInput = {
  integrity: { documents: 12, clean: 12, withFindings: 0, parseQualityScore: 0.92, findingCount: 0 },
  missingSourceSpanCount: 0,
  reviewerName: "S. Ahmed",
};

const row = (i: ReviewReadinessInput, label: string) =>
  buildReviewerConsoleItems(i).find((x) => x.label === label)!;

describe("buildReviewerConsoleItems", () => {
  it("always returns the same four rows", () => {
    expect(buildReviewerConsoleItems(CLEAN).map((i) => i.label)).toEqual([
      "Client deliverable",
      "Evidence appendix",
      "Named partner reviewer",
      "Trust contract",
    ]);
  });

  it("blocks nothing when evidence is clean and a partner is named", () => {
    expect(countReviewBlockers(buildReviewerConsoleItems(CLEAN))).toBe(0);
  });

  it("never marks the deliverable itself ready", () => {
    // Whether a conclusion is right is the partner's to own. That ownership is
    // what the client is paying the firm for.
    const r = row(CLEAN, "Client deliverable");
    expect(r.tone).toBe("draft");
    expect(r.state).toBe("Draft");
  });

  it("blocks the appendix when nothing has been ingested", () => {
    const r = row(
      {
        ...CLEAN,
        integrity: { documents: 0, clean: 0, withFindings: 0, parseQualityScore: 0, findingCount: 0 },
      },
      "Evidence appendix"
    );
    expect(r.tone).toBe("blocked");
    expect(r.state).toBe("Empty");
  });

  it("blocks the appendix when a document has no citable span", () => {
    // A citation a client cannot follow back is worse than none: it looks
    // verified. So this blocks rather than warns.
    const r = row({ ...CLEAN, missingSourceSpanCount: 1 }, "Evidence appendix");
    expect(r.tone).toBe("blocked");
    expect(r.detail).toContain("1 document has no citable source span");
  });

  it("blocks the appendix when mean parse quality is below the floor", () => {
    const below = {
      ...CLEAN,
      integrity: { ...CLEAN.integrity, parseQualityScore: PARSE_QUALITY_FLOOR - 0.01 },
    };
    expect(row(below, "Evidence appendix").tone).toBe("blocked");

    const at = {
      ...CLEAN,
      integrity: { ...CLEAN.integrity, parseQualityScore: PARSE_QUALITY_FLOOR },
    };
    expect(row(at, "Evidence appendix").tone).not.toBe("blocked");
  });

  it("downgrades rather than blocks on extraction findings alone", () => {
    // Findings are disclosable; an unfollowable citation is not.
    const r = row(
      {
        ...CLEAN,
        integrity: { documents: 12, clean: 9, withFindings: 3, parseQualityScore: 0.81, findingCount: 5 },
      },
      "Evidence appendix"
    );
    expect(r.tone).toBe("review");
    expect(r.detail).toContain("3 carry 5 extraction findings");
  });

  it("blocks when no reviewer seat has been accepted", () => {
    const r = row({ ...CLEAN, reviewerName: null }, "Named partner reviewer");
    expect(r.tone).toBe("blocked");
    expect(countReviewBlockers(buildReviewerConsoleItems({ ...CLEAN, reviewerName: null }))).toBe(1);
  });

  it("keeps the trust contract locked in every state", () => {
    for (const i of [CLEAN, { ...CLEAN, reviewerName: null }]) {
      const r = row(i, "Trust contract");
      expect(r.state).toBe("Locked");
    }
  });

  it("shows every protected element the release route actually enforces", () => {
    // The screen must not promise a client less protection than the route
    // delivers, so it is rendered from the enforced constant. If someone adds
    // an element and forgets the label, this fails.
    const detail = row(CLEAN, "Trust contract").detail;
    for (const key of PROTECTED_TRUST_ELEMENTS) {
      expect(isProtectedTrustElement(key)).toBe(true);
    }
    expect(detail.split(";")).toHaveLength(PROTECTED_TRUST_ELEMENTS.length);
  });

  it("counts independent blockers together", () => {
    const worst: ReviewReadinessInput = {
      integrity: { documents: 0, clean: 0, withFindings: 0, parseQualityScore: 0, findingCount: 0 },
      missingSourceSpanCount: 0,
      reviewerName: null,
    };
    expect(countReviewBlockers(buildReviewerConsoleItems(worst))).toBe(2);
  });
});

describe("isProtectedTrustElement", () => {
  it("matches case-insensitively and ignores surrounding space", () => {
    expect(isProtectedTrustElement("  Provenance ")).toBe(true);
    expect(isProtectedTrustElement("CAVEATS")).toBe(true);
  });

  it("does not match an unrelated suppression request", () => {
    // Restyling is allowed; concealment is not. The predicate has to tell
    // those apart or every branding tweak becomes a forbidden action.
    expect(isProtectedTrustElement("logo")).toBe(false);
    expect(isProtectedTrustElement("font")).toBe(false);
    expect(isProtectedTrustElement("cover_page")).toBe(false);
  });
});
