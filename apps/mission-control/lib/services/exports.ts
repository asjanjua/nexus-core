/**
 * Pilot export service — Phase 8 (Paid Pilot Packaging)
 *
 * Generates structured data payloads for four pilot delivery artifacts:
 *
 *   weekly_brief   — executive narrative for all active roles with risk and recommendation summary
 *   risk_radar     — risk signals extracted from evidence, ranked by severity
 *   reco_register  — all recommendations with status, evidence refs, actor, and timestamp
 *   one_pager      — single-page executive summary: active roles, ingested docs, top signals
 *
 * All exports are data objects. Rendering to PDF or XLSX happens in the API routes
 * that call these functions, keeping this service format-agnostic.
 *
 * AI responsibility: AI generates the weekly brief narrative from approved evidence only.
 * Risk radar and recommendation register are direct data extractions — no additional LLM call.
 * Humans review before sharing externally. Never auto-send.
 */

import { repository } from "@/lib/data/repository";
import { ask } from "@/lib/services/llm";
import { buildCompanyContext } from "@/lib/domain/sector-library";
import type { EvidenceRecord, Recommendation } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskEntry = {
  title: string;
  severity: "high" | "medium" | "low";
  source: string;
  department: string;
  freshnessHours: number;
  evidenceId: string;
};

export type WeeklyBriefRole = {
  role: string;
  label: string;
  narrative: string;
};

export type WeeklyBriefExport = {
  workspaceName: string;
  weekEnding: string;
  generatedAt: string;
  activeRoles: WeeklyBriefRole[];
  topRisks: RiskEntry[];
  openRecommendations: number;
  approvedRecommendations: number;
};

export type RiskRadarExport = {
  workspaceName: string;
  generatedAt: string;
  high: RiskEntry[];
  medium: RiskEntry[];
  low: RiskEntry[];
  totalSignals: number;
};

export type RecoRegisterRow = {
  id: string;
  title: string;
  status: string;
  owner: string;
  confidence: number;
  evidenceRefs: string[];
  createdAt: string;
  updatedAt: string;
};

export type RecoRegisterExport = {
  workspaceName: string;
  generatedAt: string;
  rows: RecoRegisterRow[];
};

