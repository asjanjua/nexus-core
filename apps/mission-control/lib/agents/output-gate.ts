import type { AgentControlProfile, ActionRight } from "@/lib/contracts";
import { canUseTool } from "@/lib/agents/passport-policy";

export type OutputGateDecision =
  | { allowed: true; escalationRequired: false }
  | { allowed: true; escalationRequired: true; reason: string }
  | { allowed: false; escalationRequired: true; reason: string };

const TRIGGER_PATTERNS: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "legal_interpretation", pattern: /\b(legal opinion|legally binding|liability|indemnity|breach of contract|governing law)\b/i },
  { reason: "regulatory_commitment", pattern: /\b(regulator|regulatory|filing|supervisory|compliance statement|statement of compliance)\b/i },
  { reason: "pricing_or_fee_commitment", pattern: /\b(price|pricing|fee|discount|commercial terms|payment terms|quote)\b/i },
  { reason: "data_residency_statement", pattern: /\b(data residency|data localisation|data localization|hosted in|stored in)\b/i },
  { reason: "data_protection_statement", pattern: /\b(data protection|personal data|PII|privacy|GDPR|consent)\b/i },
  { reason: "cross_entity_data_access", pattern: /\b(cross-entity|cross entity|between entities|across entities|between subsidiaries|across subsidiaries)\b/i },
  { reason: "external_communication", pattern: /\b(send to client|email the client|share externally|publish|post externally)\b/i },
  { reason: "financial_figure_above_threshold", pattern: /\b(USD|AED|SAR|PKR|\$|revenue|budget|cash|runway|margin|investment)\b/i }
];

const HARD_STOP_PATTERNS: Array<{ tool: string; pattern: RegExp }> = [
  { tool: "send_email", pattern: /\b(send|email|mail)\b.*\b(client|customer|regulator|external)\b/i },
  { tool: "submit_filing", pattern: /\b(submit|file)\b.*\b(filing|return|regulatory response|application)\b/i },
  { tool: "make_payment", pattern: /\b(pay|payment|transfer funds|wire)\b/i },
  { tool: "modify_contract", pattern: /\b(modify|change|amend|redline|execute)\b.*\b(contract|agreement|terms)\b/i },
  { tool: "contact_regulator", pattern: /\b(contact|write to|call)\b.*\b(regulator|central bank|SECP|SBP|SAMA|CBUAE)\b/i },
  { tool: "external_posting", pattern: /\b(post|publish)\b.*\b(public|social|linkedin|x\.com|twitter)\b/i },
  { tool: "source_system_writeback", pattern: /\b(update|write back|sync)\b.*\b(CRM|ERP|HRIS|source system)\b/i },
  { tool: "hr_action", pattern: /\b(hire|fire|terminate|disciplinary|promotion|salary)\b/i },
  { tool: "legal_commitment", pattern: /\b(commit|guarantee|warrant|represent)\b.*\b(legal|contract|liability)\b/i },
  { tool: "financial_commitment", pattern: /\b(commit|approve|guarantee)\b.*\b(budget|spend|fee|investment|payment)\b/i }
];

export function evaluateOutputGate(
  output: string,
  passport: AgentControlProfile,
  requestedAction: ActionRight = "recommend"
): OutputGateDecision {
  for (const hardStop of HARD_STOP_PATTERNS) {
    if (!hardStop.pattern.test(output)) continue;
    const decision = canUseTool(hardStop.tool, passport, requestedAction);
    if (!decision.allowed) {
      return {
        allowed: false,
        escalationRequired: true,
        reason: `hard_stop:${hardStop.tool}:${decision.reason}`
      };
    }
  }

  for (const trigger of TRIGGER_PATTERNS) {
    if (trigger.pattern.test(output)) {
      return { allowed: true, escalationRequired: true, reason: trigger.reason };
    }
  }

  return { allowed: true, escalationRequired: false };
}
