import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(process.cwd(), "app/pricing/page.tsx"), "utf8");

/**
 * Design-system invariants for /pricing.
 *
 * This page publishes $49 / $499 / $2,500 and drives checkout, and it shipped
 * straight to code with no design review — four days after the Figma worklist
 * recorded that conversion surfaces get design-first treatment. It arrived
 * with two primary actions, off-ramp type sizes, off-scale spacing, five
 * different white opacities standing in for one token, and a recommended tier
 * distinguished by colour alone.
 *
 * None of that fails a build, which is exactly why it needs pinning. These
 * assertions are deliberately narrow: they cover the rules that were ACTUALLY
 * broken here, not the whole design system. A test that tried to police every
 * rule on every page would be deleted the first time it blocked something
 * reasonable.
 */

/** Tailwind classes present in the file, minus anything inside a comment. */
function code(): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("/pricing design invariants", () => {
  it("has exactly one primary action", () => {
    // The rule is "one primary action per screen, visually dominant". Two
    // accent buttons means the page has no primary action at all, and the one
    // we want pressed is the recommended tier — not the footnote CTA.
    const primaries = code().match(/btn-primary/g) ?? [];
    expect(primaries).toHaveLength(1);
  });

  it("uses only type sizes on the ramp", () => {
    // 12 / 14 / 16 / 20 / 24 / 32 / 40. Tailwind's text-3xl (30px) and
    // text-4xl (36px) are both off it, and both were in use.
    expect(code()).not.toMatch(/\btext-(3xl|4xl|5xl|6xl)\b/);
    expect(code()).not.toMatch(/\btext-\[(?!12px|14px|16px|20px|24px|32px|40px)[^\]]+\]/);
  });

  it("uses only spacing on the scale", () => {
    // 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 → Tailwind 1/2/3/4/6/8/12/16.
    // mt-10 is 40px and was used three times.
    const offScale = code().match(/\b[mp][tbxy]?-(5|7|9|10|11|13|14|15)\b/g) ?? [];
    expect(offScale).toEqual([]);
  });

  it("does not substitute white opacities for the muted token", () => {
    // text-white/40 at 12px sits under the AA contrast floor on nexus-bg.
    // nexus-muted exists precisely so metadata has one legible value.
    expect(code()).not.toMatch(/text-white\/\d+/);
  });

  it("marks the recommended tier with more than colour", () => {
    // Grayscale gate: with hue removed, a buyer must still see which tier is
    // recommended. Border colour alone disappears.
    expect(src).toContain("Most teams start here");
  });

  it("still renders every tier from the shared source", () => {
    // The whole reason this page is data-driven: published price and charged
    // price cannot be allowed to drift. A design pass must not quietly
    // hardcode a number into the markup.
    expect(code()).toContain("PRICING_TIERS.map");
    expect(code()).not.toMatch(/\$\d{2,3}(?![,\d])/);
  });

  it("keeps the exclusions panel", () => {
    // The most commercially honest thing on the page and the easiest to lose
    // in a "cleanup". A governance product that overstates what you get has
    // undercut its pitch on the first page a buyer reads.
    expect(src).toContain("What the price does not include");
  });
});
