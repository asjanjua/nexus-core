import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repo = readFileSync(join(process.cwd(), "lib/data/repository.ts"), "utf8");

/**
 * Cross-tenant isolation on the deliverable upsert.
 *
 * A REAL BUG FOUND IN REVIEW, not a hypothetical. `upsertNucleusDeliverable`
 * accepts an `id` from the request body when updating. The UPDATE was correctly
 * scoped by workspace and matched nothing for a foreign id — but the read-back
 * afterwards selected on `id` alone and returned the other workspace's row,
 * which the API then sent back as a successful response.
 *
 * So no write occurred and the caller still got the data: title, source
 * coverage, reviewer status and unresolved caveats. On a white-label platform
 * where the tenants are competing consulting firms, that is the worst class of
 * defect in the product.
 *
 * Both the write and the read must carry the workspace predicate. The tests
 * below assert both, because fixing one and not the other looks correct in a
 * diff.
 */

function upsertBody(): string {
  const start = repo.indexOf("async upsertNucleusDeliverable");
  return repo.slice(start, repo.indexOf("\n  },", start));
}

describe("deliverable upsert is workspace-scoped end to end", () => {
  it("scopes the UPDATE by workspace", () => {
    const body = upsertBody();
    const update = body.slice(body.indexOf("db\n          .update"), body.indexOf("} else {"));
    expect(update).toContain("nucleusDeliverables.workspaceId, workspaceId");
  });

  it("scopes the READ-BACK by workspace", () => {
    // The half that was wrong. A select on id alone leaks the row even when
    // the update touched nothing.
    const body = upsertBody();
    const readBack = body.slice(body.lastIndexOf("db\n        .select()"));
    expect(readBack).toContain("nucleusDeliverables.workspaceId, workspaceId");
  });

  it("has no unscoped select on the deliverables table anywhere", () => {
    // Catches the same mistake reappearing in a new method.
    const unscoped = repo.match(
      /\.from\(nucleusDeliverables\)\s*\n\s*\.where\(eq\(nucleusDeliverables\.id,[^)]*\)\)/g
    );
    expect(unscoped, "found a select on nucleusDeliverables by id alone").toBeNull();
  });

  it("scopes every engagement read by workspace too", () => {
    const start = repo.indexOf("async getNucleusEngagement");
    const fn = repo.slice(start, repo.indexOf("\n  },", start));
    expect(fn).toContain("nucleusEngagements.workspaceId, workspaceId");
  });
});
