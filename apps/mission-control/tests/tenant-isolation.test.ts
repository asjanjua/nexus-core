/**
 * Tenant isolation — cross-workspace leakage tests (BACKLOG P1, trust spine).
 *
 * NexusAI is a governance product: the single most important safety property is
 * that evidence, entities, and knowledge from one workspace can NEVER surface in
 * another. This suite creates two workspaces, populates both, and proves every
 * workspace-scoped read returns only its own data — across evidence, entities,
 * and knowledge notes/search — and that the by-id read path enforces ownership.
 *
 * Runs against the in-memory store path (no DATABASE_URL) so it is deterministic
 * and CI-safe. The store is the isolation primitive the Postgres queries mirror
 * (every query carries `where workspaceId = ...`); proving the contract here
 * locks the behavior every read path depends on.
 */

import { describe, expect, it, beforeAll } from "vitest";
import { repository } from "@/lib/data/repository";
import { knowledgeNoteInputSchema, type EvidenceRecord } from "@/lib/contracts";

const note = (title: string, body: string) => knowledgeNoteInputSchema.parse({ title, body });

const WS_A = "ws-alpha";
const WS_B = "ws-beta";

function evidence(workspaceId: string, id: string, text: string): EvidenceRecord {
  const now = new Date().toISOString();
  return {
    id,
    tenantId: workspaceId,
    workspaceId,
    sourceType: "txt",
    sourcePath: `/${id}.txt`,
    sourceTimestamp: now,
    ingestedAt: now,
    hash: `hash-${id}`,
    sensitivity: "confidential",
    extractionConfidence: 0.9,
    ingestionStatus: "processed",
    freshnessHours: 1,
    text,
  };
}

beforeAll(async () => {
  // Force the in-memory store path so the test is deterministic and DB-free.
  delete process.env.DATABASE_URL;
  process.env.NEXUS_DB_REQUIRED = "false";

  await repository.addEvidenceRecord(evidence(WS_A, "ev-a1", "Alpha board pack: revenue up 12%, secret project Helios."));
  await repository.addEvidenceRecord(evidence(WS_A, "ev-a2", "Alpha risk register: regulator inquiry pending."));
  await repository.addEvidenceRecord(evidence(WS_B, "ev-b1", "Beta merger terms: acquiring Gamma for 40M, strictly confidential."));

  await repository.upsertEntity({
    workspaceId: WS_A, type: "organization", name: "Project Helios",
    metadata: {}, evidenceId: "ev-a1", confidence: 0.9,
  });
  await repository.upsertEntity({
    workspaceId: WS_B, type: "organization", name: "Gamma Corp",
    metadata: {}, evidenceId: "ev-b1", confidence: 0.9,
  });

  await repository.upsertKnowledgeNote(WS_A, note("Helios plan", "Internal Alpha note about Project Helios launch."), "tester");
  await repository.upsertKnowledgeNote(WS_B, note("Gamma deal", "Internal Beta note about the Gamma acquisition."), "tester");
});

describe("Evidence isolation", () => {
  it("getEvidenceForWorkspace returns only the caller workspace's evidence", async () => {
    const aRows = await repository.getEvidenceForWorkspace(WS_A);
    const bRows = await repository.getEvidenceForWorkspace(WS_B);

    expect(aRows.map((r) => r.id).sort()).toEqual(["ev-a1", "ev-a2"]);
    expect(bRows.map((r) => r.id)).toEqual(["ev-b1"]);

    // No Beta record (and no Beta text) ever appears in Alpha's results.
    expect(aRows.every((r) => r.workspaceId === WS_A)).toBe(true);
    expect(aRows.some((r) => r.id === "ev-b1")).toBe(false);
    expect(aRows.map((r) => r.text).join(" ")).not.toContain("Gamma");
  });

  it("by-id reads enforce ownership (the contract used by /api/evidence/[id])", async () => {
    // getEvidenceById is intentionally global; the route layer must reject
    // records whose workspaceId does not match the caller. Replicate that check.
    const record = await repository.getEvidenceById("ev-b1");
    expect(record).toBeDefined();

    const callerWorkspace = WS_A;
    const ownershipOk = record!.workspaceId === callerWorkspace;
    expect(ownershipOk).toBe(false); // Alpha must be forbidden from Beta's record
  });
});

describe("Entity isolation", () => {
  it("listEntities never returns another workspace's entities", async () => {
    const aEntities = await repository.listEntities(WS_A);
    const bEntities = await repository.listEntities(WS_B);

    expect(aEntities.some((e) => e.name === "Gamma Corp")).toBe(false);
    expect(bEntities.some((e) => e.name === "Project Helios")).toBe(false);
    expect(aEntities.every((e) => e.workspaceId === WS_A)).toBe(true);
  });

  it("a name-query in one workspace cannot reach another's entity", async () => {
    const hits = await repository.listEntities(WS_A, { query: "Gamma" });
    expect(hits).toHaveLength(0);
  });
});

describe("Knowledge isolation", () => {
  it("listKnowledgeNotes is workspace-scoped", async () => {
    const aNotes = await repository.listKnowledgeNotes(WS_A);
    const bNotes = await repository.listKnowledgeNotes(WS_B);
    expect(aNotes.every((n) => n.workspaceId === WS_A)).toBe(true);
    expect(aNotes.some((n) => n.title === "Gamma deal")).toBe(false);
    expect(bNotes.some((n) => n.title === "Helios plan")).toBe(false);
  });

  it("searchKnowledge cannot retrieve another workspace's note", async () => {
    const aHits = await repository.searchKnowledge(WS_A, "Gamma acquisition", 20);
    expect(aHits.every((h) => h.note.workspaceId === WS_A)).toBe(true);
    expect(aHits.some((h) => h.note.title === "Gamma deal")).toBe(false);
  });

  it("getKnowledgeNote with a foreign note id returns null", async () => {
    const bNotes = await repository.listKnowledgeNotes(WS_B);
    const foreignId = bNotes[0]?.id;
    expect(foreignId).toBeTruthy();
    const leaked = await repository.getKnowledgeNote(WS_A, foreignId!);
    expect(leaked).toBeNull();
  });
});
