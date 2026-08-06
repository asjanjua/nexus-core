import { describe, expect, it } from "vitest";
import { auditKnowledgeWorkspace } from "@/lib/knowledge-audit";
import type { KnowledgeNote } from "@/lib/contracts";

function note(
  id: string,
  overrides: Partial<{
    title: string;
    body: string;
    tags: string[];
    evidenceRefs: string[];
    entityRefs: string[];
    updatedAt: string;
    status: KnowledgeNote["status"];
  }> = {},
): KnowledgeNote {
  return {
    id,
    workspaceId: "ws-test",
    title: overrides.title ?? `Note ${id}`,
    path: `/notes/${id}`,
    body: overrides.body ?? "Content here.",
    tags: overrides.tags ?? [],
    sensitivity: "internal",
    status: overrides.status ?? "active",
    sourceKind: "manual",
    frontmatter: {},
    evidenceRefs: overrides.evidenceRefs ?? [],
    entityRefs: overrides.entityRefs ?? [],
    workflowRefs: [],
    decisionRefs: [],
    recommendationRefs: [],
    createdBy: "tester",
    updatedBy: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-08-01T00:00:00Z",
  };
}

describe("duplicate detection", () => {
  it("detects near-identical titles", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { title: "Quarterly Revenue" }),
      note("2", { title: "Quarterly Reveneu" }),
    ]);
    expect(report.duplicates.length).toBe(1);
    expect(report.duplicates[0].reason).toContain("Near-identical titles");
  });

  it("detects shared evidence references", () => {
    // Give them different titles so only evidence overlap triggers.
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { title: "Sales Summary", evidenceRefs: ["ev-a", "ev-b"] }),
      note("2", { title: "Revenue Analysis", evidenceRefs: ["ev-a", "ev-b"] }),
    ]);
    expect(report.duplicates.length).toBe(1);
    expect(report.duplicates[0].reason).toContain("evidence");
  });

  it("does not flag unrelated notes", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { title: "Sales Report", evidenceRefs: ["ev-a"] }),
      note("2", { title: "HR Policy", evidenceRefs: ["ev-b"] }),
    ]);
    expect(report.duplicates.length).toBe(0);
  });
});

describe("contradiction detection", () => {
  it("detects opposing tags on shared entities", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { tags: ["risk-high"], entityRefs: ["ent-1"] }),
      note("2", { tags: ["risk-low"], entityRefs: ["ent-1"] }),
    ]);
    expect(report.contradictions.length).toBe(1);
    expect(report.contradictions[0].reason).toContain("risk-high");
  });

  it("detects opposing body keywords from shared evidence", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { body: "The audit found compliant processes.", evidenceRefs: ["ev-1"] }),
      note("2", { body: "This represents a violation.", evidenceRefs: ["ev-1"] }),
    ]);
    expect(report.contradictions.length).toBe(1);
    expect(report.contradictions[0].reason).toContain("compliant");
  });

  it("does not flag notes without shared refs", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { tags: ["risk-high"], entityRefs: ["ent-1"] }),
      note("2", { tags: ["risk-low"], entityRefs: ["ent-2"] }),
    ]);
    expect(report.contradictions.length).toBe(0);
  });
});

describe("staleness detection", () => {
  it("flags notes older than 90 days", () => {
    const old = new Date(Date.now() - 100 * 86_400_000).toISOString();
    const fresh = new Date().toISOString();
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { updatedAt: old }),
      // Give the fresh note content so it's not flagged as an orphan draft.
      note("2", { updatedAt: fresh, tags: ["verified"], body: "This is a substantive note with sufficient content to avoid the orphan-draft detector." }),
    ]);
    expect(report.stale.length).toBe(1);
    expect(report.stale[0].note.id).toBe("1");
  });

  it("flags orphan drafts with no tags or refs", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { tags: [], evidenceRefs: [], entityRefs: [], body: "x" }),
    ]);
    expect(report.stale.length).toBe(1);
    expect(report.stale[0].reason).toContain("Orphan");
  });
});

describe("report structure", () => {
  it("includes correct metadata", () => {
    // Give notes distinctly different titles so they aren't flagged as duplicates.
    const report = auditKnowledgeWorkspace("ws", [
      note("1", { title: "First Note", tags: ["verified"], body: "A substantive note with enough content to avoid the orphan-draft threshold." }),
      note("2", { title: "Second Note", tags: ["reviewed"], body: "Another substantive note with sufficient body content for the audit detector." }),
    ]);
    expect(report.workspaceId).toBe("ws");
    expect(report.totalNotes).toBe(2);
    expect(report.duplicates).toEqual([]);
    expect(report.contradictions).toEqual([]);
    expect(report.stale).toEqual([]);
    expect(report.generatedAt).toBeTruthy();
  });

  it("excludes deleted and archived notes", () => {
    const report = auditKnowledgeWorkspace("ws", [
      note("1"),
      note("2", { status: "deleted" }),
      note("3", { status: "archived" }),
    ]);
    expect(report.totalNotes).toBe(1);
  });
});
