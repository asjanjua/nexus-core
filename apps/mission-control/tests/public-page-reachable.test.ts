import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd());
const layout = readFileSync(join(ROOT, "app/layout.tsx"), "utf8");
const sitemap = readFileSync(join(ROOT, "app/sitemap.ts"), "utf8");

/** Links rendered in the public shell header. */
function headerLinks(): string[] {
  const shell = layout.slice(layout.indexOf("if (isPublicShell)"));
  const header = shell.slice(shell.indexOf("<header"), shell.indexOf("</header>"));
  return [...header.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
}

/**
 * /pricing shipped orphaned: the page existed, the sitemap advertised it, and
 * nothing on the site linked to it. A buyer who cannot find the price assumes
 * it is expensive and leaves, so this is a revenue bug rather than a nav tidy.
 *
 * Kept narrow deliberately. Not every public page belongs in the header — the
 * legal pages do not — so this asserts the commercially load-bearing ones are
 * reachable rather than trying to police the whole sitemap.
 */
describe("commercially load-bearing pages are reachable", () => {
  const MUST_BE_IN_HEADER = ["/pricing", "/start-pilot"];

  it.each(MUST_BE_IN_HEADER)("%s is linked from the public header", (path) => {
    expect(headerLinks()).toContain(path);
  });

  it("keeps those pages in the sitemap too", () => {
    for (const path of MUST_BE_IN_HEADER) {
      expect(sitemap).toContain(`path: "${path}"`);
    }
  });

  it("renders the family shell on pricing, not a product shell", () => {
    // isFamilyEntry drives the brand mark and subtitle. A pricing page badged
    // as a single product would imply the price covers only that product.
    const familyBlock = layout.slice(
      layout.indexOf("const isFamilyEntry"),
      layout.indexOf("const shellName")
    );
    expect(familyBlock).toContain('pathname === "/pricing"');
  });
});
