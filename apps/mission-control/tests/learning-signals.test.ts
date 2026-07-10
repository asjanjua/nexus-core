import { describe, it, expect, beforeEach } from "vitest";
import { store } from "@/lib/data/store";
import type { LearningSignal } from "@/lib/contracts";

// Helpers
function makeSignal(overrides: Partial<LearningSignal> = {}): LearningSignal {
  return {
    id:            `lsig-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId:   "ws-test",
    agentId:       "ceo-intelligence-agent",
    outputId:      "out-001",
    signalType:    "approve",
    editedContent: null,
    actor:         "user-1",
    createdAt:     new Date().toISOString(),
    ...overrides
  };
}

describe("Learning signals — in-memory store", () => {
  beforeEach(() => {
    // store is module-level; signals from prior tests persist in the array.
    // Tests should be self-contained by using unique outputIds.
  });

  it("saves and retrieves a signal", () => {
    const signal = makeSignal({ outputId: "out-save-01" });
    store.saveLearningSignal(signal);
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId: "out-save-01" });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].signalType).toBe("approve");
  });

  it("filters by agentId", () => {
    const agent = "cfo-intelligence-agent";
    const outputId = "out-agent-filter-01";
    store.saveLearningSignal(makeSignal({ agentId: agent, outputId }));
    store.saveLearningSignal(makeSignal({ agentId: "other-agent", outputId: "out-agent-filter-02" }));
    const results = store.listLearningSignals({ workspaceId: "ws-test", agentId: agent });
    expect(results.every((s) => s.agentId === agent)).toBe(true);
  });

  it("filters by signalType", () => {
    const outputId = "out-type-filter-01";
    store.saveLearningSignal(makeSignal({ signalType: "reject", outputId }));
    store.saveLearningSignal(makeSignal({ signalType: "approve", outputId: "out-type-filter-02" }));
    const results = store.listLearningSignals({ workspaceId: "ws-test", signalType: "reject" });
    expect(results.every((s) => s.signalType === "reject")).toBe(true);
  });

  it("stores editedContent for edit signals", () => {
    const signal = makeSignal({
      signalType:    "edit",
      outputId:      "out-edit-01",
      editedContent: "Corrected brief content goes here."
    });
    store.saveLearningSignal(signal);
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId: "out-edit-01" });
    expect(results[0].editedContent).toBe("Corrected brief content goes here.");
  });

  it("respects workspace isolation", () => {
    const outputId = "out-ws-isolation-01";
    store.saveLearningSignal(makeSignal({ workspaceId: "ws-other", outputId }));
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId });
    expect(results.length).toBe(0);
  });

  it("respects since filter", () => {
    const oldSignal = makeSignal({
      outputId:  "out-since-01",
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
    });
    const newSignal = makeSignal({
      outputId:  "out-since-01",
      createdAt: new Date().toISOString()
    });
    store.saveLearningSignal(oldSignal);
    store.saveLearningSignal(newSignal);
    const since = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId: "out-since-01", since });
    expect(results.every((s) => new Date(s.createdAt) >= new Date(since))).toBe(true);
  });

  it("returns most-recent signal first", () => {
    const outputId = "out-sort-01";
    const first  = makeSignal({ outputId, createdAt: new Date(Date.now() - 2000).toISOString() });
    const second = makeSignal({ outputId, createdAt: new Date(Date.now() - 1000).toISOString() });
    const third  = makeSignal({ outputId, createdAt: new Date().toISOString() });
    [first, second, third].forEach((s) => store.saveLearningSignal(s));
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId });
    const times = results.map((s) => new Date(s.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("respects limit", () => {
    const outputId = "out-limit-01";
    for (let i = 0; i < 10; i++) {
      store.saveLearningSignal(makeSignal({ outputId }));
    }
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId, limit: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe("Learning signals — signal type coverage", () => {
  const types: Array<LearningSignal["signalType"]> = [
    "approve", "edit", "reject", "thumbs_up", "thumbs_down"
  ];

  it.each(types)("accepts signal type: %s", (signalType) => {
    const outputId = `out-type-${signalType}`;
    const signal = makeSignal({ signalType, outputId });
    store.saveLearningSignal(signal);
    const results = store.listLearningSignals({ workspaceId: "ws-test", outputId });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].signalType).toBe(signalType);
  });
});
