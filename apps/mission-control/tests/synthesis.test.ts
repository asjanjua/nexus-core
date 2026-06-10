import { describe, expect, it } from "vitest";
import { questionsForRole } from "@/lib/services/synthesis";
import { executiveSynthesisSchema, executiveSynthesisQuestionSchema } from "@/lib/contracts";

describe("questionsForRole", () => {
  it("returns 7 questions for CEO", () => {
    const qs = questionsForRole("ceo");
    expect(qs).toHaveLength(7);
    expect(qs[0]).toContain("most important");
  });

  it("returns 5 questions for COO", () => {
    const qs = questionsForRole("coo");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("blocked");
  });

  it("returns 5 questions for CFO", () => {
    const qs = questionsForRole("cfo");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("cash");
  });

  it("returns 5 questions for CTO", () => {
    const qs = questionsForRole("cto");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("technology");
  });

  it("returns 5 questions for CBO", () => {
    const qs = questionsForRole("cbo");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("pipeline");
  });

  it("returns 5 questions for CMO (maps to CBO set)", () => {
    const qs = questionsForRole("cmo");
    expect(qs).toHaveLength(5);
  });

  it("returns 5 questions for CHRO", () => {
    const qs = questionsForRole("chro");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("attrition");
  });

  it("returns 5 generic questions for unknown role", () => {
    const qs = questionsForRole("vp_mystery");
    expect(qs).toHaveLength(5);
    expect(qs[0]).toContain("important");
  });

  it("CDO role maps to CTO question set", () => {
    const cto = questionsForRole("cto");
    const cdo = questionsForRole("cdo");
    expect(cdo).toEqual(cto);
  });
});

describe("ExecutiveSynthesis contract", () => {
  it("validates a well-formed synthesis object", () => {
    const result = executiveSynthesisSchema.safeParse({
      role: "ceo",
      workspaceId: "workspace-demo",
      generatedAt: new Date().toISOString(),
      questions: [
        {
          question: "What is the single most important thing I need to know today?",
          answer: "Revenue is tracking 12% below forecast due to delayed enterprise renewals.",
          confidence: 0.82,
          evidenceRefs: ["ev-001", "ev-002"],
          sources: [
            {
              id: "ev-001",
              label: "board-pack.pdf",
              sourceType: "document",
              department: "Finance",
              confidence: 0.91,
            },
          ],
          entities: [
            {
              id: "ent-001",
              type: "risk",
              name: "Enterprise renewal delay",
              confidence: 0.84,
            },
          ],
        },
      ],
      overallConfidence: 0.82,
      totalEvidenceRefs: ["ev-001", "ev-002"],
      agentCardCount: 3,
    });
    expect(result.success).toBe(true);
  });

  it("defaults source and entity traceability arrays for older synthesis payloads", () => {
    const result = executiveSynthesisQuestionSchema.safeParse({
      question: "What is the risk?",
      answer: "A decision is pending.",
      confidence: 0.75,
      evidenceRefs: ["ev-001"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sources).toEqual([]);
      expect(result.data.entities).toEqual([]);
    }
  });

  it("rejects synthesis with confidence outside 0-1", () => {
    const result = executiveSynthesisQuestionSchema.safeParse({
      question: "Test?",
      answer: "Answer.",
      confidence: 1.5,
      evidenceRefs: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects synthesis with missing required fields", () => {
    const result = executiveSynthesisSchema.safeParse({
      role: "ceo",
    });
    expect(result.success).toBe(false);
  });

  it("accepts synthesis with zero evidence refs (new workspace)", () => {
    const result = executiveSynthesisSchema.safeParse({
      role: "coo",
      workspaceId: "workspace-empty",
      generatedAt: new Date().toISOString(),
      questions: [],
      overallConfidence: 0,
      totalEvidenceRefs: [],
      agentCardCount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("accepts synthesis with negative-zero confidence (boundary)", () => {
    const result = executiveSynthesisQuestionSchema.safeParse({
      question: "What is the risk?",
      answer: "Insufficient evidence to answer this question.",
      confidence: 0,
      evidenceRefs: [],
    });
    expect(result.success).toBe(true);
  });
});
