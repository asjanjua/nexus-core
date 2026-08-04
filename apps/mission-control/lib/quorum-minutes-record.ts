/**
 * Board record readiness: governance review result -> workbench rows.
 *
 * Pure, so the branching is testable; the screen only fetches and renders.
 *
 * The Quorum engine already computes the hard parts — board-pack completeness,
 * decision gaps, and the approval packet. This turns them into the four things
 * a secretary preparing minutes actually has to answer, in the order they are
 * asked: was the meeting properly constituted, were conflicts handled, are the
 * resolutions traceable, and does every action have a human owner.
 *
 * BOUNDARY. Nothing here makes a record official. Quorum may prepare a draft;
 * the chair and secretary approve, sign, and finalise. `recordReady` from the
 * engine means "nothing obvious is missing", never "this is the minute book".
 */

import type { PilotHandoffItem } from "@/components/pilot-handoff-workbench";

export type GovernanceFindingLike = {
  requirementId: string;
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  covered: boolean;
};

export type DecisionGapLike = {
  decisionId: string;
  title: string;
  reason:
    | "overdue_open_decision"
    | "no_follow_through_action"
    | "action_missing_owner"
    | "action_missing_due_date"
    | "open_blocker_action";
  detail: string;
};

export type MinutesRecordInput = {
  findings: GovernanceFindingLike[];
  decisionGaps: DecisionGapLike[];
  approvalItems: number;
};

/** Gaps that mean an action has no accountable human. */
const OWNERLESS: ReadonlySet<DecisionGapLike["reason"]> = new Set([
  "action_missing_owner",
  "action_missing_due_date",
  "no_follow_through_action",
]);

function finding(input: MinutesRecordInput, id: string): GovernanceFindingLike | undefined {
  return input.findings.find((f) => f.requirementId === id);
}

/** Covered only if the engine found a citation. Absent requirement is not covered. */
function covered(input: MinutesRecordInput, ...ids: string[]): boolean {
  return ids.every((id) => finding(input, id)?.covered === true);
}

export function buildMinutesRecordItems(input: MinutesRecordInput): PilotHandoffItem[] {
  const items: PilotHandoffItem[] = [];

  // 1. Was the meeting properly constituted? Notice and quorum together —
  //    a quorate meeting called without proper notice is still challengeable,
  //    so they are one question, not two ticks.
  const constituted = covered(input, "notice", "quorum");
  items.push(
    constituted
      ? {
          label: "Attendance and quorum",
          detail:
            "Notice and attendance records are cited. The secretary still confirms apologies and any item-level attendance limitation.",
          state: "Recorded",
          tone: "ready",
        }
      : {
          label: "Attendance and quorum",
          detail: `${!covered(input, "notice") ? "No meeting notice is cited. " : ""}${!covered(input, "quorum") ? "No attendance or quorum record is cited. " : ""}A record whose constitution cannot be evidenced is open to challenge.`,
          state: "Missing",
          tone: "blocked",
        }
  );

  // 2. Conflicts. Never "ready": a clean register still needs the chair to
  //    confirm nothing arose during the meeting itself, which no document
  //    ingested beforehand can show.
  items.push(
    covered(input, "conflicts")
      ? {
          label: "Conflict declaration",
          detail:
            "A conflicts register is cited. Item-level conflicts and recusals raised during the meeting still have to be entered by the secretary.",
          state: "Visible",
          tone: "warning",
        }
      : {
          label: "Conflict declaration",
          detail:
            "No conflicts register is cited. Conflicts and recusals must be recorded against the items they affect before the minutes are reviewable.",
          state: "Missing",
          tone: "blocked",
        }
  );

  // 3. Resolutions. Always a draft. Whether the wording matches what was
  //    actually resolved in the room is not knowable from documents.
  items.push({
    label: "Resolution draft",
    detail: covered(input, "resolutions")
      ? "Resolution documents are cited. The wording must still be checked against the board pack and what was actually decided in the meeting."
      : "No resolution document is cited. Resolution wording must be drafted and checked against the board pack and the meeting outcome.",
    state: "Review",
    tone: "draft",
  });

  // 4. Actions. The engine's decision gaps are the real signal here.
  const ownerless = input.decisionGaps.filter((g) => OWNERLESS.has(g.reason));
  items.push(
    ownerless.length > 0
      ? {
          label: "Management action",
          detail: `${ownerless.length} decision${ownerless.length === 1 ? "" : "s"} lack a followed-through action with an accountable owner and due date. ${ownerless[0].title}: ${ownerless[0].detail}`,
          state: "Owner needed",
          tone: "blocked",
        }
      : {
          label: "Management action",
          detail:
            input.decisionGaps.length > 0
              ? `${input.decisionGaps.length} open decision${input.decisionGaps.length === 1 ? " is" : "s are"} overdue or blocked, but each has an owner and a due date.`
              : "Every recorded decision has a followed-through action with an owner and a due date.",
          state: input.decisionGaps.length > 0 ? "Overdue" : "Owned",
          tone: input.decisionGaps.length > 0 ? "warning" : "ready",
        }
  );

  return items;
}

export function countMinutesBlockers(items: PilotHandoffItem[]): number {
  return items.filter((i) => i.tone === "blocked").length;
}
