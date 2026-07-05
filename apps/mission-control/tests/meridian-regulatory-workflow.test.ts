import { describe, expect, it, vi } from "vitest";
import {
  meridianJurisdictionPackRequirements,
  meridianRegulatoryArcLabels,
  meridianRegulatoryBoundaries,
  meridianRegulatoryScreens,
  meridianRegulatoryStages,
  meridianScreenGuidance,
  guidanceForMeridianScreen,
  safeMeridianScreensForStage,
  meridianScreensForArc,
  meridianScreensForStage,
  validateMeridianWorkflowIntegrity,
  type MeridianRegulatoryArc,
} from "@/lib/meridian-regulatory-workflow";

const meridianArcs: MeridianRegulatoryArc[] = ["scope", "evidence", "gap", "filing"];

describe("Meridian regulatory workflow registry", () => {
  it("uses a regulatory-domain lifecycle instead of the generic pivot template", () => {
    expect(Object.keys(meridianRegulatoryArcLabels)).toEqual(meridianArcs);
    expect(meridianRegulatoryScreens).toHaveLength(8);
    expect(meridianRegulatoryStages).toHaveLength(4);
  });

  it("groups screens by scope, evidence, gap, and filing arcs", () => {
    expect(meridianScreensForArc("scope").map((screen) => screen.id)).toEqual([
      "regulatory-scope",
      "license-profile",
    ]);
    expect(meridianScreensForArc("evidence").map((screen) => screen.id)).toEqual([
      "requirement-library",
      "evidence-coverage",
    ]);
    expect(meridianScreensForArc("gap").map((screen) => screen.id)).toEqual([
      "gap-triage",
      "caveat-register",
    ]);
    expect(meridianScreensForArc("filing").map((screen) => screen.id)).toEqual([
      "submission-memo",
      "filing-pack",
    ]);
  });

  it("ensures every stage points at real Meridian screens", () => {
    expect(validateMeridianWorkflowIntegrity()).toEqual([]);

    for (const stage of meridianRegulatoryStages) {
      const screens = meridianScreensForStage(stage);
      expect(screens.length).toBeGreaterThan(0);
      expect(screens.every((screen) => stage.screenIds.includes(screen.id))).toBe(true);
    }
  });

  it("offers a route-safe screen resolver for incomplete draft stages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const screens = safeMeridianScreensForStage({
      ...meridianRegulatoryStages[0],
      screenIds: ["regulatory-scope", "missing-screen"],
    });

    expect(screens.map((screen) => screen.id)).toEqual(["regulatory-scope"]);
    expect(errorSpy).toHaveBeenCalledWith(
      "Missing Meridian regulatory screens for stage set-regulatory-scope: missing-screen"
    );
    errorSpy.mockRestore();
  });

  it("keeps candidate routes and regulatory objects explicit", () => {
    for (const screen of meridianRegulatoryScreens) {
      expect(screen.routeCandidate).toMatch(/^\/meridian\//);
      expect(screen.regulatoryObjects.length).toBeGreaterThan(0);
    }
  });

  it("pins the specialist-review boundary", () => {
    expect(meridianRegulatoryBoundaries.map((boundary) => boundary.id)).toContain("specialist-review-required");
    expect(meridianRegulatoryBoundaries.map((boundary) => boundary.id)).toContain("human-filing-control");
  });

  it("defines global jurisdiction-pack requirements", () => {
    expect(meridianJurisdictionPackRequirements.map((requirement) => requirement.id)).toEqual([
      "regulator-taxonomy",
      "official-source-catalog",
      "applicability-rules",
      "local-specialist-review",
      "translation-and-terminology",
      "filing-channel-boundary",
    ]);
  });

  it("keeps user input and action guidance available for every screen", () => {
    expect(meridianScreenGuidance.map((item) => item.screenId).sort()).toEqual(
      meridianRegulatoryScreens.map((screen) => screen.id).sort()
    );

    for (const screen of meridianRegulatoryScreens) {
      const guidance = guidanceForMeridianScreen(screen.id);
      expect(guidance.userInputs.length).toBeGreaterThanOrEqual(2);
      expect(guidance.actionPoints.length).toBeGreaterThanOrEqual(2);
    }
  });
});
