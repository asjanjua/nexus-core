import { describe, expect, it } from "vitest";
import {
  NEXUS_MODEL_ROUTING,
  PROVIDER_PROFILES,
  routePolicyFor
} from "@/lib/config/model-routing";

describe("Nexus model routing config", () => {
  it("defines a non-empty fallback chain for every route", () => {
    for (const route of NEXUS_MODEL_ROUTING) {
      expect(route.fallbackChain.length).toBeGreaterThan(0);
    }
  });

  it("only references known providers", () => {
    const known = new Set(Object.keys(PROVIDER_PROFILES));
    for (const route of NEXUS_MODEL_ROUTING) {
      for (const step of route.fallbackChain) {
        expect(known.has(step.provider)).toBe(true);
      }
    }
  });

  it("keeps experimental gateway models out of sponsor-facing final artifacts", () => {
    const forbiddenRoutes = NEXUS_MODEL_ROUTING.filter(
      (route) =>
        route.userVisible &&
        (route.id === "recommendation_final" ||
          route.id === "decision_memo" ||
          route.id === "dashboard_cards" ||
          route.id === "daily_executive_brief")
    );

    for (const route of forbiddenRoutes) {
      expect(route.fallbackChain.some((step) => step.provider === "experimental_gateway")).toBe(
        false
      );
    }
  });

  it("treats dashboard and decision outputs as premium by default", () => {
    expect(routePolicyFor("dashboard_cards").defaultTier).toBe("premium");
    expect(routePolicyFor("decision_memo").defaultTier).toBe("premium");
    expect(routePolicyFor("recommendation_final").defaultTier).toBe("premium");
  });
});
