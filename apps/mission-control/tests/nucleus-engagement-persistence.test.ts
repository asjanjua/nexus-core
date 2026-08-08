import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { nucleusDeliverableInputSchema, nucleusEngagementInputSchema } from "@/lib/contracts";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * Engagements and deliverables.
 *
 * The load-bearing property here is THREE-VALUED CAVEATS, preserved from the
 * radio button to the JSONB column:
 *
 *   null  nobody has answered
 *   []    checked, none outstanding
 *   [...] these are outstanding
 *
 * Collapsing null into [] anywhere in that chain converts an unreviewed
 * deliverable into a positive assurance to a client. That is the most
 * dangerous thing this record could misstate, and it would be an easy,
 * invisible "tidy-up" for a future developer.
 */

describe("caveats stay three-valued", () => {
  it("the column has no default", () => {
    // Checked against the DDL only. An earlier version of this test scanned
    // the whole file and matched the header comment explaining why the column
    // is "NOT DEFAULTED TO '[]'" — a test that fails on its own rationale.
    const m = read("db/migrations/0058_nucleus_deliverables.sql");
    const ddl = m
      .slice(m.indexOf("CREATE TABLE"), m.indexOf(");", m.indexOf("CREATE TABLE")))
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n");
    const line = ddl.split("\n").find((l) => l.includes("unresolved_caveats")) ?? "";
    expect(line).toMatch(/JSONB/);
    expect(line).not.toMatch(/DEFAULT/i);
    expect(line).not.toMatch(/NOT NULL/i);
  });

  it("the contract allows null and distinguishes it from omitted", () => {
    const withNull = nucleusDeliverableInputSchema.safeParse({
      engagementId: "e", title: "t", unresolvedCaveats: null,
    });
    const omitted = nucleusDeliverableInputSchema.safeParse({ engagementId: "e", title: "t" });
    const empty = nucleusDeliverableInputSchema.safeParse({
      engagementId: "e", title: "t", unresolvedCaveats: [],
    });
    expect(withNull.success && omitted.success && empty.success).toBe(true);
    expect(withNull.success && withNull.data.unresolvedCaveats).toBeNull();
    expect(omitted.success && "unresolvedCaveats" in omitted.data).toBe(false);
    expect(empty.success && empty.data.unresolvedCaveats).toEqual([]);
  });

  it("the repository leaves the field alone when omitted", () => {
    const repo = read("lib/data/repository.ts");
    const fn = repo.slice(repo.indexOf("async upsertNucleusDeliverable"), repo.indexOf("async upsertNucleusDeliverable") + 2200);
    expect(fn).toContain("input.unresolvedCaveats !== undefined");
  });

  it("the mapper does not coerce null to an empty array", () => {
    const repo = read("lib/data/repository.ts");
    const fn = repo.slice(repo.indexOf("function toNucleusDeliverable"), repo.indexOf("function toNucleusDeliverable") + 1200);
    expect(fn).toContain("row.unresolvedCaveats ?? null");
    expect(fn).not.toContain("unresolvedCaveats ?? []");
  });

  it("the UI asks explicitly rather than defaulting a checkbox", () => {
    // An unchecked box would silently assert "none outstanding".
    const ui = read("components/nucleus-deliverable-builder.tsx");
    expect(ui).toContain('type="radio"');
    expect(ui).toContain("unanswered");
    expect(ui).toContain('useState<CaveatState>("unanswered")');
  });
});

describe("engagement scope stays out of practice management", () => {
  it("stores no billing or rate data", () => {
    const m = read("db/migrations/0057_nucleus_engagements.sql");
    expect(m).not.toMatch(/\b(rate|fee|billing|invoice|utilisation|utilization)\b\s+(VARCHAR|TEXT|NUMERIC|INTEGER)/i);
    expect(Object.keys(nucleusEngagementInputSchema.shape)).not.toContain("rate");
  });

  it("allows an engagement with no partner yet", () => {
    // Work starts before a reviewing partner is assigned. Forcing a name here
    // produces a placeholder that later looks like accountability.
    expect(nucleusEngagementInputSchema.safeParse({ reference: "E-1", clientName: "C" }).success).toBe(true);
  });

  it("no two migrations share a number", () => {
    // Rewritten during the integration merge, because the first version was
    // wrong in an instructive way. It asserted the SIBLING's file was absent —
    // true while feat/nucleus-deep-routes stood alone, and false the moment
    // both branches merged successfully. A test that fails on the outcome it
    // was written to protect is worse than no test.
    //
    // The actual invariant is uniqueness of the numeric prefix. The runner
    // tracks filenames and applies them in sorted order, so two files sharing
    // a number means one silently never runs.
    const files = readdirSync(join(process.cwd(), "db/migrations")).filter((f) => f.endsWith(".sql"));
    const byNumber = new Map<string, string[]>();
    for (const f of files) {
      const n = f.slice(0, 4);
      byNumber.set(n, [...(byNumber.get(n) ?? []), f]);
    }
    const collisions = [...byNumber.entries()].filter(([, names]) => names.length > 1);
    expect(collisions, `migration number collision: ${JSON.stringify(collisions)}`).toEqual([]);

    // And both sibling branches' migrations are present and distinct.
    expect(existsSync(join(process.cwd(), "db/migrations/0055_vantage_deals.sql"))).toBe(true);
    expect(existsSync(join(process.cwd(), "db/migrations/0057_nucleus_engagements.sql"))).toBe(true);
  });
});

describe("new routes are scoped and honest", () => {
  const routes = ["nucleus/engagement-intake", "nucleus/deliverable-builder", "nucleus/client-portal", "nucleus/evidence-room"];

  it.each(routes)("%s exists and is workspace-scoped", (r) => {
    const p = join("app", r, "page.tsx");
    expect(existsSync(join(process.cwd(), p))).toBe(true);
    expect(read(p)).toContain("requireWorkspaceId");
  });

  it("the evidence room does not present a loose match as coverage", () => {
    // The firm's vocabulary and the classifier's are different lists. Calling
    // a substring hit "covered" would tell a partner they are ready when they
    // are not.
    const src = read("app/nucleus/evidence-room/page.tsx");
    expect(src).toContain("likely match");
    expect(src).toContain("This is not coverage");
  });

  it("the client portal renders the fixed layer from the enforced constant", () => {
    // Hardcoding the four items would let the preview drift from what the
    // release API actually refuses to hide.
    expect(read("app/nucleus/client-portal/page.tsx")).toContain("PROTECTED_TRUST_ELEMENTS");
  });
});
