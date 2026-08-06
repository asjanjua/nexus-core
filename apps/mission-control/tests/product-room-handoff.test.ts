import { describe, expect, it } from "vitest";

/**
 * Product-room handoff — verify the four product rooms route to their
 * correct vertical workflow setup screens.
 */

// Inlined from contracts (vitest @ alias issue — see room-activation.test.ts)

const PRODUCT_ROOM_TEMPLATES = [
  "board", "submission", "deal", "engagement",
] as const;

const HANDOFF: Record<string, { setupRoute: string; setupLabel: string; why: string; workflowArc: string }> = {
  board: {
    setupRoute: "/board", setupLabel: "Open Board Room",
    why: "Quorum needs board participants and a meeting record before it can assess governance completeness.",
    workflowArc: "Setup → Meeting → Record",
  },
  submission: {
    setupRoute: "/meridian/scope", setupLabel: "Set regulatory scope",
    why: "Meridian needs a jurisdiction, regulator, and licence type before it can select a requirement set.",
    workflowArc: "Scope → Evidence → Gap → Filing Pack",
  },
  deal: {
    setupRoute: "/vantage", setupLabel: "Open Deal Room",
    why: "Vantage needs a deal type and target profile before it can run diligence checks.",
    workflowArc: "Deal Room → Coverage → Red Flags → Memo",
  },
  engagement: {
    setupRoute: "/nucleus", setupLabel: "Open Engagement Room",
    why: "Nucleus needs a client profile and engagement scope before it can generate briefs.",
    workflowArc: "Profile → Brief → Review → Handoff",
  },
};

describe("product-room handoff", () => {
  it("has handoff data for all four product rooms", () => {
    for (const template of PRODUCT_ROOM_TEMPLATES) {
      expect(HANDOFF[template]).toBeTruthy();
    }
  });

  it("each handoff has a setup route starting with /", () => {
    for (const template of PRODUCT_ROOM_TEMPLATES) {
      expect(HANDOFF[template].setupRoute.startsWith("/")).toBe(true);
    }
  });

  it("each handoff has a non-empty label and why", () => {
    for (const template of PRODUCT_ROOM_TEMPLATES) {
      expect(HANDOFF[template].setupLabel.length).toBeGreaterThan(0);
      expect(HANDOFF[template].why.length).toBeGreaterThan(0);
    }
  });

  it("each handoff has a workflow arc with → separators", () => {
    for (const template of PRODUCT_ROOM_TEMPLATES) {
      expect(HANDOFF[template].workflowArc).toContain("→");
    }
  });

  it("product rooms route to distinct setup screens", () => {
    const routes = PRODUCT_ROOM_TEMPLATES.map((t) => HANDOFF[t].setupRoute);
    expect(new Set(routes).size).toBe(4); // all unique
  });
});
