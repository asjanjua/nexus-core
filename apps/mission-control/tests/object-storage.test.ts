import { describe, expect, it } from "vitest";
import { parseR2SourceUri } from "@/lib/services/object-storage";

describe("object storage helpers", () => {
  it("parses valid r2 source URIs", () => {
    expect(parseR2SourceUri("r2://nexus-evidence/workspace/demo/file.pdf")).toEqual({
      bucket: "nexus-evidence",
      key: "workspace/demo/file.pdf"
    });
  });

  it("rejects non-r2 URIs", () => {
    expect(parseR2SourceUri("https://example.com/file.pdf")).toBeNull();
    expect(parseR2SourceUri("r2://missing-key")).toBeNull();
  });
});
