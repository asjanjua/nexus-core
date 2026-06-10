import { describe, expect, it } from "vitest";
import { checkOutput } from "@/lib/security/red-team";

const ctx = { workspaceId: "workspace-test", maxSensitivity: "internal" as const };

describe("red-team checks", () => {
  it("passes clean executive output", () => {
    const result = checkOutput("Revenue risk increased based on two evidence records. Human review is recommended.", ctx);
    expect(result.passed).toBe(true);
  });

  it("detects PII and sanitizes it", () => {
    const result = checkOutput("Contact ali@example.com and use CNIC 35202-1234567-1.", ctx);
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.category === "pii")).toBe(true);
    expect(result.sanitizedContent).toContain("[redacted-email]");
  });

  it("detects unsupported certainty language", () => {
    const result = checkOutput("This plan is guaranteed and has no risk.", ctx);
    expect(result.violations.some((v) => v.category === "overconfidence")).toBe(true);
  });

  it("detects unsafe actions unless human review gate is set", () => {
    const blocked = checkOutput("Transfer funds to the supplier today.", ctx);
    expect(blocked.violations.some((v) => v.category === "unsafe_action")).toBe(true);

    const gated = checkOutput("Transfer funds to the supplier today.", { ...ctx, humanReviewGate: true });
    expect(gated.violations.some((v) => v.category === "unsafe_action")).toBe(false);
  });

  it("detects sensitivity ceiling violations", () => {
    const result = checkOutput("Confidential board detail.", {
      ...ctx,
      outputSensitivity: "confidential"
    });
    expect(result.violations.some((v) => v.category === "sensitivity")).toBe(true);
  });

  it("detects hard-stop action leakage", () => {
    const result = checkOutput("Please modify contract and post externally.", ctx);
    expect(result.violations.some((v) => v.category === "hard_stop")).toBe(true);
  });
});
