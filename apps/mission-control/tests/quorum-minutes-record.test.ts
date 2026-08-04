import { describe, expect, it } from "vitest";
import {
  buildMinutesRecordItems,
  countMinutesBlockers,
  type MinutesRecordInput,
} from "@/lib/quorum-minutes-record";

const ALL_COVERED = ["notice", "agenda", "quorum", "conflicts", "prior_minutes", "resolutions", "financials"];

function input(patch: Partial<MinutesRecordInput> & { uncovered?: string[] } = {}): MinutesRecordInput {
  const uncovered = new Set(patch.uncovered ?? []);
  return {
    findings: ALL_COVERED.map((id) => ({
      requirementId: id,
      label: id,
      severity: "high" as const,
      covered: !uncovered.has(id),
    })),
    decisionGaps: [],
    approvalItems: 0,
    ...patch,
  };
}

const row = (i: MinutesRecordInput, label: string) =>
  buildMinutesRecordItems(i).find((x) => x.label === label)!;

describe("buildMinutesRecordItems", () => {
  it("always returns the same four rows", () => {
    expect(buildMinutesRecordItems(input()).map((i) => i.label)).toEqual([
      "Attendance and quorum",
      "Conflict declaration",
      "Resolution draft",
      "Management action",
    ]);
    expect(buildMinutesRecordItems(input({ uncovered: ALL_COVERED }))).toHaveLength(4);
  });

  it("blocks nothing when the pack is complete and actions are owned", () => {
    expect(countMinutesBlockers(buildMinutesRecordItems(input()))).toBe(0);
  });

  it("treats notice and quorum as one question", () => {
    // A quorate meeting called without proper notice is still challengeable,
    // so either one missing must block the row.
    for (const missing of ["notice", "quorum"]) {
      const r = row(input({ uncovered: [missing] }), "Attendance and quorum");
      expect(r.tone, missing).toBe("blocked");
    }
    expect(row(input(), "Attendance and quorum").tone).toBe("ready");
  });

  it("names which of notice or quorum is missing", () => {
    expect(row(input({ uncovered: ["notice"] }), "Attendance and quorum").detail).toContain(
      "No meeting notice is cited"
    );
    expect(row(input({ uncovered: ["quorum"] }), "Attendance and quorum").detail).toContain(
      "No attendance or quorum record is cited"
    );
  });

  it("never marks conflicts fully clear", () => {
    // A clean register cannot show what arose during the meeting itself.
    const r = row(input(), "Conflict declaration");
    expect(r.tone).toBe("warning");
    expect(r.tone).not.toBe("ready");
  });

  it("blocks conflicts when no register is cited", () => {
    expect(row(input({ uncovered: ["conflicts"] }), "Conflict declaration").tone).toBe("blocked");
  });

  it("always leaves the resolution draft a draft", () => {
    // Whether wording matches what was resolved in the room is not knowable
    // from documents, covered or not.
    for (const i of [input(), input({ uncovered: ["resolutions"] })]) {
      expect(row(i, "Resolution draft").tone).toBe("draft");
      expect(row(i, "Resolution draft").state).toBe("Review");
    }
  });

  it("blocks on an action with no accountable owner", () => {
    const i = input({
      decisionGaps: [
        {
          decisionId: "d1",
          title: "Approve treasury policy",
          reason: "action_missing_owner",
          detail: "no owner assigned",
        },
      ],
    });
    const r = row(i, "Management action");
    expect(r.tone).toBe("blocked");
    expect(r.detail).toContain("Approve treasury policy");
  });

  it.each(["action_missing_owner", "action_missing_due_date", "no_follow_through_action"] as const)(
    "treats %s as ownerless",
    (reason) => {
      const i = input({
        decisionGaps: [{ decisionId: "d1", title: "T", reason, detail: "d" }],
      });
      expect(row(i, "Management action").tone).toBe("blocked");
    }
  );

  it("warns rather than blocks when decisions are overdue but owned", () => {
    // An overdue decision needs chasing, not a name. Blocking on it would make
    // the row useless as a signal for the thing that genuinely stops a record.
    const i = input({
      decisionGaps: [
        { decisionId: "d1", title: "T", reason: "overdue_open_decision", detail: "past due" },
      ],
    });
    const r = row(i, "Management action");
    expect(r.tone).toBe("warning");
    expect(r.state).toBe("Overdue");
    expect(countMinutesBlockers(buildMinutesRecordItems(i))).toBe(0);
  });

  it("counts independent blockers together", () => {
    const i = input({
      uncovered: ["notice", "conflicts"],
      decisionGaps: [
        { decisionId: "d1", title: "T", reason: "action_missing_owner", detail: "d" },
      ],
    });
    expect(countMinutesBlockers(buildMinutesRecordItems(i))).toBe(3);
  });

  it("treats an absent requirement as uncovered, not as covered", () => {
    // If the engine returns no finding for a requirement, silence must not
    // read as a pass.
    expect(buildMinutesRecordItems({ findings: [], decisionGaps: [], approvalItems: 0 })[0].tone).toBe(
      "blocked"
    );
  });
});
