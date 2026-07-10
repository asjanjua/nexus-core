import { describe, expect, it } from "vitest";
import { getEntityMemory } from "@/lib/services/entity-memory";
import { repository } from "@/lib/data/repository";

describe("entity memory", () => {
  it("returns linked evidence and timeline for an extracted entity", async () => {
    const entity = await repository.upsertEntity({
      workspaceId: "workspace-demo",
      evidenceId: "ev-001",
      type: "risk",
      name: "margin compression",
      confidence: 0.82,
      metadata: { source: "test" }
    });

    const memory = await getEntityMemory("workspace-demo", entity.id);

    expect(memory?.entity.id).toBe(entity.id);
    expect(memory?.evidence.map((record) => record.id)).toContain("ev-001");
    expect(memory?.timeline.some((item) => item.type === "evidence")).toBe(true);
  });

  it("returns null for an unknown entity", async () => {
    await expect(getEntityMemory("workspace-demo", "ent-missing")).resolves.toBeNull();
  });
});
