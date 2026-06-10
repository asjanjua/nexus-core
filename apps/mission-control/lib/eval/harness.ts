import type { EvalResult, EvalRunSummary } from "@/lib/contracts";
import { GOLDEN_SET, type GoldenEvalCase } from "@/lib/eval/golden-set";

export type EvalLLMFn = (prompt: string, testCase: GoldenEvalCase) => Promise<{ text: string; confidence?: number }>;

function includesIgnoreCase(text: string, needle: string): boolean {
  return text.toLowerCase().includes(needle.toLowerCase());
}

export async function runEval(
  workspaceId: string,
  llmFn: EvalLLMFn,
  cases: GoldenEvalCase[] = GOLDEN_SET
): Promise<EvalRunSummary> {
  const results: EvalResult[] = [];

  for (const testCase of cases) {
    const started = Date.now();
    const response = await llmFn(testCase.prompt, testCase);
    const latencyMs = Date.now() - started;
    const actualOutput = response.text;
    const matchedKeywords = testCase.expectedKeywords.filter((keyword) => includesIgnoreCase(actualOutput, keyword));
    const failedKeywords = testCase.expectedKeywords.filter((keyword) => !includesIgnoreCase(actualOutput, keyword));
    const forbiddenMatches = testCase.mustNotContain.filter((keyword) => includesIgnoreCase(actualOutput, keyword));
    const confidence = response.confidence ?? 0.7;
    const confidenceMet = confidence >= testCase.minConfidence;
    const keywordScore = matchedKeywords.length / Math.max(1, testCase.expectedKeywords.length);
    const penalty = forbiddenMatches.length ? 0.5 : 0;
    const score = Math.max(0, Math.min(1, keywordScore - penalty));
    const passed = failedKeywords.length === 0 && forbiddenMatches.length === 0 && confidenceMet;

    results.push({
      caseId: testCase.id,
      category: testCase.category,
      passed,
      score,
      actualOutput,
      matchedKeywords,
      failedKeywords,
      forbiddenMatches,
      confidenceMet,
      latencyMs,
      notes: passed ? "passed" : `Failed: ${failedKeywords.concat(forbiddenMatches).join(", ") || "confidence"}`
    });
  }

  const passed = results.filter((result) => result.passed).length;
  const avgConfidence = results.reduce((sum, result) => sum + (result.confidenceMet ? 1 : 0), 0) / Math.max(1, results.length);
  const avgLatencyMs = Math.round(results.reduce((sum, result) => sum + result.latencyMs, 0) / Math.max(1, results.length));

  return {
    id: `eval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId,
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: Number((passed / Math.max(1, results.length)).toFixed(2)),
    avgConfidence: Number(avgConfidence.toFixed(2)),
    avgLatencyMs,
    results,
    createdAt: new Date().toISOString()
  };
}
