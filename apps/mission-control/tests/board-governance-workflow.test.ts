import { describe, expect, it, vi } from "vitest";
import {
  quorumGovernanceBoundaries,
  quorumGovernanceScreens,
  quorumGovernanceSources,
  quorumJurisdictionPackRequirements,
  quorumScreenGuidance,
  quorumWorkflowStages,
  guidanceForQuorumScreen,
  safeScreensForStage,
  screensForArc,
  screensForStage,
  validateQuorumWorkflowIntegrity,
} from "@/lib/board-governance-workflow";

describe("Quorum board governance workflow registry", () => {
  it("keeps the workflow expanded beyond the six-screen concept build", () => {
    expect(quorumGovernanceScreens).toHaveLength(17);
    expect(quorumWorkflowStages).toHaveLength(10);
  });

  it("groups the screens into the three board workflow arcs", () => {
    expect(screensForArc("setup").map((screen) => screen.id)).toEqual([
      "setup-wizard",
      "board-register",
      "committee-register",
      "tor-policy-library",
      "meeting-calendar",
    ]);

    expect(screensForArc("meeting").map((screen) => screen.id)).toContain("attendance-quorum");
    expect(screensForArc("meeting").map((screen) => screen.id)).toContain("decision-vote-capture");
    expect(screensForArc("record").map((screen) => screen.id)).toEqual([
      "minutes-drafting",
      "minutes-signoff",
      "action-register",
      "audit-pack",
    ]);
  });

  it("ensures every workflow stage points at real planned screens", () => {
    expect(validateQuorumWorkflowIntegrity()).toEqual([]);

    for (const stage of quorumWorkflowStages) {
      const screens = screensForStage(stage);
      expect(screens.length).toBeGreaterThan(0);
      expect(screens.every((screen) => stage.screenIds.includes(screen.id))).toBe(true);
    }
  });

  it("offers a route-safe screen resolver for incomplete draft stages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const screens = safeScreensForStage({
      ...quorumWorkflowStages[0],
      screenIds: ["setup-wizard", "missing-screen"],
    });

    expect(screens.map((screen) => screen.id)).toEqual(["setup-wizard"]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Missing Quorum governance screens for stage configure-board: missing-screen"
    );
    errorSpy.mockRestore();
  });

  it("anchors the Pakistan-first source pack on official SECP URLs", () => {
    expect(quorumGovernanceSources).toHaveLength(4);
    expect(quorumGovernanceSources.every((source) => source.jurisdiction === "Pakistan")).toBe(true);
    expect(quorumGovernanceSources.every((source) => source.url.startsWith("https://www.secp.gov.pk/"))).toBe(true);
  });

  it("formalizes Quorum's human-control boundaries and global pack requirements", () => {
    expect(quorumGovernanceBoundaries.map((boundary) => boundary.id)).toEqual([
      "no-legal-authority",
      "human-approval-control",
      "jurisdiction-review-required",
    ]);
    expect(quorumJurisdictionPackRequirements.map((requirement) => requirement.id)).toContain("official-sources");
    expect(quorumJurisdictionPackRequirements.map((requirement) => requirement.id)).toContain("qualified-reviewer");
  });

  it("keeps user input and action guidance available for every screen", () => {
    expect(quorumScreenGuidance.map((item) => item.screenId).sort()).toEqual(
      quorumGovernanceScreens.map((screen) => screen.id).sort()
    );

    for (const screen of quorumGovernanceScreens) {
      const guidance = guidanceForQuorumScreen(screen.id);
      expect(guidance.userInputs.length).toBeGreaterThanOrEqual(2);
      expect(guidance.actionPoints.length).toBeGreaterThanOrEqual(2);
    }
  });
});
