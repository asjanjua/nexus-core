import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { repository } from "@/lib/data/repository";
import {
  buildKnowledgeGraph,
  buildKnowledgeLinks,
  extractKnowledge,
  parseFrontmatter,
  searchKnowledgeNotes,
  serializeFrontmatter
} from "@/lib/knowledge/markdown";
import {
  declaredUncompressedSize,
  importKnowledgeVault,
  MAX_IMPORT_ARCHIVE_BYTES,
} from "@/lib/services/knowledge";
import { safeVaultRelativePath } from "@/lib/services/vault-sync";

describe("knowledge workspace primitives", () => {
  it("round-trips frontmatter and extracts wikilinks, tags, headings, and refs", () => {
    const markdown = serializeFrontmatter(
      { title: "Risk Note", tags: ["risk"], evidence_refs: ["ev-001"] },
      "# Risk Note\n\nLinks to [[Pricing Review]] #pilot and workflow:wt-001."
    );
    const parsed = parseFrontmatter(markdown);
    const extracted = extractKnowledge(parsed.body, parsed.frontmatter);

    expect(parsed.frontmatter.title).toBe("Risk Note");
    expect(extracted.wikilinks).toEqual(["Pricing Review"]);
    expect(extracted.tags).toEqual(expect.arrayContaining(["risk", "pilot"]));
    expect(extracted.headings).toEqual(["Risk Note"]);
    expect(extracted.evidenceRefs).toEqual(["ev-001"]);
    expect(extracted.workflowRefs).toEqual(["wt-001"]);
  });

  it("creates notes, links, search results, and graph records", async () => {
    const workspaceId = `workspace-knowledge-${Date.now()}`;
    const note = await repository.upsertKnowledgeNote(
      workspaceId,
      {
        title: "Pilot Risk",
        path: "_Inbox/pilot-risk.md",
        body: "# Pilot Risk\n\nReview [[Pricing Review]] evidence:ev-001 #pilot",
        tags: [],
        sensitivity: "internal",
        status: "active",
        sourceKind: "manual",
        frontmatter: {},
        evidenceRefs: [],
        entityRefs: [],
        workflowRefs: [],
        decisionRefs: [],
        recommendationRefs: []
      },
      "tester"
    );

    const results = await repository.searchKnowledge(workspaceId, "pilot risk", 10);
    const links = await repository.listKnowledgeLinks(workspaceId, note.id);
    const graph = buildKnowledgeGraph([note], links);

    expect(results[0]?.note.id).toBe(note.id);
    expect(buildKnowledgeLinks(note).map((link) => link.targetType)).toEqual(expect.arrayContaining(["note", "evidence"]));
    expect(graph.nodes.some((node) => node.type === "evidence")).toBe(true);
    expect(searchKnowledgeNotes([note], "pilot", 1)[0]?.matchedFields).toContain("title");
  });

  // Explicit timeout: building the fixture deflates 40 MB in pure JS, which
  // costs ~0.9s alone but is CPU-bound and gets starved past the 5s default
  // when the full suite runs 140 files in parallel. The assertion is sound;
  // only the fixture is slow.
  it("skips a highly compressed import entry without inflating it", async () => {
    const zip = new JSZip();
    // 40 MB of one repeated byte deflates to a few kB, so the archive clears
    // the 25 MB cap while the entry alone would exceed it many times over.
    zip.file("bomb.md", "A".repeat(40 * 1024 * 1024));
    zip.file("_Inbox/real.md", "# Real Note\n\nSmall body.");
    const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    expect(bytes.byteLength).toBeLessThan(1024 * 1024);

    const result = await importKnowledgeVault(`workspace-import-${Date.now()}`, "tester", bytes);

    expect(result.imported).toBe(1);
    expect(result.notes).toHaveLength(1);
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it("rejects an archive over the size cap", async () => {
    await expect(
      importKnowledgeVault("workspace-import-cap", "tester", Buffer.alloc(26 * 1024 * 1024))
    ).rejects.toThrow("import_archive_too_large");
  });

  /**
   * DEPENDENCY GUARD, not a behaviour test. See §6.2 of the PR review.
   *
   * The zip-bomb defence reads `entry._data.uncompressedSize`, which is JSZip
   * internals. If a JSZip upgrade renames or restructures that field,
   * `declaredUncompressedSize` starts returning null and the guard is silently
   * disabled — the archive is then only caught AFTER inflation, by which point
   * the bomb is already resident.
   *
   * package.json pins jszip to an exact version so this cannot move by
   * accident. This test is the second layer: it turns a deliberate bump into a
   * red build instead of a quiet regression.
   *
   * If it fails after a jszip upgrade, do NOT delete it. Find the new field and
   * update `declaredUncompressedSize`.
   */
  it("can still read the declared uncompressed size from JSZip internals", async () => {
    const zip = new JSZip();
    zip.file("a.md", "x".repeat(5000));
    const loaded = await JSZip.loadAsync(
      await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" })
    );

    expect(declaredUncompressedSize(loaded.files["a.md"])).toBe(5000);
  });

  it("stops an archive whose entries together expand past the aggregate cap", async () => {
    // Each entry is under the 1 MB per-note cap and the count is under 1000,
    // so only the aggregate ceiling catches this shape.
    const zip = new JSZip();
    const oneNote = "B".repeat(900 * 1024);
    for (let i = 0; i < 140; i++) zip.file(`note-${i}.md`, oneNote);
    const bytes = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    expect(bytes.byteLength).toBeLessThan(MAX_IMPORT_ARCHIVE_BYTES);

    await expect(
      importKnowledgeVault(`workspace-agg-${Date.now()}`, "tester", bytes)
    ).rejects.toThrow("import_archive_expands_too_far");
  }, 60_000);

  it("rejects unsafe local vault paths", async () => {
    await expect(safeVaultRelativePath("/tmp/nexus-vault", "../secret.md")).rejects.toThrow("vault_path_traversal");
    await expect(safeVaultRelativePath("/tmp/nexus-vault", "_Inbox/.secret.md")).rejects.toThrow("vault_hidden_path_rejected");
    await expect(safeVaultRelativePath("/tmp/nexus-vault", "_Inbox/file.txt")).rejects.toThrow("vault_unsupported_extension");
    await expect(safeVaultRelativePath("/tmp/nexus-vault", "_Inbox/file.md")).resolves.toBe("_Inbox/file.md");
  });
});
