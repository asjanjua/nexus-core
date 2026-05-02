import { describe, expect, it } from "vitest";
import { answerWithEvidence } from "@/lib/services/retrieval";

describe("ask retrieval", () => {
  it("returns evidence-backed answer for risk query", async () => {
    const response = await answerWithEvidence("top risks pricing", "workspace-demo");
    expect(response.refused).toBe(false);
    expect(response.evidenceRefs.length).toBeGreaterThan(0);
  });

  it("refuses when evidence is weak", async () => {
    const response = await answerWithEvidence("unknown-unmatched-topic-zzz", "workspace-demo");
    expect(response.refused).toBe(true);
    expect(response.refusalReason).toBe("insufficient_evidence");
  });
});
