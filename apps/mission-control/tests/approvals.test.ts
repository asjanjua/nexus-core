import { describe, expect, it } from "vitest";
import { store } from "@/lib/data/store";

describe("recommendation approvals", () => {
  it("updates recommendation status and appends audit event", () => {
    const before = store.auditEvents.length;
    const updated = store.updateRecommendationStatus("rec-001", "approved", "test_runner");
    expect(updated?.status).toBe("approved");
    expect(store.auditEvents.length).toBeGreaterThan(before);
  });
});

