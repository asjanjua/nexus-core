/**
 * Product-Room Activation Adapters
 *
 * Maps Pivot Agent Suites (Quorum, Meridian, Vantage, Nucleus)
 * to room templates and activation contracts. Each adapter
 * defines what rooms a product line requires, what agent
 * pack is needed, and what authority boundary must be
 * acknowledged before activation.
 *
 * Activation hands into the vertical rather than creating
 * generic C-suite dashboards — each product room retains
 * its own workflow registry and authority boundary.
 */

import type { PivotAgentSuiteId } from "@/lib/agents/pivot-agent-catalog";
import type { RoomTemplate } from "@/lib/contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductRoomAdapter = {
  suiteId: PivotAgentSuiteId;
  suiteName: string;
  /** Room templates this product line requires for activation. */
  requiredRooms: RoomTemplate[];
  /** Room templates that enhance the product line but are optional. */
  optionalRooms: RoomTemplate[];
  /** Agent pack key needed for LLM synthesis in this product line. */
  agentPack: string;
  /** Authority boundary text the admin must acknowledge. */
  authorityBoundary: string;
  /** Evidence scope — what sources are relevant for this product line. */
  evidenceScope: string;
};

// ---------------------------------------------------------------------------
// Product adapters
// ---------------------------------------------------------------------------

export const PRODUCT_ROOM_ADAPTERS: Record<string, ProductRoomAdapter> = {
  quorum: {
    suiteId: "quorum",
    suiteName: "Quorum — Governance & Board Intelligence",
    requiredRooms: ["executive", "board", "risk"],
    optionalRooms: ["people", "finance"],
    agentPack: "quorum-governance-review",
    authorityBoundary:
      "Quorum produces governance insights and board-level synthesis. It does not make decisions or sign commitments. All outputs are advisory and require human review before board submission.",
    evidenceScope: "board_papers, meeting_minutes, compliance_reports, policy_documents, audit_logs",
  },
  meridian: {
    suiteId: "meridian",
    suiteName: "Meridian — Regulatory & Compliance Intelligence",
    requiredRooms: ["executive", "submission"],
    optionalRooms: ["risk", "operations"],
    agentPack: "meridian-compliance-review",
    authorityBoundary:
      "Meridian identifies regulatory obligations and compliance gaps. It does not provide legal advice or replace qualified counsel. All compliance assessments are preliminary and must be verified by a licensed practitioner.",
    evidenceScope: "regulatory_filings, compliance_checklists, audit_reports, license_applications, correspondence",
  },
  vantage: {
    suiteId: "vantage",
    suiteName: "Vantage — Deal & Investment Intelligence",
    requiredRooms: ["executive", "deal"],
    optionalRooms: ["finance", "risk"],
    agentPack: "vantage-diligence-analysis",
    authorityBoundary:
      "Vantage provides deal analysis and diligence summaries. It does not value companies, recommend investments, or negotiate terms. All financial assessments are data-backed only — judgment remains with the deal team.",
    evidenceScope: "decks, financial_models, term_sheets, cap_tables, market_research, due_diligence_reports",
  },
  nucleus: {
    suiteId: "nucleus",
    suiteName: "Nucleus — Company Memory & Knowledge Graph",
    requiredRooms: ["executive"],
    optionalRooms: ["operations", "growth", "technology", "people"],
    agentPack: "nexus-agent-governance",
    authorityBoundary:
      "Nucleus is the company knowledge foundation. It indexes, links, and retrieves evidence across all departments. It does not rewrite history or alter source documents. All knowledge graph connections are traceable to ingested evidence.",
    evidenceScope: "all_departments: any processed evidence record in the workspace",
  },
};

// ---------------------------------------------------------------------------
// Activation helpers
// ---------------------------------------------------------------------------

export function getAdapterForSuite(suiteId: PivotAgentSuiteId): ProductRoomAdapter | undefined {
  return PRODUCT_ROOM_ADAPTERS[suiteId];
}

export function getRoomsForSuite(suiteId: PivotAgentSuiteId): RoomTemplate[] {
  const adapter = getAdapterForSuite(suiteId);
  if (!adapter) return [];
  return [...adapter.requiredRooms, ...adapter.optionalRooms];
}

export function getRequiredRoomsForSuite(suiteId: PivotAgentSuiteId): RoomTemplate[] {
  return getAdapterForSuite(suiteId)?.requiredRooms ?? [];
}
