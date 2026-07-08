import { describe, expect, it } from "vitest";
import { advisorFollowUpRecommended } from "@/lib/services/lane-assignment";

describe("low-confidence advisor follow-up", () => {
  it("recommends an advisor only when lane confidence is low", () => {
    expect(advisorFollowUpRecommended("low")).toBe(true);
    expect(advisorFollowUpRecommended("medium")).toBe(false);
    expect(advisorFollowUpRecommended("high")).toBe(false);
  });
});
