import { describe, expect, it } from "vitest";
import {
  CLASSIFIER_VERSION,
  cacheIsCurrent,
  classifyForStorage,
  matchesEvidenceTags,
  resolveDocumentTypes,
} from "@/lib/domain/document-type-classifier";

/**
 * The classification cache (migration 0044).
 *
 * Classification runs ~55 regexes over a document and nothing stored the
 * answer, so every request recomputed it for every record: 2.0s for the
 * coverage API and 5.7s for the review queue on a 2,000-document data room,
 * after the scan cap had already halved both.
 *
 * The whole risk of caching this is STALENESS. The rules change whenever a
 * requirement pack introduces a document type, and a coverage screen quietly
 * answering from retired rules is worse than a slow one. So the cache carries a
 * fingerprint of the rules that produced it, and anything that does not match
 * the running code is ignored rather than trusted. Most of these tests exist to
 * hold that line.
 */

const NAMED = { sourcePath: "/deal/AML Policy.pdf", text: "" };

describe("classifier version", () => {
  it("is a stable positive integer that fits a Postgres INTEGER", () => {
    // Stored in an INTEGER column. A negative or oversized value would be a
    // write error surfacing at ingest, on the hot path, in production.
    expect(Number.isInteger(CLASSIFIER_VERSION)).toBe(true);
    expect(CLASSIFIER_VERSION).toBeGreaterThan(0);
    expect(CLASSIFIER_VERSION).toBeLessThanOrEqual(0x7fffffff);
  });

  it("does not change between calls within a build", () => {
    // Derived from the pattern table, so it must be a pure function of the
    // source. A version that drifted at runtime would invalidate every cached
    // row on every deploy and silently undo the optimisation.
    expect(classifyForStorage(NAMED).version).toBe(CLASSIFIER_VERSION);
    expect(classifyForStorage(NAMED).version).toBe(CLASSIFIER_VERSION);
  });
});

describe("cacheIsCurrent", () => {
  it("rejects a cache from different rules", () => {
    expect(cacheIsCurrent({ types: ["Cap Table"], source: "content", version: 1 })).toBe(false);
  });

  it("rejects an absent cache rather than treating it as empty", () => {
    // "Not cached" and "cached as nothing" are different. Conflating them
    // would make every pre-migration row report as having no types.
    expect(cacheIsCurrent(null)).toBe(false);
    expect(cacheIsCurrent(undefined)).toBe(false);
  });

  it("accepts a cache from the current rules", () => {
    expect(cacheIsCurrent(classifyForStorage(NAMED))).toBe(true);
  });
});

describe("classifyForStorage", () => {
  it("records which signal produced the types", () => {
    expect(classifyForStorage(NAMED)).toMatchObject({ source: "filename" });
    expect(
      classifyForStorage({ sourcePath: "/d/annex.pdf", text: "Cap Table\n\nShareholding." })
    ).toMatchObject({ source: "content" });
  });

  it("stores an identified-as-nothing result rather than leaving it blank", () => {
    // Recording "none" is what stops the cache re-examining an unidentifiable
    // scan on every single request forever.
    const stored = classifyForStorage({ sourcePath: "/d/scan_1.pdf", text: "" });
    expect(stored).toMatchObject({ types: [], source: "none" });
    expect(cacheIsCurrent(stored)).toBe(true);
  });

  it("agrees with what resolveDocumentTypes computes live", () => {
    // The cache must be indistinguishable from the live path, or coverage
    // changes depending on whether a backfill has run.
    for (const record of [
      NAMED,
      { sourcePath: "/d/annex.pdf", text: "Cap Table\n\nShareholding as at 30 June." },
      { sourcePath: "/d/scan_1.pdf", text: "" },
    ]) {
      const live = resolveDocumentTypes(record);
      const stored = classifyForStorage(record);
      expect(stored.types).toEqual(live.types);
      expect(stored.source).toBe(live.source === "none" ? "none" : live.source);
    }
  });
});

