import { describe, expect, it } from "vitest";
import {
  knownDocumentTypes,
  resolveDocumentTypes,
} from "@/lib/domain/document-type-classifier";

/**
 * Reviewer overrides for document type.
 *
 * Coverage infers a type from the filename, or from the text when the filename
 * says nothing. On a real data room that is regularly wrong or silent: a
 * scanned PDF has no usable text, and "Project Falcon - Annex 4.pdf" could be
 * anything. Until now a reviewer who could see the mistake had no way to fix
 * it, and coverage looked like the product could not read the documents.
 *
 * The two rules that carry the weight are both about NOT falling back:
 *
 *   An override REPLACES the inference rather than merging with it, because
 *   the main thing a reviewer does is remove a wrong type. A merge would make
 *   a mistaken inference permanent — the reviewer could add the right answer
 *   but never delete the wrong one, and the requirement it falsely satisfied
 *   would stay satisfied.
 *
 *   An EMPTY override is honoured. "A human opened this and it supports
 *   nothing" is a finding. Falling back to the guess the human just rejected
 *   would be the product overruling the reviewer.
 */

const SCAN = { sourcePath: "/deal/Project Falcon - Annex 4.pdf", text: "" };
const NAMED = { sourcePath: "/deal/AML Policy.pdf", text: "" };

describe("resolveDocumentTypes", () => {
  it("uses the filename when nothing overrides it", () => {
    const r = resolveDocumentTypes(NAMED);
    expect(r.types).toContain("AML Policy");
    expect(r.source).toBe("filename");
    expect(r.reviewed).toBe(false);
  });

  it("falls back to the document's own text", () => {
    const r = resolveDocumentTypes({
      sourcePath: SCAN.sourcePath,
      text: "Cap Table\n\nShareholding as at 30 June.",
    });
    expect(r.types).toContain("Cap Table");
    expect(r.source).toBe("content");
  });

  it("reports nothing identifiable rather than guessing", () => {
    const r = resolveDocumentTypes(SCAN);
    expect(r.types).toEqual([]);
    expect(r.source).toBe("none");
    expect(r.reviewed).toBe(false);
  });

  it("lets a reviewer type a document the classifier could not", () => {
    // The scanned-PDF case this feature exists for.
    const r = resolveDocumentTypes(SCAN, { types: ["Cap Table"], setBy: "u1" });
    expect(r.types).toEqual(["Cap Table"]);
    expect(r.source).toBe("reviewer");
    expect(r.reviewed).toBe(true);
  });

  it("replaces a wrong inference instead of merging with it", () => {
    // The bug a merge would create: the file is named "AML Policy" but is
    // actually something else. If the override merged, "AML Policy" would
    // survive and keep satisfying a requirement the reviewer just rejected.
    const r = resolveDocumentTypes(NAMED, { types: ["Board Pack"], setBy: "u1" });
    expect(r.types).toEqual(["Board Pack"]);
    expect(r.types).not.toContain("AML Policy");
  });

  it("honours an empty override as a real finding", () => {
    // "I opened it; it supports nothing." Falling back to the filename here
    // would be the product overruling the human who just looked.
    const r = resolveDocumentTypes(NAMED, { types: [], setBy: "u1" });
    expect(r.types).toEqual([]);
    expect(r.source).toBe("reviewer");
    expect(r.reviewed).toBe(true);
  });

  it("distinguishes reviewed-as-empty from never looked at", () => {
    // Both have no types. Only one is a closed question, and coverage counts
    // them differently.
    const unreviewed = resolveDocumentTypes(SCAN);
    const reviewed = resolveDocumentTypes(SCAN, { types: [], setBy: "u1" });
    expect(unreviewed.types).toEqual(reviewed.types);
    expect(unreviewed.reviewed).toBe(false);
    expect(reviewed.reviewed).toBe(true);
  });

  it("treats an absent override as no override", () => {
    expect(resolveDocumentTypes(NAMED, null).source).toBe("filename");
    expect(resolveDocumentTypes(NAMED, undefined).source).toBe("filename");
  });

  it("copies the override rather than aliasing the caller's array", () => {
    // The resolved list is handed to coverage; mutating it must not reach back
    // into the stored override.
    const override = { types: ["Cap Table"], setBy: "u1" };
    const r = resolveDocumentTypes(SCAN, override);
    r.types.push("Board Pack");
    expect(override.types).toEqual(["Cap Table"]);
  });

  it("accepts multiple reviewer types for one document", () => {
    const r = resolveDocumentTypes(SCAN, { types: ["AML Policy", "AML Audit"], setBy: "u1" });
    expect(r.types).toHaveLength(2);
  });
});

describe("override vocabulary", () => {
  it("only offers types the requirement packs can actually match", () => {
    // A free-text type would look accepted and satisfy nothing, which is the
    // most frustrating outcome for someone correcting a mistake. The route
    // validates against this list.
    const known = knownDocumentTypes();
    expect(known.length).toBeGreaterThan(20);
    expect(known).toContain("Cap Table");
    expect(known).toContain("AML Policy");
    expect(known).not.toContain("");
  });

  it("returns a sorted, de-duplicated vocabulary", () => {
    const known = knownDocumentTypes();
    expect([...known].sort()).toEqual(known);
    expect(new Set(known).size).toBe(known.length);
  });
});
