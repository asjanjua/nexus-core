import { describe, it, expect } from "vitest";
import { generateWorkspaceSynthesis } from "@/lib/services/knowledge-synthesis";
import type { KnowledgeNote } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function note(id: string, overrides: Partial<KnowledgeNote> = {}): KnowledgeNote {
  return {
    id,
    workspaceId: "ws-1",
    title: `Note ${id}`,
    path: `/notes/${id}`,
    body: `Content of note ${id}`,
    tags: [],
    sensitivity: "internal",
    status: "active",
    sourceKind: "manual",
    frontmatter: {},
    evidenceRefs: [],
    entityRefs: [],
    workflowRefs: [],
    decisionRefs: [],
    recommendationRefs: [],
    createdBy: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("generateWorkspaceSynthesis", () => {
  it("handles empty notes gracefully", () => {
    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes: [],
      graphRefs: [],
      evidenceCount: 0,
    });
    expect(result.totalNotes).toBe(0);
    expect(result.totalLinks).toBe(0);
    expect(result.linkedEvidenceMap).toEqual([]);
    expect(result.themeSummary).toEqual([]);
    expect(result.followUpQuestions).toContain(
      "No evidence has been ingested. Upload documents to enable evidence-backed synthesis.",
    );
    expect(result.brief).toContain("0 notes");
  });

  it("builds linked evidence map from graph references", () => {
    const notes = [note("n1"), note("n2")];
    const graphRefs = [
      { sourceId: "n1", targetId: "ev-1", label: "references" },
      { sourceId: "n1", targetId: "ev-2", label: "references" },
      { sourceId: "n2", targetId: "ev-3", label: "other" }, // wrong label
    ];

    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs,
      evidenceCount: 2,
    });

    expect(result.linkedEvidenceMap).toHaveLength(2);
    expect(result.linkedEvidenceMap[0].evidenceRefs).toEqual(["ev-1", "ev-2"]);
    expect(result.linkedEvidenceMap[1].evidenceRefs).toEqual([]); // n2 ref has wrong label
  });

  it("extracts top themes from note tags", () => {
    const notes = [
      note("n1", { tags: ["strategy", "growth"] }),
      note("n2", { tags: ["strategy", "operations"] }),
      note("n3", { tags: ["strategy", "finance"] }),
      note("n4", { tags: ["operations"] }),
      note("n5", { tags: ["growth"] }),
    ];

    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs: [],
      evidenceCount: 0,
    });

    // "strategy" appears 3 times — top theme
    expect(result.themeSummary[0]).toBe("strategy");
    // "operations" = 2, "growth" = 2 — order among ties is stable by insertion
    expect(result.themeSummary).toContain("operations");
    expect(result.themeSummary).toContain("growth");
  });

  it("generates follow-up for notes without evidence", () => {
    const notes = [note("n1"), note("n2")];
    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs: [], // no graph refs = no evidence links
      evidenceCount: 0,
    });

    expect(result.followUpQuestions.some((q) => q.includes("no linked evidence"))).toBe(true);
  });

  it("suggests tagging untagged notes", () => {
    const notes = [note("n1", { tags: [] }), note("n2", { tags: ["strategy"] })];
    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs: [],
      evidenceCount: 0,
    });

    expect(result.followUpQuestions.some((q) => q.includes("no tags"))).toBe(true);
  });

  it("warns when more than half the notes are archived", () => {
    const notes = [
      note("n1", { status: "archived" }),
      note("n2", { status: "archived" }),
      note("n3", { status: "active" }),
    ];

    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs: [],
      evidenceCount: 0,
    });

    expect(result.followUpQuestions.some((q) => q.includes("half"))).toBe(true);
  });

  it("shows all-clear when workspace is well-organized", () => {
    // All notes have evidence links + tags + evidence count
    const notes = [note("n1", { tags: ["strategy"] })];
    const graphRefs = [{ sourceId: "n1", targetId: "ev-1", label: "references" }];

    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs,
      evidenceCount: 5,
    });

    expect(result.followUpQuestions).toEqual([
      "Your knowledge workspace is well-organized. No immediate actions needed.",
    ]);
  });

  it("includes evidence count in brief", () => {
    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes: [note("n1")],
      graphRefs: [],
      evidenceCount: 42,
    });

    expect(result.brief).toContain("42 total evidence records");
  });

  it("deduplicates evidence refs in linked map", () => {
    const notes = [note("n1")];
    const graphRefs = [
      { sourceId: "n1", targetId: "ev-1", label: "references" },
      { sourceId: "n1", targetId: "ev-1", label: "references" }, // duplicate
    ];

    const result = generateWorkspaceSynthesis({
      workspaceId: "ws-1",
      notes,
      graphRefs,
      evidenceCount: 1,
    });

    expect(result.linkedEvidenceMap[0].evidenceRefs).toEqual(["ev-1"]);
  });
});
