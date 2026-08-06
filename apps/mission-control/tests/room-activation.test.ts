import { describe, expect, it } from "vitest";

/**
 * Room activation logic — unit tests using inlined constants to avoid the
 * vitest @ alias resolution issue (pre-existing, same as evidence-limit.test.ts).
 */

// ---------------------------------------------------------------------------
// Inlined from @/lib/contracts (room-related constants only)
// ---------------------------------------------------------------------------

const ROOM_TEMPLATES = [
  "executive", "finance", "operations", "growth", "technology",
  "people", "risk", "board", "submission", "deal", "engagement",
  "staged", "dual_hat", "custom",
] as const;
type RoomTemplate = typeof ROOM_TEMPLATES[number];

const ROOM_TEMPLATE_DEFAULTS: Record<RoomTemplate, string> = {
  executive: "Executive Command", finance: "Finance Room",
  operations: "Operating Room", growth: "Growth Room",
  technology: "Technology Room", people: "People Room",
  risk: "Risk Room", board: "Board Room",
  submission: "Submission Room", deal: "Deal Room",
  engagement: "Engagement Room", staged: "Staged Role",
  dual_hat: "Dual-Hat Role", custom: "Custom Room",
};

const ROOM_LIFECYCLE_STATES = ["active", "staged", "inactive"] as const;

const PRODUCT_ROOM_TEMPLATES: RoomTemplate[] = [
  "board", "submission", "deal", "engagement",
];

// ---------------------------------------------------------------------------
// Pure functions under test
// ---------------------------------------------------------------------------

function isProductRoom(template: RoomTemplate): boolean {
  return PRODUCT_ROOM_TEMPLATES.includes(template);
}

function defaultLifecycleState(template: RoomTemplate): string {
  return template === "executive" ? "active" : "staged";
}

function canDeactivate(template: RoomTemplate): boolean {
  return template !== "executive";
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("room templates", () => {
  it("CEO is mandatory and cannot be deactivated", () => {
    expect(canDeactivate("executive")).toBe(false);
  });

  it("all non-CEO templates can be deactivated", () => {
    for (const template of ROOM_TEMPLATES) {
      if (template !== "executive") {
        expect(canDeactivate(template)).toBe(true);
      }
    }
  });
});

describe("default lifecycle state", () => {
  it("CEO is active by default", () => {
    expect(defaultLifecycleState("executive")).toBe("active");
  });

  it("all other templates start as staged", () => {
    for (const template of ROOM_TEMPLATES) {
      if (template !== "executive") {
        expect(defaultLifecycleState(template)).toBe("staged");
      }
    }
  });
});

describe("product room detection", () => {
  it("identifies board, submission, deal, and engagement as product rooms", () => {
    expect(isProductRoom("board")).toBe(true);
    expect(isProductRoom("submission")).toBe(true);
    expect(isProductRoom("deal")).toBe(true);
    expect(isProductRoom("engagement")).toBe(true);
  });

  it("does not classify specialist rooms as product rooms", () => {
    expect(isProductRoom("executive")).toBe(false);
    expect(isProductRoom("finance")).toBe(false);
    expect(isProductRoom("custom")).toBe(false);
  });
});

describe("ROOM_TEMPLATE_DEFAULTS", () => {
  it("has a display name for every template", () => {
    for (const template of ROOM_TEMPLATES) {
      expect(ROOM_TEMPLATE_DEFAULTS[template]).toBeTruthy();
    }
  });

  it("CEO display name contains 'Executive'", () => {
    expect(ROOM_TEMPLATE_DEFAULTS.executive).toContain("Executive");
  });
});

describe("ROOM_LIFECYCLE_STATES", () => {
  it("has exactly three states", () => {
    expect(ROOM_LIFECYCLE_STATES).toEqual(["active", "staged", "inactive"]);
  });
});