describe("resolveDocumentTypes with a cache", () => {
  it("uses a current cache instead of the document", () => {
    // Proven by giving the cache an answer the text cannot produce: if the
    // result is the cached one, the cache was genuinely consulted.
    const r = resolveDocumentTypes({
      sourcePath: "/d/nothing-identifiable.pdf",
      text: "",
      classification: { types: ["Board Pack"], source: "content", version: CLASSIFIER_VERSION },
    });
    expect(r.types).toEqual(["Board Pack"]);
    expect(r.source).toBe("content");
  });

  it("ignores a stale cache and reclassifies from the document", () => {
    // The guarantee the whole design rests on: correctness does not depend on
    // the backfill having run.
    const r = resolveDocumentTypes({
      ...NAMED,
      classification: { types: ["Board Pack"], source: "content", version: 1 },
    });
    expect(r.types).toContain("AML Policy");
    expect(r.types).not.toContain("Board Pack");
    expect(r.source).toBe("filename");
  });

  it("classifies live when there is no cache at all", () => {
    // Every row ingested before migration 0044.
    expect(resolveDocumentTypes({ ...NAMED, classification: null }).types).toContain("AML Policy");
  });

  it("lets a reviewer override beat even a current cache", () => {
    // Precedence order is reviewer, then cache, then live. A cache that
    // outranked a human would re-impose the guess they just corrected.
    const r = resolveDocumentTypes(
      {
        ...NAMED,
        classification: { types: ["Cap Table"], source: "content", version: CLASSIFIER_VERSION },
      },
      { types: ["Board Pack"], setBy: "u1" }
    );
    expect(r.types).toEqual(["Board Pack"]);
    expect(r.source).toBe("reviewer");
  });

  it("copies the cached array rather than aliasing it", () => {
    // The resolved list is handed to coverage; mutating it must not corrupt
    // the record's stored classification for the rest of the request.
    const classification = {
      types: ["Cap Table"],
      source: "content" as const,
      version: CLASSIFIER_VERSION,
    };
    const r = resolveDocumentTypes({ sourcePath: "/d/a.pdf", text: "", classification });
    r.types.push("Board Pack");
    expect(classification.types).toEqual(["Cap Table"]);
  });
});

describe("matchesEvidenceTags with a cache", () => {
  it("matches from a current cache without reading the document", () => {
    const record = {
      sourcePath: "/d/unidentifiable.pdf",
      text: "",
      classification: {
        types: ["Cap Table"],
        source: "content" as const,
        version: CLASSIFIER_VERSION,
      },
    };
    expect(matchesEvidenceTags(record, ["Cap Table"])).toBe(true);
    expect(matchesEvidenceTags(record, ["Org Chart"])).toBe(false);
  });

  it("falls back to the document when the cache is stale", () => {
    // The four native engines all route through here. If a stale cache were
    // trusted, every one of them would report coverage against retired rules.
    const record = { ...NAMED, classification: { types: [], source: "none" as const, version: 1 } };
    expect(matchesEvidenceTags(record, ["AML Policy"])).toBe(true);
  });

  it("still matches case-insensitively through the cache", () => {
    // Requirement packs are hand-written, so tag casing is not guaranteed to
    // match the classifier's. That was true before the cache and must stay true.
    const record = {
      sourcePath: "/d/a.pdf",
      text: "",
      classification: {
        types: ["Cap Table"],
        source: "content" as const,
        version: CLASSIFIER_VERSION,
      },
    };
    expect(matchesEvidenceTags(record, ["cap table"])).toBe(true);
  });

  it("never matches an empty tag list, cached or not", () => {
    expect(
      matchesEvidenceTags(
        {
          sourcePath: "/d/a.pdf",
          classification: {
            types: ["Cap Table"],
            source: "content" as const,
            version: CLASSIFIER_VERSION,
          },
        },
        []
      )
    ).toBe(false);
  });
});
