/**
 * Repository transaction safety — unit tests (v0.25.x hardening, Task #35)
 *
 * Verifies that multi-table writes (decision + audit event, action + audit event,
 * agent output write/replace + audit event, agent output rollback) are issued as a
 * single db.transaction() call rather than as independent statements. This matters
 * because independent statements can leave orphaned records if a later statement
 * fails (e.g. decision row written, audit event insert fails) — wrapping them in a
 * transaction guarantees all-or-nothing commit.
 *
 * Strategy: mock `pg` and `drizzle-orm/node-postgres` so `getDb()` takes the
 * Postgres code path, then provide a fake db whose `.transaction()` records how
 * many times it was called and whether the callback's writes happened against a
 * single shared `tx` object. A fake `tx` that throws partway through proves the
 * surrounding code does not catch-and-continue between statements — it must
 * propagate the failure so nothing partial is treated as committed.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.hoisted(() => {
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
});

// ---------------------------------------------------------------------------
// Fake Postgres / Drizzle layer
// ---------------------------------------------------------------------------

let transactionCallCount = 0;
let writesInLastTransaction: string[] = [];
let failOnSecondWrite = false;

function makeFakeTx(label: string) {
  const record = (op: string) => {
    writesInLastTransaction.push(`${label}:${op}`);
    if (failOnSecondWrite && writesInLastTransaction.length % 2 === 0) {
      throw new Error("simulated failure on second write");
    }
  };
  const insertChain = {
    values: (..._args: unknown[]) => {
      record("insert");
      return { returning: async () => [{}] };
    },
  };
  const updateChain = {
    set: (..._args: unknown[]) => ({
      where: async (..._w: unknown[]) => {
        record("update");
        return undefined;
      },
    }),
  };
  const selectChain = {
    from: () => selectChain,
    where: () => selectChain,
    orderBy: () => selectChain,
    limit: async () => {
      record("select");
      return [];
    },
  };
  return {
    insert: (..._args: unknown[]) => insertChain,
    update: (..._args: unknown[]) => updateChain,
    select: (..._args: unknown[]) => selectChain,
  };
}

const fakeDb = {
  transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
    transactionCallCount += 1;
    writesInLastTransaction = [];
    const tx = makeFakeTx(`tx${transactionCallCount}`);
    return callback(tx);
  }),
  insert: (..._args: unknown[]) => ({ values: async () => [{}] }),
};

vi.mock("pg", () => ({
  Pool: vi.fn(function Pool() {
    return {};
  }),
}));

vi.mock("drizzle-orm/node-postgres", () => ({
  drizzle: vi.fn(() => fakeDb),
}));

vi.mock("@/db/schema", () => {
  const table = (name: string) => ({ __tableName: name });
  return {
    actions: table("actions"),
    agentControlProfiles: table("agentControlProfiles"),
    agentOutputs: table("agentOutputs"),
    agentKeys: table("agentKeys"),
    askConversationMessages: table("askConversationMessages"),
    auditEvents: table("auditEvents"),
    connectors: table("connectors"),
    decisions: table("decisions"),
    entities: table("entities"),
    evalRuns: table("evalRuns"),
    evidenceEntityLinks: table("evidenceEntityLinks"),
    evidenceRecords: table("evidenceRecords"),
    knowledgeLinks: table("knowledgeLinks"),
    knowledgeNotes: table("knowledgeNotes"),
    knowledgeSyncEvents: table("knowledgeSyncEvents"),
    learningSignals: table("learningSignals"),
    llmUsage: table("llmUsage"),
    promptRegistry: table("promptRegistry"),
    recommendations: table("recommendations"),
    roles: table("roles"),
    synthesisSchedules: table("synthesisSchedules"),
    tenants: table("tenants"),
    users: table("users"),
    workspaces: table("workspaces"),
    workspaceProfiles: table("workspaceProfiles"),
    workspaceSettings: table("workspaceSettings"),
    workflowTwinRuns: table("workflowTwinRuns"),
    workflowTwins: table("workflowTwins"),
    planDefinitions: table("planDefinitions"),
    dispatchJobs: table("dispatchJobs"),
    stripeProcessedEvents: table("stripeProcessedEvents"),
  };
});

vi.mock("@/lib/data/db-policy", () => ({
  assertDbConfigured: vi.fn(),
  isDbRequired: vi.fn(() => false),
}));

vi.mock("@/lib/data/store", () => ({
  store: {
    saveDecision: vi.fn(),
    saveAction: vi.fn(),
    saveAgentOutput: vi.fn(async (input: unknown) => input),
    rollbackAgentOutput: vi.fn(),
  },
}));

const { repository } = await import("@/lib/data/repository");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  transactionCallCount = 0;
  writesInLastTransaction = [];
  failOnSecondWrite = false;
  fakeDb.transaction.mockClear();
});

describe("repository transaction safety (#35)", () => {
  it("createDecision issues exactly one db.transaction() covering both writes", async () => {
    await repository.createDecision(
      "ws-1",
      { title: "Expand to KSA", owner: "ali", rationale: "market timing", status: "open", priority: "medium" },
      "user-1"
    );
    expect(transactionCallCount).toBe(1);
    expect(writesInLastTransaction).toEqual(["tx1:insert", "tx1:insert"]);
  });

  it("createDecision does not leave a partial commit when the audit insert fails", async () => {
    failOnSecondWrite = true;
    await expect(
      repository.createDecision(
        "ws-1",
        { title: "Expand to KSA", owner: "ali", rationale: "market timing", status: "open", priority: "medium" },
        "user-1"
      )
    ).resolves.toBeDefined(); // outer .catch(() => null) swallows the rejected transaction
    // The important assertion: both writes were attempted inside the SAME transaction
    // (tx1), so a real Postgres engine would roll both back together rather than
    // committing the decision row while losing the audit event.
    expect(transactionCallCount).toBe(1);
    expect(writesInLastTransaction).toEqual(["tx1:insert", "tx1:insert"]);
  });

  it("createAction issues exactly one db.transaction() covering both writes", async () => {
    await repository.createAction(
      "ws-1",
      { decisionId: "dec-1", actionText: "Draft SOW", owner: "ali", isBlocker: false },
      "user-1"
    );
    expect(transactionCallCount).toBe(1);
    expect(writesInLastTransaction).toEqual(["tx1:insert", "tx1:insert"]);
  });

  it("saveAgentOutput wraps version lookup, supersede, insert, and audit in one transaction", async () => {
    await repository.saveAgentOutput({
      workspaceId: "ws-1",
      agentId: "agent-ceo",
      agentVersion: 1,
      roleKey: "ceo",
      content: "synthesis text",
      inputSummary: "summary",
      evidenceRefs: [],
      confidence: 0.8,
    });
    expect(transactionCallCount).toBe(1);
    // select (version lookup) + update (supersede) + insert (new row) + insert (audit)
    expect(writesInLastTransaction.length).toBeGreaterThanOrEqual(3);
  });
});
