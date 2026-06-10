import type { EntityInput, EntityType, EvidenceRecord } from "@/lib/contracts";
import { repository } from "@/lib/data/repository";

type EntityCandidate = {
  type: EntityType;
  name: string;
  confidence: number;
  metadata?: Record<string, unknown>;
};

const STOP_NAMES = new Set([
  "The", "This", "That", "These", "Those", "NexusAI", "AI", "CEO", "COO", "CTO", "CFO",
  "Q1", "Q2", "Q3", "Q4", "USD", "AED", "SAR", "KPI"
]);

const SYSTEM_TERMS = [
  "Salesforce", "HubSpot", "Slack", "Teams", "SharePoint", "Google Drive", "Jira",
  "SAP", "Oracle", "NetSuite", "QuickBooks", "Stripe", "Snowflake", "BigQuery",
  "Postgres", "PostgreSQL", "R2", "Clerk", "Render"
];

const PROCESS_PATTERNS = [
  /\b([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+){0,3}\s+(?:workflow|process|handoff|pipeline|review|approval|onboarding|reconciliation))\b/g,
  /\b((?:KYC|AML|KYB|CRM|ERP|HRIS)\s+(?:workflow|process|handoff|review|pipeline))\b/g
];

const RISK_PATTERNS = [
  /\b((?:margin|revenue|delivery|regulatory|compliance|security|churn|liquidity|pricing|operational|customer|data)(?:\s+(?:compression|risk|issue|gap|exposure|delay|blocker|failure)){1,3})\b/gi,
  /\b((?:blocked|overdue|delayed|escalated|at risk|risk of)[^.]{0,80})/gi
];

const KPI_PATTERNS = [
  /\b([A-Z][A-Za-z /-]{2,40}?\s(?:rate|margin|cycle time|conversion|retention|churn|ARR|MRR|AUM|NPS|CAC|LTV|ROAS|CTR|CPC|CPA))\b/g,
  /\b(ARR|MRR|AUM|NPS|CAC|LTV|ROAS|CTR|CPC|CPA|EBITDA|gross margin|net revenue retention|onboarding cycle time)\b/gi
];

function cleanName(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[^\w$]+|[^\w)%]+$/g, "")
    .trim();
}

function add(
  map: Map<string, EntityCandidate>,
  candidate: EntityCandidate
) {
  const name = cleanName(candidate.name);
  if (name.length < 2 || name.length > 200 || STOP_NAMES.has(name)) return;
  const key = `${candidate.type}:${name.toLowerCase()}`;
  const existing = map.get(key);
  if (!existing || candidate.confidence > existing.confidence) {
    map.set(key, { ...candidate, name });
  }
}

function extractTitleCaseEntities(text: string, map: Map<string, EntityCandidate>) {
  const matches = text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4})\b/g);
  for (const match of matches) {
    const name = cleanName(match[1]);
    if (!name || /\b(The|This|That|Executive|Board|Decision|Risk|Recommendation)\b/.test(name)) continue;
    const type: EntityType = /\b(Inc|Ltd|LLC|Bank|Group|Capital|Partners|Systems|Advisory|Company|Corp|Corporation)\b/.test(name)
      ? "organization"
      : "person";
    add(map, { type, name, confidence: type === "organization" ? 0.72 : 0.58, metadata: { method: "title_case" } });
  }
}

function extractRegexEntities(
  text: string,
  map: Map<string, EntityCandidate>,
  type: EntityType,
  patterns: RegExp[],
  confidence: number
) {
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      add(map, { type, name: match[1], confidence, metadata: { method: "pattern" } });
    }
  }
}

function extractAmountsAndDates(text: string, map: Map<string, EntityCandidate>) {
  const amounts = text.matchAll(/\b(?:USD|AED|SAR|PKR|GBP|EUR|\$)\s?[\d,.]+(?:\s?(?:M|B|K|million|billion|thousand))?\b/gi);
  for (const match of amounts) {
    add(map, { type: "amount", name: match[0], confidence: 0.82, metadata: { method: "currency_amount" } });
  }

  const percentages = text.matchAll(/\b\d{1,3}(?:\.\d+)?%\b/g);
  for (const match of percentages) {
    add(map, { type: "kpi", name: match[0], confidence: 0.65, metadata: { method: "percentage" } });
  }

  const dates = text.matchAll(/\b(?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|Q[1-4]\s+\d{4}|20\d{2})\b/gi);
  for (const match of dates) {
    add(map, { type: "date", name: match[0], confidence: 0.76, metadata: { method: "date_pattern" } });
  }
}

function extractSystems(text: string, map: Map<string, EntityCandidate>) {
  for (const system of SYSTEM_TERMS) {
    if (new RegExp(`\\b${system.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
      add(map, { type: "system", name: system, confidence: 0.86, metadata: { method: "known_system" } });
    }
  }
}

export function extractEntityCandidates(record: EvidenceRecord): EntityInput[] {
  const map = new Map<string, EntityCandidate>();
  const text = record.text.slice(0, 20_000);

  extractTitleCaseEntities(text, map);
  extractRegexEntities(text, map, "process", PROCESS_PATTERNS, 0.78);
  extractRegexEntities(text, map, "risk", RISK_PATTERNS, 0.74);
  extractRegexEntities(text, map, "kpi", KPI_PATTERNS, 0.78);
  extractAmountsAndDates(text, map);
  extractSystems(text, map);

  if (record.department) {
    add(map, {
      type: "organization",
      name: record.department,
      confidence: 0.5,
      metadata: { method: "department_context", department: record.department }
    });
  }

  return Array.from(map.values()).slice(0, 40).map((candidate) => ({
    workspaceId: record.workspaceId,
    evidenceId: record.id,
    type: candidate.type,
    name: candidate.name,
    confidence: candidate.confidence,
    metadata: {
      ...candidate.metadata,
      sourceType: record.sourceType,
      sourcePath: record.sourcePath,
      department: record.department ?? null
    }
  }));
}

export async function extractAndStoreEntitiesForEvidence(record: EvidenceRecord): Promise<number> {
  if (record.ingestionStatus !== "processed") return 0;
  const candidates = extractEntityCandidates(record);
  if (!candidates.length) return 0;
  const saved = await repository.upsertEntities(candidates, "entity_extractor");
  return saved.length;
}
