import { describe, expect, it } from "vitest";
import { deriveAcquisitionFunnel, derivePilotStages } from "@/lib/services/funnel";

describe("acquisition funnel derivation", () => {
  it("counts the three readiness events and computes redeem rate", () => {
    const events = [
      { type: "readiness.assessment_submitted" },
      { type: "readiness.assessment_submitted" },
      { type: "readiness.assessment_submitted" },
      { type: "readiness.assessment_submitted" },
      { type: "readiness.claim_email_sent" },
      { type: "readiness.claim_redeemed" },
      { type: "some.unrelated_event" },
    ];
    const f = deriveAcquisitionFunnel(events);
    expect(f.submitted).toBe(4);
    expect(f.claimsSent).toBe(1);
    expect(f.redeemed).toBe(1);
    expect(f.redeemRatePct).toBe(25);
  });

  it("returns a zero rate with no submissions rather than dividing by zero", () => {
    const f = deriveAcquisitionFunnel([{ type: "readiness.claim_redeemed" }]);
    expect(f.submitted).toBe(0);
    expect(f.redeemRatePct).toBe(0);
  });
});

describe("pilot-stage derivation", () => {
  const empty = {
    selectedWorkflow: null,
    evidenceCount: 0,
    briefCount: 0,
    approvalCount: 0,
    roiMeasurementCount: 0,
  };

  it("marks the first unsatisfied stage current and the rest pending", () => {
    const stages = derivePilotStages(empty);
    expect(stages.map((s) => s.status)).toEqual(["current", "pending", "pending", "pending", "pending"]);
    expect(stages[0].key).toBe("selected");
  });

  it("advances current to the first real gap when earlier stages are done", () => {
    const stages = derivePilotStages({ ...empty, selectedWorkflow: "Merchant Onboarding Risk Review", evidenceCount: 6 });
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.status]));
    expect(byKey.selected).toBe("done");
    expect(byKey.evidence).toBe("done");
    expect(byKey.first_brief).toBe("current");
    expect(byKey.review_loop).toBe("pending");
  });

  it("evaluates each stage on its own signal (non-contiguous is honest)", () => {
    // Evidence present but no workflow selected: selected is the current gap,
    // evidence still reads done rather than being masked.
    const stages = derivePilotStages({ ...empty, evidenceCount: 3 });
    const byKey = Object.fromEntries(stages.map((s) => [s.key, s.status]));
    expect(byKey.selected).toBe("current");
    expect(byKey.evidence).toBe("done");
  });

  it("marks all stages done when every signal is satisfied", () => {
    const stages = derivePilotStages({
      selectedWorkflow: "W",
      evidenceCount: 5,
      briefCount: 2,
      approvalCount: 1,
      roiMeasurementCount: 1,
    });
    expect(stages.every((s) => s.status === "done")).toBe(true);
  });
});
