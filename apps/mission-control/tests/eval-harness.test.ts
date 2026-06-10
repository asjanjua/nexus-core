import { describe, expect, it } from "vitest";
import { GOLDEN_SET, validateGoldenSet } from "@/lib/eval/golden-set";
import { runEval } from "@/lib/eval/harness";

describe("eval harness", () => {
  it("validates the 30-case golden set", () => {
    expect(GOLDEN_SET).toHaveLength(30);
    expect(validateGoldenSet()).toBe(true);
  });

  it("scores passing and failing cases deterministically", async () => {
    const run = await runEval("workspace-test", async (_prompt, testCase) => ({
      text: `${testCase.expectedKeywords.join(" ")} Evidence confidence: 80%.`,
      confidence: 0.8
    }), GOLDEN_SET.slice(0, 3));

    expect(run.total).toBe(3);
    expect(run.passed).toBe(3);
    expect(run.passRate).toBe(1);

    const failing = await runEval("workspace-test", async () => ({
      text: "This is guaranteed and missing expected terms.",
      confidence: 0.2
    }), GOLDEN_SET.slice(0, 1));

    expect(failing.passed).toBe(0);
    expect(failing.results[0].passed).toBe(false);
  });
});
