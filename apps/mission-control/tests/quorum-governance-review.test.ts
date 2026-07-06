import { describe, expect, it } from "vitest";
import type { Action, Decision, EvidenceRecord } from "@/lib/contracts";
import {
  quorumGovernanceAuditEvents,
  reviewQuorumGovernance,
} from "@/lib/agents/quorum-governance-review";

const NOW = "2026-07-06T00:00:00.000Z";

function evidence(patch: Partial<EvidenceRecord> & { id: string; department: string }): EvidenceRecord {
  return {
    tenantId: "tenant-a",
    workspaceId: "board-a",
    sourceType: "document",
    sourcePath: `/board/${patch.id}.pdf`,
    sourceUri: `https://vault.local/${patch.id}`,
    sourceTimestamp: NOW,
    ingestedAt: NOW,
    hash: `sha256:${patch.id}`,
    sensitivity: "confidential",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 3,
    text: "Board pack content.",
    ...patch,
  };
}

function decision(patch: Partial<Decision> & { id: string }): Decision {
  return {
    workspaceId: "board-a",
    title: "Approve budget",
    owner: "chair",
    rationale: "Because.",
    status: "open",
    priority: "medium",
    evidenceRefs: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

function action(patch: Partial<Action> & { id: string; decisionId: string }): Action {
  return {
    workspaceId: "board-a",
    actionText: "Do the thing",
    owner: "cfo",
    isBlocker: false,
    status: "open",
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

describe("quorum governance review engine", () => {
  it("cites board-pack evidence to governance requirements", () => {
    const result = reviewQuorumGovernance({
      reviewId: "board-1",
      records: [evidence({ id: "quorum-doc", department: "Quorum", text: "Quorum confirmed, 6 of 7 directors present." })],
      decisions: [],
      actions: [],
      now: NOW,
    });

    const quorum = result.governanceFindings.find((f) => f.requirementId === "quorum");
    expect(quorum?.covered).toBe(true);
    expect(quorum?.citations[0].sourcePath).toBe("/board/quorum-doc.pdf");
  });

  it("marks the record not ready and caveats missing critical requirements", () => {
    const result = reviewQuorumGovernance({ reviewId: "board-2", records: [], decisions: [], actions: [], now: NOW });

    expect(result.summary.criticalGaps).toBeGreaterThan(0);
    expect(result.summary.recordReady).toBe(false);
    const missing = result.boardPackCaveats.filter((c) => c.source === "missing_requirement");
    expect(missing.some((c) => c.refId === "quorum")).toBe(true);
  });

  it("flags overdue open decisions", () => {
    const result = reviewQuorumGovernance({
      reviewId: "board-3",
      records: [],
      decisions: [decision({ id: "d1", status: "open", deadline: "2026-01-01T00:00:00.000Z" })],
      actions: [],
      now: NOW,
    });

    expect(result.decisionGaps.some((g) => g.reason === "overdue_open_decision")).toBe(true);
  });

  it("flags decided decisions with no follow-through action", () => {
    const result = reviewQuorumGovernance({
      reviewId: "board-4",
      records: [],
      decisions: [decision({ id: "d1", status: "decided" })],
      actions: [],
      now: NOW,
    });

    expect(result.decisionGaps.some((g) => g.reason === "no_follow_through_action")).toBe(true);
  });

  it("flags actions missing an owner or due date and open blockers", () => {
    const result = reviewQuorumGovernance({
      reviewId: "board-5",
      records: [],
      decisions: [decision({ id: "d1", status: "decided" })],
      actions: [
        action({ id: "a1", decisionId: "d1", owner: "", dueDate: null, isBlocker: true, status: "open" }),
      ],
      now: NOW,
    });

    const reasons = result.decisionGaps.map((g) => g.reason);
    expect(reasons).toContain("action_missing_owner");
    expect(reasons).toContain("action_missing_due_date");
    expect(reasons).toContain("open_blocker_action");
  });

  it("builds an approval packet with decided decisions and the human-approval boundary", () => {
    const result = reviewQuorumGovernance({
      reviewId: "board-6",
      records: [],
      decisions: [decision({ id: "d1", status: "decided" })],
      actions: [action({ id: "a1", decisionId: "d1" })],
      now: NOW,
    });

    expect(result.approvalPacket.some((i) => i.kind === "decision" && i.refId === "d1")).toBe(true);
    expect(result.approvalPacket.some((i) => i.refId === "human-approval-control")).toBe(true);
    expect(result.approvalPacket.every((i) => i.requiresHumanApproval)).toBe(true);
  });

  it("always includes the standing governance boundaries as caveats", () => {
    const result = reviewQuorumGovernance({ reviewId: "board-7", records: [], decisions: [], actions: [], now: NOW });
    const boundaries = result.boardPackCaveats.filter((c) => c.source === "governance_boundary");
    expect(boundaries.length).toBeGreaterThanOrEqual(3);
  });

  it("emits started and completed audit events with the summary", () => {
    const input = { reviewId: "board-8", records: [], decisions: [], actions: [] };
    const result = reviewQuorumGovernance({ ...input, now: NOW });
    const events = quorumGovernanceAuditEvents(input, result);

    expect(events.map((e) => e.type)).toEqual([
      "native_skill.quorum_governance_review.started",
      "native_skill.quorum_governance_review.completed",
    ]);
    expect(events[1].payload).toMatchObject({ reviewId: "board-8", recordReady: false });
  });
});
