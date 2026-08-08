import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * Invented figures must be marked at the value, not just in a banner.
 *
 * The Meridian, Vantage and Nucleus hubs show worked-example numbers until a
 * buyer connects real evidence. Each already carried an honest banner saying
 * so — and the banner was not enough. It is 12px muted text above a 30px bold
 * number, so the invented value dominated and the caveat whispered.
 *
 * That matters more here than on an ordinary product. Pinavia is sold on
 * provenance. A regulated buyer who reads "72% completeness" as their own
 * figure, then discovers it was fabricated, does not stop trusting one number
 * — they stop trusting the evidence claim that is the entire pitch. With a
 * pilot imminent this is the highest-consequence thing on the hub screens.
 *
 * The rule these tests enforce: any component holding an EXAMPLE/hardcoded
 * figure renders it through SampleKpi, which carries its own marker.
 */

const HUBS = [
  "components/meridian-submission-panel.tsx",
  "components/vantage-deal-room-panel.tsx",
  "components/nucleus-engagement-panel.tsx",
];

describe("sample figures are marked at the value", () => {
  it.each(HUBS)("%s renders example figures through SampleKpi", (path) => {
    expect(read(path)).toContain("SampleKpi");
  });

  it("no hub renders an EXAMPLE value as a bare display-tier number", () => {
    // The exact shape that was wrong: a big bold figure interpolated straight
    // from the EXAMPLE object with nothing attached to say it is invented.
    for (const path of HUBS) {
      const src = read(path);
      const bareBigExample = src.match(/text-(3xl|4xl|\[32px\])[^>]*>\s*\{(pct\()?EXAMPLE\./g) ?? [];
      expect(bareBigExample, `${path} still renders a bare EXAMPLE display value`).toEqual([]);
    }
  });

  it("keeps the real Meridian regulator deadline unmarked and full weight", () => {
    // Three of Meridian's four KPIs are invented; the deadline is derived from
    // the scope the workspace actually set. Marking the whole section would
    // have tarred the one genuine figure — which is the reason the marker
    // belongs on the value rather than the container.
    const src = read("components/meridian-submission-panel.tsx");
    const start = src.indexOf("Regulator deadline");
    // Bounded by the end of its own <div>, not a fixed character count — a
    // fixed window ran into the next KPI and made the assertion meaningless.
    const deadlineBlock = src.slice(start, src.indexOf("</div>", start));
    expect(deadlineBlock).toContain("daysToDeadline");
    expect(deadlineBlock).not.toContain("SampleKpi");
    expect(deadlineBlock).toContain("text-nexus-text");
  });

  it("SampleKpi signals with more than colour", () => {
    // Colour alone fails the grayscale gate and fails colour-blind users. The
    // literal word "Sample" and a dashed border both survive it.
    const src = read("components/ui/nexus-primitives.tsx");
    const block = src.slice(src.indexOf("export function SampleKpi"));
    expect(block).toContain("SampleTag");
    expect(block).toContain("border-dashed");
  });

  it("renders sample values muted so a real figure always outranks them", () => {
    // A fabricated number must never be the loudest thing on the screen.
    const src = read("components/ui/nexus-primitives.tsx");
    const block = src.slice(src.indexOf("export function SampleKpi"), src.indexOf("export function SampleKpi") + 900);
    expect(block).toContain("text-nexus-muted");
    expect(block).not.toMatch(/text-nexus-(accent|danger|warn|sky)\b(?![^]*?SampleTag)/);
  });

  it("the marker carries an explanation for hover and assistive tech", () => {
    const src = read("components/ui/nexus-primitives.tsx");
    const block = src.slice(src.indexOf("export function SampleTag"), src.indexOf("export function SampleKpi"));
    expect(block).toMatch(/title=/);
    expect(block).toContain("Not this workspace's data");
  });
});
