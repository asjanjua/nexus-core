import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Server Components that read workspace data must authenticate AND scope.
 *
 * The middleware runs Clerk but does not gate — authorization deliberately
 * lives in route handlers and pages. `app/evidence/[id]/page.tsx` did neither:
 * it called getEvidenceById, which takes no workspace, and rendered the full
 * extracted text of the document. Any visitor with an id could read another
 * tenant's regulatory or deal papers. Evidence ids are
 * `ev-<timestamp>-<8 hex>` and travel through citations and logs, so they were
 * never a secret.
 *
 * The sibling API routes were correct all along — they check
 * `record.workspaceId !== ctx.workspaceId`. Only the page was missed, which is
 * exactly the kind of gap a per-file review does not catch and a sweep does.
 *
 * Two separate obligations, asserted separately because passing one and
 * failing the other still leaks: authenticate (who are you) and scope (is this
 * yours).
 */

const APP = join(process.cwd(), "app");

/** Auth helpers that establish identity for a Server Component. */
const AUTH = ["requireWorkspaceId", "safeAuth", "requireScope", "auth("];

/**
 * Repository reads that take no workspace argument, so the caller must compare
 * the returned row's workspaceId itself.
 */
const UNSCOPED_READS = ["getEvidenceById", "getDecisionById", "getActionById"];

function pages(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) pages(full, out);
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

const all = pages(APP).map((file) => ({
  file: file.replace(APP + "/", ""),
  src: readFileSync(file, "utf8"),
}));

const dataPages = all.filter((p) => p.src.includes("repository."));

describe("pages that read workspace data", () => {
  it("finds pages to check", () => {
    // Without this the sweep could silently pass by matching nothing.
    expect(all.length).toBeGreaterThan(30);
    expect(dataPages.length).toBeGreaterThan(5);
  });

  it("all authenticate before reading", () => {
    const ungated = dataPages
      .filter((p) => !AUTH.some((fn) => p.src.includes(fn)))
      .map((p) => p.file);
    expect(ungated, `no auth call:\n${ungated.join("\n")}`).toEqual([]);
  });

  it("compare the workspace when the read is not scoped for them", () => {
    // Authenticating is not enough. getEvidenceById returns any tenant's row,
    // so the page has to check the row belongs to the caller.
    const offenders = dataPages
      .filter((p) => UNSCOPED_READS.some((fn) => p.src.includes(fn)))
      .filter((p) => !p.src.includes("workspaceId !==") && !p.src.includes("workspaceId ==="))
      .map((p) => p.file);
    expect(offenders, `unscoped read with no workspace comparison:\n${offenders.join("\n")}`).toEqual(
      []
    );
  });

  it("does not confirm that another tenant's record exists", () => {
    // notFound rather than a 403 on the mismatch branch: a 403 tells the
    // caller the id is real and simply belongs to someone else.
    const evidence = dataPages.find((p) => p.file.startsWith("evidence/["));
    expect(evidence, "evidence detail page not found").toBeDefined();
    expect(evidence!.src).toContain("notFound()");
    expect(evidence!.src).toMatch(/workspaceId !== workspaceId|row\.workspaceId !== workspaceId/);
  });
});
