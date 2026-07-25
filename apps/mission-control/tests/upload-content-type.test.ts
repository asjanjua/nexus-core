/**
 * Regression: stored XSS via evidence originals.
 *
 * The upload route previously persisted the client-supplied file.type, and the
 * original-download route served it back with `content-disposition: inline`.
 * Uploading a text/html file therefore gave script execution on the app origin
 * under the viewer's session. Content type is now derived server-side from an
 * extension allowlist, and originals are always served as attachments.
 */
import { describe, expect, it } from "vitest";
import { contentTypeForUpload } from "@/lib/services/ingestion";

describe("upload content type allowlist", () => {
  it("maps each supported extension to a fixed content type", () => {
    expect(contentTypeForUpload("board-pack.pdf")).toBe("application/pdf");
    expect(contentTypeForUpload("notes.txt")).toBe("text/plain");
    expect(contentTypeForUpload("readme.md")).toBe("text/markdown");
    expect(contentTypeForUpload("model.xlsx")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  });

  it("is case-insensitive on the extension", () => {
    expect(contentTypeForUpload("REPORT.PDF")).toBe("application/pdf");
  });

  it("rejects executable and markup types", () => {
    expect(contentTypeForUpload("payload.html")).toBeNull();
    expect(contentTypeForUpload("payload.svg")).toBeNull();
    expect(contentTypeForUpload("payload.xhtml")).toBeNull();
    expect(contentTypeForUpload("payload.js")).toBeNull();
  });

  it("rejects a file with no extension", () => {
    expect(contentTypeForUpload("payload")).toBeNull();
  });

  it("keys off the final extension, not an earlier one", () => {
    // A double extension must not smuggle html past the allowlist, and must
    // not be treated as a pdf either.
    expect(contentTypeForUpload("invoice.pdf.html")).toBeNull();
    expect(contentTypeForUpload("invoice.html.pdf")).toBe("application/pdf");
  });
});
