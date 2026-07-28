import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeNote, KnowledgeNoteInput, KnowledgeSearchResult } from "@/lib/contracts";

const mocks = vi.hoisted(() => ({
  listKnowledgeNotes: vi.fn(),
  upsertKnowledgeNote: vi.fn(),
  recordKnowledgeSyncEvent: vi.fn()
}));

vi.mock("@/lib/data/repository", () => ({
  repository: {
    listKnowledgeNotes: mocks.listKnowledgeNotes,
    upsertKnowledgeNote: mocks.upsertKnowledgeNote,
    recordKnowledgeSyncEvent: mocks.recordKnowledgeSyncEvent
  }
}));

const {
  exportKnowledgeVault,
  importKnowledgeVault,
  newKnowledgeNoteTemplate,
  summarizeSearchResults,
  triageKnowledgeInbox
} = await import("@/lib/services/knowledge");

function note(overrides: Partial<KnowledgeNote> = {}): KnowledgeNote {
  return {
    id: "note-1",
    workspaceId: "workspace-acme",
    title: "Weekly ops",
    path: "_Inbox/weekly-ops.md",
    body: "Notes about the week.",
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
    updatedBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-02T00:00:00.000Z",
    ...overrides
  };
}

function upsertedPaths(): string[] {
  return mocks.upsertKnowledgeNote.mock.calls.map((call) => (call[1] as KnowledgeNoteInput).path ?? "");
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listKnowledgeNotes.mockResolvedValue([]);
  mocks.recordKnowledgeSyncEvent.mockResolvedValue(undefined);
  mocks.upsertKnowledgeNote.mockImplementation(async (_workspaceId, input: KnowledgeNoteInput) =>
    note({ id: `note-${input.path}`, path: input.path ?? "", title: input.title })
  );
});

describe("exportKnowledgeVault", () => {
  it("writes every note to its vault path as markdown with frontmatter", async () => {
    mocks.listKnowledgeNotes.mockResolvedValue([
      note({ id: "note-1", path: "Projects/pilot.md", title: "Pilot", tags: ["project"] }),
      note({ id: "note-2", path: "Daily/2026-07-01.md", title: "Daily" })
    ]);

    const zip = await JSZip.loadAsync(await exportKnowledgeVault("workspace-acme"));

    expect(Object.keys(zip.files).filter((path) => path.endsWith(".md")).sort()).toEqual([
      "Daily/2026-07-01.md",
      "Projects/pilot.md"
    ]);
    const markdown = await zip.file("Projects/pilot.md")?.async("string");
    expect(markdown).toContain("title: \"Pilot\"");
    expect(markdown).toContain("Notes about the week.");
    expect(mocks.listKnowledgeNotes).toHaveBeenCalledWith("workspace-acme", { limit: 500 });
  });
});

describe("importKnowledgeVault", () => {
  async function zipBytes(files: Record<string, string>): Promise<Buffer> {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) zip.file(path, content, { createFolders: false });
    return zip.generateAsync({ type: "nodebuffer" });
  }

  it("imports markdown notes, extracting frontmatter, tags, and typed refs", async () => {
    const bytes = await zipBytes({
      "Projects/pilot-plan.md": [
        "---",
        "title: Pilot Plan",
        "sensitivity: confidential",
        "---",
        "#delivery Linked to evidence:ev-1 and entity:ent-2."
      ].join("\n")
    });

    const result = await importKnowledgeVault("workspace-acme", "user-1", bytes);

    expect(result).toMatchObject({ imported: 1, skipped: 0 });
    const input = mocks.upsertKnowledgeNote.mock.calls[0][1] as KnowledgeNoteInput;
    expect(input).toMatchObject({
      title: "Pilot Plan",
      path: "Projects/pilot-plan.md",
      sensitivity: "confidential",
      sourceKind: "import",
      status: "active",
      evidenceRefs: ["ev-1"],
      entityRefs: ["ent-2"]
    });
    expect(input.tags).toContain("delivery");
    expect(mocks.upsertKnowledgeNote.mock.calls[0][2]).toBe("user-1");
  });

  it("derives the title from the file name when frontmatter has none", async () => {
    const bytes = await zipBytes({ "Notes/quarterly-review.md": "Body only." });

    await importKnowledgeVault("workspace-acme", "user-1", bytes);

    expect((mocks.upsertKnowledgeNote.mock.calls[0][1] as KnowledgeNoteInput).title).toBe("quarterly review");
  });

  it("skips non-markdown entries and macOS metadata", async () => {
    const bytes = await zipBytes({
      "Notes/keep.md": "Keep me.",
      "Notes/image.png": "binary-ish",
      "__MACOSX/Notes/._keep.md": "junk"
    });

    const result = await importKnowledgeVault("workspace-acme", "user-1", bytes);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.notes).toEqual(["note-Notes/keep.md"]);
  });

  it("records a sync event summarising the import", async () => {
    const bytes = await zipBytes({ "Notes/a.md": "A", "Notes/b.md": "B" });

    await importKnowledgeVault("workspace-acme", "user-1", bytes);

    expect(mocks.recordKnowledgeSyncEvent).toHaveBeenCalledWith({
      workspaceId: "workspace-acme",
      type: "import",
      status: "success",
      message: "Imported 2 markdown notes.",
      path: null,
      noteId: null
    });
  });

  it("singularises the sync event message for a one-note import", async () => {
    await importKnowledgeVault("workspace-acme", "user-1", await zipBytes({ "Notes/a.md": "A" }));

    expect(mocks.recordKnowledgeSyncEvent.mock.calls[0][0].message).toBe("Imported 1 markdown note.");
  });
});

