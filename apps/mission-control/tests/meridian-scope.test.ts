import { describe, expect, it } from "vitest";
import { meridianScopeInputSchema } from "../lib/contracts";
import { store } from "../lib/data/store";

/**
 * Meridian scope contract + store round-trip.
 *
 * The store path is what runs when no DATABASE_URL is present, which is the
 * demo and local-dev case, so it has to behave identically to the DB upsert:
 * one scope per workspace, stable id and createdBy across updates.
 */

const VALID = {
  jurisdiction: "Pakistan",
  regulator: "State Bank of Pakistan",
  licenseType: "Electronic Money Institution",
  licenseStatus: "variation" as const,
  filingObjective: "Vary the EMI licence to add agent-network onboarding.",
  deadline: "2026-09-15",
  reviewerName: "O. Haddad",
};

describe("meridian scope contract", () => {
  it("accepts a valid scope", () => {
    expect(meridianScopeInputSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects an unknown licence status", () => {
    // A free-text status would select an empty requirement pack downstream
    // rather than failing loudly, which is why this is an enum.
    const bad = { ...VALID, licenseStatus: "pending-ish" };
    expect(meridianScopeInputSchema.safeParse(bad).success).toBe(false);
  });

  it("requires a regulator and a filing objective", () => {
    expect(meridianScopeInputSchema.safeParse({ ...VALID, regulator: "" }).success).toBe(false);
    expect(meridianScopeInputSchema.safeParse({ ...VALID, filingObjective: "" }).success).toBe(false);
  });

  it("allows a null deadline", () => {
    const parsed = meridianScopeInputSchema.safeParse({ ...VALID, deadline: null });
    expect(parsed.success).toBe(true);
  });
});

describe("meridian scope store fallback", () => {
  it("returns null before a scope is set", () => {
    expect(store.getMeridianScope("ws-empty")).toBeNull();
  });

  it("round-trips a scope", () => {
    const data = meridianScopeInputSchema.parse(VALID);
    const saved = store.upsertMeridianScope({
      id: "mrs_1",
      workspaceId: "ws-a",
      createdBy: "user-1",
      data,
    });
    expect(saved.regulator).toBe("State Bank of Pakistan");
    expect(store.getMeridianScope("ws-a")?.id).toBe("mrs_1");
  });

  it("upserts rather than duplicating, keeping id and creator stable", () => {
    const data = meridianScopeInputSchema.parse(VALID);
    store.upsertMeridianScope({ id: "mrs_2", workspaceId: "ws-b", createdBy: "user-1", data });
    const updated = store.upsertMeridianScope({
      id: "mrs_SHOULD_BE_IGNORED",
      workspaceId: "ws-b",
      createdBy: "user-2",
      data: { ...data, filingObjective: "Renew instead." },
    });

    expect(updated.id).toBe("mrs_2");
    expect(updated.createdBy).toBe("user-1");
    expect(updated.filingObjective).toBe("Renew instead.");
    expect(store.getMeridianScope("ws-b")?.filingObjective).toBe("Renew instead.");
  });

  it("isolates scopes between workspaces", () => {
    const data = meridianScopeInputSchema.parse(VALID);
    store.upsertMeridianScope({ id: "mrs_x", workspaceId: "ws-x", createdBy: "u", data });
    store.upsertMeridianScope({
      id: "mrs_y",
      workspaceId: "ws-y",
      createdBy: "u",
      data: { ...data, jurisdiction: "UAE", regulator: "CBUAE" },
    });

    expect(store.getMeridianScope("ws-x")?.jurisdiction).toBe("Pakistan");
    expect(store.getMeridianScope("ws-y")?.jurisdiction).toBe("UAE");
  });
});
