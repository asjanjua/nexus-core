import type { Sensitivity } from "@/lib/contracts";

export type RedTeamViolation = {
  category: "pii" | "overconfidence" | "unsafe_action" | "sensitivity" | "hard_stop";
  severity: "medium" | "high" | "critical";
  match: string;
  message: string;
};

export type RedTeamContext = {
  workspaceId: string;
  agentId?: string;
  roleKey?: string;
  maxSensitivity?: Sensitivity;
  outputSensitivity?: Sensitivity;
  humanReviewGate?: boolean;
};

export type RedTeamResult = {
  passed: boolean;
  violations: RedTeamViolation[];
  sanitizedContent: string;
};

const SENSITIVITY_RANK: Record<Sensitivity, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3
};

const PATTERNS: Array<Omit<RedTeamViolation, "match"> & { regex: RegExp }> = [
  { category: "pii", severity: "high", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, message: "Email address exposed in generated output." },
  { category: "pii", severity: "critical", regex: /\b(?:\d[ -]*?){13,19}\b/g, message: "Potential credit-card or account number exposed." },
  { category: "pii", severity: "critical", regex: /\b\d{5}-\d{7}-\d\b/g, message: "Potential CNIC exposed." },
  { category: "pii", severity: "critical", regex: /\b784-\d{4}-\d{7}-\d\b/g, message: "Potential Emirates ID exposed." },
  { category: "pii", severity: "critical", regex: /\b[A-Z]\d{7,8}\b/g, message: "Potential passport number exposed." },
  { category: "overconfidence", severity: "medium", regex: /\b(guaranteed|certain to|will definitely|100% accurate|no risk)\b/gi, message: "Unsupported certainty language detected." },
  { category: "unsafe_action", severity: "critical", regex: /\b(transfer funds|wire to|make payment|send money|submit filing|contact regulator)\b/gi, message: "Unsafe action requires human review gate." },
  { category: "hard_stop", severity: "critical", regex: /\b(send email|file with regulator|modify contract|approve contract|terminate employee|post externally|write back to source system)\b/gi, message: "Hard-stop action leakage detected." }
];

function maskPii(content: string): string {
  return content
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\b\d{5}-\d{7}-\d\b/g, "[redacted-id]")
    .replace(/\b784-\d{4}-\d{7}-\d\b/g, "[redacted-id]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[redacted-number]");
}

export function checkOutput(content: string, context: RedTeamContext): RedTeamResult {
  const violations: RedTeamViolation[] = [];

  for (const pattern of PATTERNS) {
    for (const match of content.matchAll(pattern.regex)) {
      if (pattern.category === "unsafe_action" && context.humanReviewGate) continue;
      violations.push({
        category: pattern.category,
        severity: pattern.severity,
        match: match[0],
        message: pattern.message
      });
    }
  }

  if (
    context.maxSensitivity &&
    context.outputSensitivity &&
    SENSITIVITY_RANK[context.outputSensitivity] > SENSITIVITY_RANK[context.maxSensitivity]
  ) {
    violations.push({
      category: "sensitivity",
      severity: "critical",
      match: context.outputSensitivity,
      message: `Output sensitivity ${context.outputSensitivity} exceeds agent ceiling ${context.maxSensitivity}.`
    });
  }

  return {
    passed: violations.length === 0,
    violations,
    sanitizedContent: maskPii(content)
  };
}
