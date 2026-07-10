import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";
import { store } from "@/lib/data/store";
import { isCronDue } from "@/lib/services/synthesis-schedule";

describe("scheduled synthesis", () => {
  it("matches weekly cron expressions inside the runner window", () => {
    const mondaySeven = new Date("2026-06-08T07:00:00.000Z");
    const mondaySevenFourteen = new Date("2026-06-08T07:14:00.000Z");
    const mondaySevenSixteen = new Date("2026-06-08T07:16:00.000Z");
    const tuesdaySeven = new Date("2026-06-09T07:00:00.000Z");

    expect(isCronDue("0 7 * * 1", "UTC", mondaySeven)).toBe(true);
    expect(isCronDue("0 7 * * 1", "UTC", mondaySevenFourteen)).toBe(true);
    expect(isCronDue("0 7 * * 1", "UTC", mondaySevenSixteen)).toBe(false);
    expect(isCronDue("0 7 * * 1", "UTC", tuesdaySeven)).toBe(false);
  });

  it("supports every-n-minute cron expressions", () => {
    expect(isCronDue("*/15 * * * *", "UTC", new Date("2026-06-08T07:30:00.000Z"))).toBe(true);
    expect(isCronDue("*/15 * * * *", "UTC", new Date("2026-06-08T07:44:00.000Z"))).toBe(true);
  });

  it("persists schedule updates and writes an audit event", async () => {
    const workspaceId = `workspace-synthesis-${Date.now()}`;
    const before = store.auditEvents.length;

    const saved = await repository.upsertSynthesisSchedule(
      workspaceId,
      {
        enabled: true,
        cron: "0 7 * * 1",
        timezone: "UTC",
        roles: ["ceo", "coo"],
        delivery: ["in_app"],
        emailTargets: [],
        slackChannel: null
      },
      "tester"
    );

    expect(saved.workspaceId).toBe(workspaceId);
    expect(saved.roles).toEqual(["ceo", "coo"]);
    expect(await repository.getSynthesisSchedule(workspaceId)).toMatchObject({
      workspaceId,
      cron: "0 7 * * 1"
    });
    expect(store.auditEvents.length).toBeGreaterThan(before);
  });
});