export type OnePagerExport = {
  workspaceName: string;
  generatedAt: string;
  activeRoles: string[];
  totalEvidenceRecords: number;
  processedRecords: number;
  topFindings: string[];
  topRisks: string[];
  openRecommendations: RecoRegisterRow[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityFromEvidence(record: EvidenceRecord): "high" | "medium" | "low" {
  const text = record.text.toLowerCase();
  const highSignals = ["critical", "urgent", "breach", "overdue", "escalat", "regulatory", "aml", "fraud", "penalty", "sanction", "audit finding"];
  const medSignals = ["risk", "delay", "blocker", "issue", "concern", "warning", "non-compliance", "gap"];
  if (highSignals.some(s => text.includes(s))) return "high";
  if (medSignals.some(s => text.includes(s))) return "medium";
  return "low";
}

function sourceName(record: EvidenceRecord): string {
  return record.sourcePath.split("/").pop() ?? record.sourcePath;
}

function roleLabelFromKey(role: string): string {
  const labels: Record<string, string> = {
    ceo: "CEO", coo: "COO / Operations", cbo: "CBO / Strategy", cto: "CTO / Technology",
    cfo: "CFO / Finance", cro: "CRO / Risk", cco: "CCO / Compliance", cmo: "CMO / Marketing",
    cpo: "CPO / Product", chro: "CHRO / People", growth_officer: "Growth Officer",
    vp_performance_mktg: "VP Performance Marketing", brand_community: "Brand & Community",
    managing_partner: "Managing Partner", chief_medical: "Chief Medical Officer",
    vp_supply_chain: "VP Supply Chain", project_director: "Project Director",
    vp_customer_success: "VP Customer Success", practice_lead: "Practice Lead",
    chief_of_staff: "Chief of Staff", general_counsel: "General Counsel",
    franchise_manager: "Franchise Manager", owner: "Owner", ops_manager: "Ops Manager",
  };
  return labels[role] ?? role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Risk extraction (deterministic — no LLM)
// ---------------------------------------------------------------------------

export function extractRiskSignals(evidence: EvidenceRecord[], limit = 20): RiskEntry[] {
  return evidence
    .filter(r => r.ingestionStatus === "processed" && r.sensitivity !== "restricted")
    .map(r => ({
      title: sourceName(r),
      severity: severityFromEvidence(r),
      source: sourceName(r),
      department: r.department ?? "General",
      freshnessHours: r.freshnessHours,
      evidenceId: r.id,
    }))
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Weekly brief narrative (LLM-generated, one call per active role)
// ---------------------------------------------------------------------------

const BRIEF_SYSTEM_PROMPT = `You are a senior executive intelligence analyst. Write a concise executive brief for one leadership role.

Rules:
- 3-5 sentences maximum.
- Ground every sentence in the evidence provided.
- State what is happening, why it matters, and the single most useful next action.
- Use professional, executive-ready language.
- Do not speculate beyond the evidence.`;

async function generateRoleBrief(
  role: string,
  evidence: EvidenceRecord[],
  companyContext: string,
  workspaceId: string
): Promise<string> {
  if (!evidence.length) {
    return `No processed evidence available for the ${roleLabelFromKey(role)} lens. Upload relevant documents to generate this brief.`;
  }

  const snippet = evidence
    .slice(0, 4)
    .map((r, i) => `[${i + 1}] ${sourceName(r)} (${r.department ?? "General"}, ${r.freshnessHours}h old): ${r.text.slice(0, 300)}`)
    .join("\n\n");

  const prompt = `${companyContext ? `${companyContext}\n\n` : ""}Role: ${roleLabelFromKey(role)}\n\nEvidence:\n\n${snippet}\n\nWrite the executive brief for this role.`;

  try {
    return await ask(prompt, BRIEF_SYSTEM_PROMPT, {
      maxTokens: 256,
      temperature: 0.15,
      workspaceId,
      route: "exports_brief",
      surfaceId: "daily_executive_brief"
    });
  } catch {
    return `Evidence available but AI synthesis unavailable. Check your LLM API key configuration.`;
  }
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export async function buildWeeklyBrief(workspaceId: string, workspaceName: string): Promise<WeeklyBriefExport> {
  const [allEvidence, profile, recommendations] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId),
    repository.getWorkspaceProfile(workspaceId),
    repository.getRecommendations(workspaceId),
  ]);

  const processed = allEvidence.filter(r => r.ingestionStatus === "processed" && r.sensitivity !== "restricted");
  const companyContext = profile ? buildCompanyContext(profile) : "";

  // Determine active roles from workspace profile or fall back to core four
  const activeRoles: string[] = (profile?.priorityRoles?.length
    ? profile.priorityRoles
    : ["ceo", "coo", "cbo", "cto"]
  ).slice(0, 6);

  const roleBriefs = await Promise.all(
    activeRoles.map(async (role) => ({
      role,
      label: roleLabelFromKey(role),
      narrative: await generateRoleBrief(role, processed, companyContext, workspaceId),
    }))
  );

  const risks = extractRiskSignals(processed, 5);
  const open = recommendations.filter(r => r.status === "draft" || r.status === "in_review").length;
  const approved = recommendations.filter(r => r.status === "approved").length;

  return {
    workspaceName,
    weekEnding: new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(),
    activeRoles: roleBriefs,
    topRisks: risks,
    openRecommendations: open,
    approvedRecommendations: approved,
  };
}

export async function buildRiskRadar(workspaceId: string, workspaceName: string): Promise<RiskRadarExport> {
  const allEvidence = await repository.getEvidenceForWorkspace(workspaceId);
  const processed = allEvidence.filter(r => r.ingestionStatus === "processed" && r.sensitivity !== "restricted");
  const signals = extractRiskSignals(processed, 50);

  return {
    workspaceName,
    generatedAt: new Date().toISOString(),
    high: signals.filter(s => s.severity === "high"),
    medium: signals.filter(s => s.severity === "medium"),
    low: signals.filter(s => s.severity === "low"),
    totalSignals: signals.length,
  };
}

export async function buildRecoRegister(workspaceId: string, workspaceName: string): Promise<RecoRegisterExport> {
  const rows = await repository.getRecommendations(workspaceId);
  const sorted = [...rows].sort((a, b) => {
    const order: Record<string, number> = { draft: 0, in_review: 1, approved: 2, rejected: 3, promoted: 4 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return {
    workspaceName,
    generatedAt: new Date().toISOString(),
    rows: sorted.map(r => ({
      id: r.id,
      title: r.title,
      status: r.status,
      owner: r.owner,
      confidence: r.confidence,
      evidenceRefs: r.evidenceRefs,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  };
}

export async function buildOnePager(workspaceId: string, workspaceName: string): Promise<OnePagerExport> {
  const [allEvidence, profile, recommendations] = await Promise.all([
    repository.getEvidenceForWorkspace(workspaceId),
    repository.getWorkspaceProfile(workspaceId),
    repository.getRecommendations(workspaceId),
  ]);

  const processed = allEvidence.filter(r => r.ingestionStatus === "processed");
  const activeRoles: string[] = profile?.priorityRoles?.length
    ? profile.priorityRoles.slice(0, 6)
    : ["ceo", "coo", "cbo", "cto"];

  const risks = extractRiskSignals(processed, 3);
  const openRecos = recommendations
    .filter(r => r.status === "draft" || r.status === "in_review")
    .slice(0, 3)
    .map(r => ({
      id: r.id, title: r.title, status: r.status, owner: r.owner,
      confidence: r.confidence, evidenceRefs: r.evidenceRefs,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    }));

  // Top findings from highest-confidence processed evidence
  const topFindings = processed
    .sort((a, b) => b.extractionConfidence - a.extractionConfidence)
    .slice(0, 3)
    .map(r => `${sourceName(r)} (${r.department ?? "General"}) — ${Math.round(r.extractionConfidence * 100)}% confidence`);

  return {
    workspaceName,
    generatedAt: new Date().toISOString(),
    activeRoles: activeRoles.map(roleLabelFromKey),
    totalEvidenceRecords: allEvidence.length,
    processedRecords: processed.length,
    topFindings,
    topRisks: risks.map(r => `${r.severity.toUpperCase()}: ${r.title} (${r.department})`),
    openRecommendations: openRecos,
  };
}
