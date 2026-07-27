import { describe, expect, it } from "vitest";
import { parseKnowledgeFilterParams } from "@/lib/knowledge/filter-params";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("parseKnowledgeFilterParams", () => {
  it("returns an empty filter set when no params are supplied", () => {
    expect(parseKnowledgeFilterParams(params(""))).toEqual({});
  });

  it("splits and trims tag lists", () => {
    expect(parseKnowledgeFilterParams(params("tags=risk,%20board%20pack%20,,ops")).tags).toEqual([
      "risk",
      "board pack",
      "ops"
    ]);
  });

  it("omits tags when every entry is blank", () => {
    expect(parseKnowledgeFilterParams(params("tags=%20,%20"))).toEqual({});
  });

  it("keeps only known source kinds", () => {
    const filters = parseKnowledgeFilterParams(params("sources=manual,shadow-it,mcp"));
    expect(filters.sourceKinds).toEqual(["manual", "mcp"]);
  });

  it("omits sourceKinds when no supplied source kind is known", () => {
    expect(parseKnowledgeFilterParams(params("sources=shadow-it")).sourceKinds).toBeUndefined();
  });

  it("passes entity and workflow ids through verbatim", () => {
    const filters = parseKnowledgeFilterParams(params("entityId=ent-1&workflowId=wft-9"));
    expect(filters).toMatchObject({ entityId: "ent-1", workflowId: "wft-9" });
  });

  it("accepts known ref types and rejects unknown ones", () => {
    expect(parseKnowledgeFilterParams(params("refType=decision")).refType).toBe("decision");
    expect(parseKnowledgeFilterParams(params("refType=any")).refType).toBe("any");
    expect(parseKnowledgeFilterParams(params("refType=invoice")).refType).toBeUndefined();
  });

  it("accepts known freshness windows and rejects unknown ones", () => {
    expect(parseKnowledgeFilterParams(params("freshness=7d")).freshness).toBe("7d");
    expect(parseKnowledgeFilterParams(params("freshness=90d")).freshness).toBeUndefined();
  });

  it("parses a full filter set the note list and graph routes share", () => {
    expect(
      parseKnowledgeFilterParams(
        params("tags=risk&sources=import,sync&entityId=ent-2&workflowId=wft-2&refType=evidence&freshness=24h")
      )
    ).toEqual({
      tags: ["risk"],
      sourceKinds: ["import", "sync"],
      entityId: "ent-2",
      workflowId: "wft-2",
      refType: "evidence",
      freshness: "24h"
    });
  });
});
