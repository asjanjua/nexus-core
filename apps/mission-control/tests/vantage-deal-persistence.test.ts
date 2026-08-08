import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vantageDealInputSchema, vantageJudgmentInputSchema } from "@/lib/contracts";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

/**
 * Deal scope and the advisor judgment log.
 *
 * Two boundaries are encoded in the SHAPE of this data rather than in a check
 * somewhere, and both are easy to undo by accident:
 *
 *   A deal has no approval state. The obvious column — approved / rejected /
 *   on hold — is the investment decision Vantage must not make, so it does not
 *   exist in the table. A future developer adding it "for convenience" would
 *   breach the registry boundary without touching any guard.
 *
 *   The judgment log is append-only. An editable log cannot answer "what did
 *   the committee see", which is the entire point of recording advisor
 *   judgment.
 */

describe("deal scope carries no verdict", () => {
  const migration = read("db/migrations/0055_vantage_deals.sql");

  it("has no approval or status column", () => {
    expect(migration).not.toMatch(/\b(status|approved|investable|rejected|verdict)\b\s+(VARCHAR|TEXT|BOOLEAN)/i);
  });

  it("has no status field in the input contract", () => {
    const shape = Object.keys(vantageDealInputSchema.shape);
    expect(shape).not.toContain("status");
    expect(shape).toEqual(expect.arrayContaining(["name", "dealType"]));
  });

  it("archives rather than deletes", () => {
    // Judgments and audit rows reference the deal; a hard delete orphans the
    // trail the product exists to keep.
    expect(migration).toContain("archived_at");
    expect(read("lib/data/repository.ts")).toContain("archiveVantageDeal");
  });

  it("allows a deal with no IC date", () => {
    // A fabricated committee deadline is worse than an absent one.
    expect(vantageDealInputSchema.safeParse({ name: "Project Falcon" }).success).toBe(true);
  });
});

describe("judgment log is append-only and attributed", () => {
  const api = read("app/api/vantage/judgments/route.ts");

  it("exposes no update or delete handler", () => {
    expect(api).not.toMatch(/export async function (PUT|PATCH|DELETE)/);
    expect(api).toContain("export async function POST");
  });

  it("requires a named advisor", () => {
    const base = { dealId: "d", subject: "s", position: "p" };
    expect(vantageJudgmentInputSchema.safeParse(base).success).toBe(false);
    expect(vantageJudgmentInputSchema.safeParse({ ...base, advisor: "A. Advisor" }).success).toBe(true);
  });

  it("does not default the advisor to the signed-in user", () => {
    // The person at the keyboard is often not the advisor. Defaulting is the
    // misattribution the boundary exists to prevent.
    expect(api).not.toMatch(/advisor:\s*ctx\.userId/);
    // The field starts empty and is never seeded from the session. Prefilling
    // it when REVISING an existing judgment is correct — that carries the
    // original advisor forward — so this asserts the initial state rather than
    // banning every setAdvisor call, which an earlier version wrongly did.
    const ui = read("components/vantage-judgment-log.tsx");
    expect(ui).toContain('const [advisor, setAdvisor] = useState("")');
    expect(ui).not.toMatch(/useUser|currentUser|session\?\.user/);
  });

  it("records the advisor separately from the actor in the audit payload", () => {
    expect(api).toContain("advisor: judgment.advisor");
    expect(api).toContain("actor: ctx.userId");
  });

  it("keeps position free text rather than an enum", () => {
    // proceed / hold / stop would be the investment decision in a dropdown.
    const long = "We would want counsel to confirm the safeguarding arrangement first.";
    expect(
      vantageJudgmentInputSchema.safeParse({ dealId: "d", subject: "s", advisor: "a", position: long }).success
    ).toBe(true);
  });

  it("supersedes rather than overwrites", () => {
    const repo = read("lib/data/repository.ts");
    expect(repo).toContain("appendVantageJudgment");
    expect(repo).toContain("supersededBy");
    // Both writes must share a transaction, or the sequence can be left broken.
    const fn = repo.slice(repo.indexOf("async appendVantageJudgment"), repo.indexOf("async appendVantageJudgment") + 1800);
    expect(fn).toContain("db.transaction");
  });
});

describe("routes are workspace-scoped", () => {
  it.each(["app/vantage/dealroom/page.tsx", "app/vantage/judgment-log/page.tsx"])("%s", (p) => {
    expect(read(p)).toContain("requireWorkspaceId");
  });

  it("the judgments API verifies deal ownership before listing", () => {
    // Without this a guessed id from another tenant returns an empty list,
    // which reads as "no judgments yet" rather than "not yours".
    const api = read("app/api/vantage/judgments/route.ts");
    expect(api).toContain("getVantageDeal");
    expect(api).toContain("deal_not_found");
  });
});
