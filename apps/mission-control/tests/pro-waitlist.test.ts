import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";

describe("pro waitlist (migration 0037)", () => {
  it("returns null before any intent is recorded", async () => {
    const ws = `ws-pw-${Date.now()}-a`;
    expect(await repository.getProWaitlistEntry(ws)).toBeNull();
  });

  it("records Pro intent and reads it back", async () => {
    const ws = `ws-pw-${Date.now()}-b`;
    const entry = await repository.addProWaitlistEntry({
      id: `pw_test_${Date.now()}`,
      workspaceId: ws,
      email: "cfo@company.com",
      name: "A. CFO",
      note: "8-person finance team",
      createdBy: "user_admin",
    });
    expect(entry.email).toBe("cfo@company.com");
    const fetched = await repository.getProWaitlistEntry(ws);
    expect(fetched?.email).toBe("cfo@company.com");
    expect(fetched?.note).toContain("finance team");
  });

  it("upserts per workspace: a second submit updates the same record", async () => {
    const ws = `ws-pw-${Date.now()}-c`;
    const first = await repository.addProWaitlistEntry({
      id: `pw_first_${Date.now()}`,
      workspaceId: ws,
      email: "first@company.com",
      createdBy: "user_a",
    });
    const second = await repository.addProWaitlistEntry({
      id: `pw_second_${Date.now()}`,
      workspaceId: ws,
      email: "updated@company.com",
      createdBy: "user_a",
    });
    expect(second.id).toBe(first.id);
    expect((await repository.getProWaitlistEntry(ws))?.email).toBe("updated@company.com");
  });

  it("keeps intent separate per workspace", async () => {
    const wsA = `ws-pw-${Date.now()}-d`;
    const wsB = `ws-pw-${Date.now()}-e`;
    await repository.addProWaitlistEntry({ id: `pw_a_${Date.now()}`, workspaceId: wsA, email: "a@x.com", createdBy: "u" });
    await repository.addProWaitlistEntry({ id: `pw_b_${Date.now()}`, workspaceId: wsB, email: "b@x.com", createdBy: "u" });
    expect((await repository.getProWaitlistEntry(wsA))?.email).toBe("a@x.com");
    expect((await repository.getProWaitlistEntry(wsB))?.email).toBe("b@x.com");
  });
});
