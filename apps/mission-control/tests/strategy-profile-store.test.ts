/**
 * Strategy profiles are DB-backed, but must also work in no-DB/demo mode via
 * the in-memory store fallback. These tests exercise the repository with no
 * database configured (the default in the test env), so they prove the fallback
 * round-trips — the capability that was missing when the scorer first shipped.
 */
import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";

describe("strategy profile store fallback (no DB)", () => {
  it("round-trips an upserted profile through the store", async () => {
    const workspaceId = `ws-store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    expect(await repository.getStrategyProfile(workspaceId)).toBeNull();

    await repository.upsertStrategyProfile(workspaceId, {
      buyerLane: "business_advisory",
      sponsorName: "A. Sponsor",
      reviewerName: "R. Reviewer",
    });

    const read = await repository.getStrategyProfile(workspaceId);
    expect(read?.buyerLane).toBe("business_advisory");
    expect(read?.sponsorName).toBe("A. Sponsor");
    expect(read?.reviewerName).toBe("R. Reviewer");
    expect(read?.pilotReady).toBe(false);
  });

  it("persists pilotReady/pilotGates via setPilotReadiness and preserves other fields", async () => {
    const workspaceId = `ws-store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await repository.upsertStrategyProfile(workspaceId, {
      buyerLane: "regulated_enterprise",
      sponsorName: "S",
      reviewerName: "R",
    });

    await repository.setPilotReadiness(workspaceId, true, [
      { key: "sponsor_named", label: "Named sponsor", blocked: false },
    ]);

    const read = await repository.getStrategyProfile(workspaceId);
    expect(read?.pilotReady).toBe(true);
    expect(read?.pilotGates).toEqual([
      { key: "sponsor_named", label: "Named sponsor", blocked: false },
    ]);
    // setPilotReadiness must not clobber existing profile fields.
    expect(read?.buyerLane).toBe("regulated_enterprise");
    expect(read?.sponsorName).toBe("S");
  });

  it("creates a minimal profile if setPilotReadiness runs before any profile exists", async () => {
    const workspaceId = `ws-store-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    await repository.setPilotReadiness(workspaceId, false, []);

    const read = await repository.getStrategyProfile(workspaceId);
    expect(read).not.toBeNull();
    expect(read?.buyerLane).toBe("evaluator");
    expect(read?.pilotReady).toBe(false);
  });
});
