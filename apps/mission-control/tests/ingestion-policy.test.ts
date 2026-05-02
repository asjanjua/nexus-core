import { describe, expect, it } from "vitest";
import { deriveIngestionStatus } from "@/lib/services/ingestion";

/**
 * Three-tier routing (updated in Task 23):
 *   < 0.35  → quarantined       (very low quality — blocked)
 *   0.35–0.75 → pending_approval (moderate — needs human sign-off)
 *   > 0.75  → processed          (high confidence — auto-cleared)
 *   missing provenance → always quarantined regardless of confidence
 */
describe("ingestion policy", () => {
  // --- quarantine tier ---
  it("quarantines when provenance is missing regardless of confidence", () => {
    expect(deriveIngestionStatus(0.99, false)).toBe("quarantined");
    expect(deriveIngestionStatus(0.50, false)).toBe("quarantined");
  });

  it("quarantines when confidence is below 0.35 (very low quality)", () => {
    expect(deriveIngestionStatus(0.20, true)).toBe("quarantined");
    expect(deriveIngestionStatus(0.34, true)).toBe("quarantined");
  });

  // --- pending_approval tier ---
  it("routes to pending_approval for moderate confidence (0.35–0.75)", () => {
    expect(deriveIngestionStatus(0.35, true)).toBe("pending_approval");
    expect(deriveIngestionStatus(0.54, true)).toBe("pending_approval");
    expect(deriveIngestionStatus(0.72, true)).toBe("pending_approval");
    expect(deriveIngestionStatus(0.75, true)).toBe("pending_approval");
  });

  // --- processed tier ---
  it("auto-approves when provenance is present and confidence exceeds 0.75", () => {
    expect(deriveIngestionStatus(0.76, true)).toBe("processed");
    expect(deriveIngestionStatus(0.90, true)).toBe("processed");
    expect(deriveIngestionStatus(1.00, true)).toBe("processed");
  });
});

