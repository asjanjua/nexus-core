import { describe, expect, it, vi } from "vitest";
import {
  guidanceForNucleusScreen,
  nucleusEngagementArcLabels,
  nucleusEngagementBoundaries,
  nucleusEngagementScreens,
  nucleusEngagementStages,
  nucleusScreenGuidance,
  nucleusScreensForArc,
  nucleusScreensForStage,
  nucleusWhiteLabelRequirements,
  safeNucleusScreensForStage,
  validateNucleusWorkflowIntegrity,
  type NucleusEngagementArc,
} from "@/lib/nucleus-engagement-workflow";

const nucleusArcs: NucleusEngagementArc[] = ["profile", "package", "delivery", "assurance"];

describe("Nucleus engagement workflow registry", () => {
  it("uses a consulting-platform lifecycle instead of the generic pivot template", () => {
    expect(Object.keys(nucleusEngagementArcLabels)).toEqual(nucleusArcs);
    expect(nucleusEngagementScreens).toHaveLength(8);
    expect(nucleusEngagementStages).toHaveLength(4);
  });

  it("groups screens by profile, package, delivery, and assurance arcs", () => {
    expect(nucleusScreensForArc("profile").map((screen) => screen.id)).toEqual([
      "firm-profile-brand",
      "methodology-catalog",
    ]);
    expect(nucleusScreensForArc("package").map((screen) => screen.id)).toEqual([
      "engagement-intake",
      "evidence-room-template",
    ]);
    expect(nucleusScreensForArc("delivery").map((screen) => screen.id)).toEqual([
      "deliverable-builder",
      "reviewer-console",
    ]);
    expect(nucleusScreensForArc("assurance").map((screen) => screen.id)).toEqual([
      "client-portal-preview",
      "operating-pack-publish",
    ]);
  });

  it("ensures every stage points at real Nucleus screens", () => {
    expect(validateNucleusWorkflowIntegrity()).toEqual([]);

    for (const stage of nucleusEngagementStages) {
      const screens = nucleusScreensForStage(stage);
      expect(screens.length).toBeGreaterThan(0);
      expect(screens.every((screen) => stage.screenIds.includes(screen.id))).toBe(true);
    }
  });

  it("offers a route-safe screen resolver for incomplete draft stages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const screens = safeNucleusScreensForStage({
      ...nucleusEngagementStages[0],
      screenIds: ["firm-profile-brand", "missing-screen"],
    });

    expect(screens.map((screen) => screen.id)).toEqual(["firm-profile-brand"]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Missing Nucleus engagement screens for stage define-firm-operating-model: missing-screen"
    );
    errorSpy.mockRestore();
  });

  it("keeps candidate routes and engagement objects explicit", () => {
    for (const screen of nucleusEngagementScreens) {
      expect(screen.routeCandidate).toMatch(/^\/nucleus\//);
      expect(screen.engagementObjects.length).toBeGreaterThan(0);
    }
  });

  it("pins the white-label trust boundary", () => {
    expect(nucleusEngagementBoundaries.map((boundary) => boundary.id)).toContain("fixed-trust-layer");
    expect(nucleusEngagementBoundaries.map((boundary) => boundary.id)).toContain("partner-owned-advice");
  });

  it("defines white-label launch requirements", () => {
    expect(nucleusWhiteLabelRequirements.map((requirement) => requirement.id)).toEqual([
      "overridable-brand-layer",
      "fixed-status-vocabulary",
      "method-pack-portability",
      "client-portal-control",
      "commercial-boundary",
    ]);
  });

  it("keeps user input and action guidance available for every screen", () => {
    expect(nucleusScreenGuidance.map((item) => item.screenId).sort()).toEqual(
      nucleusEngagementScreens.map((screen) => screen.id).sort()
    );

    for (const screen of nucleusEngagementScreens) {
      const guidance = guidanceForNucleusScreen(screen.id);
      expect(guidance.userInputs.length).toBeGreaterThanOrEqual(2);
      expect(guidance.actionPoints.length).toBeGreaterThanOrEqual(2);
    }
  });
});