describe("triageKnowledgeInbox", () => {
  it("files inbox notes into the folder implied by their strongest reference", async () => {
    mocks.listKnowledgeNotes.mockResolvedValue([
      note({ id: "n-wf", title: "Twin", path: "_Inbox/twin.md", workflowRefs: ["wft-1"] }),
      note({ id: "n-ent", title: "Vendor", path: "_Inbox/vendor.md", entityRefs: ["ent-1"] }),
      note({ id: "n-ev", title: "Board pack", path: "_Inbox/board.md", evidenceRefs: ["ev-1"] }),
      note({ id: "n-proj", title: "Pilot", path: "_Inbox/pilot.md", tags: ["project"] }),
      note({ id: "n-daily", title: "Standup", path: "_Inbox/standup.md" })
    ]);

    const result = await triageKnowledgeInbox("workspace-acme", "user-1");

    expect(result.triaged).toBe(5);
    expect(upsertedPaths()).toEqual([
      "Workflows/Twin.md",
      "Entities/Vendor.md",
      "Sources/Board pack.md",
      "Projects/Pilot.md",
      "Daily/Standup.md"
    ]);
    expect((mocks.upsertKnowledgeNote.mock.calls[0][1] as KnowledgeNoteInput).sourceKind).toBe("automation");
    expect(mocks.upsertKnowledgeNote.mock.calls[0][3]).toBe("n-wf");
  });

  it("uses refs discovered in the body when the note has none recorded", async () => {
    mocks.listKnowledgeNotes.mockResolvedValue([
      note({ id: "n-body", title: "Migration", path: "_Inbox/migration.md", body: "See entity:ent-9 for context." })
    ]);

    await triageKnowledgeInbox("workspace-acme", "user-1");

    expect(upsertedPaths()).toEqual(["Entities/Migration.md"]);
  });

  it("leaves notes outside the inbox and unclassifiable inbox notes untouched", async () => {
    mocks.listKnowledgeNotes.mockResolvedValue([
      note({ id: "n-filed", path: "Projects/filed.md", workflowRefs: ["wft-1"] }),
      note({ id: "n-plain", title: "Misc", path: "_Inbox/misc.md", body: "Nothing to classify here." })
    ]);

    const result = await triageKnowledgeInbox("workspace-acme", "user-1");

    expect(result).toEqual({ triaged: 0, notes: [] });
    expect(mocks.upsertKnowledgeNote).not.toHaveBeenCalled();
  });
});

describe("newKnowledgeNoteTemplate", () => {
  it("defaults to an internal manual note in the inbox", () => {
    expect(newKnowledgeNoteTemplate()).toMatchObject({
      title: "Untitled",
      path: "_Inbox/untitled.md",
      body: "# Untitled\n\n",
      sensitivity: "internal",
      status: "active",
      sourceKind: "manual"
    });
  });

  it("slugifies the supplied title into the note path", () => {
    expect(newKnowledgeNoteTemplate("Q3 Board Pack")).toMatchObject({
      title: "Q3 Board Pack",
      path: "_Inbox/q3-board-pack.md",
      body: "# Q3 Board Pack\n\n"
    });
  });
});

describe("summarizeSearchResults", () => {
  it("projects search hits down to the fields the UI renders", () => {
    const results: KnowledgeSearchResult[] = [
      { note: note({ id: "note-7", title: "Pilot", path: "Projects/pilot.md" }), score: 0.42, matchedFields: ["title"], snippet: "Pilot plan" }
    ];

    expect(summarizeSearchResults(results)).toEqual([
      { id: "note-7", title: "Pilot", path: "Projects/pilot.md", score: 0.42, matchedFields: ["title"], snippet: "Pilot plan" }
    ]);
  });
});
