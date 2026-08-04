import { describe, expect, it } from "vitest";
import { BANDS, bandMeta, toConfidenceBand } from "../lib/confidence-bands";

/**
 * Confidence bands are the contract-mandated primary trust signal
 * (docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md).
 *
 * The rules worth locking are the ones a future refactor would quietly break:
 * a score can never self-certify as Verified, absent evidence is never
 * optimistic, and Blocked outranks any score.
 */

describe("toConfidenceBand", () => {
  it("requires human review to reach Verified — a score cannot self-certify", () => {
    expect(toConfidenceBand(0.95)).toBe("supported");
    expect(toConfidenceBand(0.95, { humanReviewed: true })).toBe("verified");
  });

  it("treats absent or unusable scores as Limited, never as good news", () => {
    // "Absence of a finding is not assurance."
    expect(toConfidenceBand(null)).toBe("limited");
    expect(toConfidenceBand(undefined)).toBe("limited");
    expect(toConfidenceBand(Number.NaN)).toBe("limited");
  });

  it("lets Blocked override any score, because it is a state not a measure", () => {
    expect(toConfidenceBand(0.99, { humanReviewed: true, blocked: true })).toBe("blocked");
    expect(toConfidenceBand(0.1, { blocked: true })).toBe("blocked");
  });

  it("bands a mid score as Supported and a weak score as Limited", () => {
    expect(toConfidenceBand(0.82)).toBe("supported");
    expect(toConfidenceBand(0.6)).toBe("supported");
    expect(toConfidenceBand(0.59)).toBe("limited");
  });
});

describe("band metadata", () => {
  it("gives every band an explicit negative claim", () => {
    // The contract requires each band to state what it does NOT assert.
    for (const meta of Object.values(BANDS)) {
      expect(meta.notAClaimThat.length).toBeGreaterThan(10);
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it("gives every band a non-colour signal", () => {
    // Colour must never be the only carrier of state.
    const glyphs = Object.values(BANDS).map((b) => b.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("uses only locked palette tokens", () => {
    for (const meta of Object.values(BANDS)) {
      expect(meta.tone).toMatch(/^text-nexus-/);
      expect(meta.bg).toMatch(/^bg-nexus-/);
    }
  });

  it("resolves metadata straight from a score", () => {
    expect(bandMeta(0.3).label).toBe("Limited");
    expect(bandMeta(0.9, { humanReviewed: true }).label).toBe("Verified");
  });
});
