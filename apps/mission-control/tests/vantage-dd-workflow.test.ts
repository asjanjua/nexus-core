import { describe, expect, it, vi } from "vitest";
import {
  vantageDDArcLabels,
  vantageDDBoundaries,
  vantageDDScreens,
  vantageDDStages,
  vantageMarketPackRequirements,
  vantageScreenGuidance,
  guidanceForVantageScreen,
  safeVantageScreensForStage,
  vantageScreensForArc,
  vantageScreensForStage,
  validateVantageWorkflowIntegrity,
  type VantageDDArc,
} from "@/lib/vantage-dd-workflow";

const vantageArcs: VantageDDArc[] = ["dealroom", "coverage", "redflags", "memo"];

describe("Vantage DD workflow registry", () => {
  it("uses a deal-domain lifecycle instead of the generic pivot template", () => {
    expect(Object.keys(vantageDDArcLabels)).toEqual(vantageArcs);
    expect(vantageDDScreens).toHaveLength(8);
    expect(vantageDDStages).toHaveLength(4);
  });

  it("groups screens by dealroom, coverage, red-flags, and memo arcs", () => {
    expect(vantageScreensForArc("dealroom").map((screen) => screen.id)).toEqual([
      "dealroom-setup",
      "data-room-index",
    ]);
    expect(vantageScreensForArc("coverage").map((screen) => screen.id)).toEqual([
      "checklist-coverage",
      "evidence-depth",
    ]);
    expect(vantageScreensForArc("redflags").map((screen) => screen.id)).toEqual([
      "red-flag-workbench",
      "advisor-judgment-log",
    ]);
    expect(vantageScreensForArc("memo").map((screen) => screen.id)).toEqual([
      "ic-memo-builder",
      "decision-handoff",
    ]);
  });

  it("ensures every stage points at real Vantage screens", () => {
    expect(validateVantageWorkflowIntegrity()).toEqual([]);

    for (const stage of vantageDDStages) {
      const screens = vantageScreensForStage(stage);
      expect(screens.length).toBeGreaterThan(0);
      expect(screens.every((screen) => stage.screenIds.includes(screen.id))).toBe(true);
    }
  });

  it("offers a route-safe screen resolver for incomplete draft stages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const screens = safeVantageScreensForStage({
      ...vantageDDStages[0],
      screenIds: ["dealroom-setup", "missing-screen"],
    });

    expect(screens.map((screen) => screen.id)).toEqual(["dealroom-setup"]);
    expect(errorSpy).toHaveBeenCalledWith("Missing Vantage DD screens for stage open-dealroom: missing-screen");
    errorSpy.mockRestore();
  });

  it("keeps candidate routes and deal objects explicit", () => {
    for (const screen of vantageDDScreens) {
      expect(screen.routeCandidate).toMatch(/^\/vantage\//);
      expect(screen.dealObjects.length).toBeGreaterThan(0);
    }
  });

  it("pins the investment-decision boundary", () => {
    expect(vantageDDBoundaries.map((boundary) => boundary.id)).toContain("no-investment-decision");
    expect(vantageDDBoundaries.map((boundary) => boundary.id)).toContain("source-backed-memo");
  });

  it("defines global market-pack requirements", () => {
    expect(vantageMarketPackRequirements.map((requirement) => requirement.id)).toEqual([
      "buyer-target-market",
      "sector-risk-overlay",
      "local-advisor-review",
      "materiality-thresholds",
      "data-room-localization",
      "decision-authority-boundary",
    ]);
  });

  it("keeps user input and action guidance available for every screen", () => {
    expect(vantageScreenGuidance.map((item) => item.screenId).sort()).toEqual(
      vantageDDScreens.map((screen) => screen.id).sort()
    );

    for (const screen of vantageDDScreens) {
      const guidance = guidanceForVantageScreen(screen.id);
      expect(guidance.userInputs.length).toBeGreaterThanOrEqual(2);
      expect(guidance.actionPoints.length).toBeGreaterThanOrEqual(2);
    }
  });
});
