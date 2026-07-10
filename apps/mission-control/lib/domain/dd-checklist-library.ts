/**
 * Due Diligence checklist library for NexusAI Mission Control (Vantage / DD
 * Copilot pivot).
 *
 * Follows the same typed-content-pack convention as sector-library.ts: a
 * structured library, not prose, so it can drive coverage scoring and the
 * IC memo template rather than just being reference documentation.
 *
 * Scope for this first pass: fintech M&A, the deal type closest to the
 * existing network per paperwork/pivots/dd-copilot/Strategy_DD_Copilot.md.
 * Other deal types are stubbed with a smaller item set and should be
 * expanded as real deals are run.
 *
 * NOT wired into an API route or UI yet — this is the content library only.
 * See coverageForDeal() for how a deal workspace's ingested evidence
 * (tagged via the existing `department` field, same mechanism as Quorum's
 * board-pack scoping) maps against checklist items to compute gaps.
 */

export type DealType = "fintech_ma" | "generic_ma";

export type DDSeverity = "critical" | "high" | "medium" | "low";

export type DDChecklistItem = {
  id: string;
  requirement: string;
  /** Evidence department tags that would satisfy this item — matched against
   * the same `department` field used for ingestion (see extract.ts /
   * retrieval.ts). A deal workspace tags uploads with these labels. */
  evidenceTags: string[];
  severity: DDSeverity;
  /** What a red flag looks like for this specific item — used to prompt the
   * synthesis/red-flag-detection step, not just track presence/absence. */
  redFlagIndicator: string;
};

export type DDChecklistCategory = {
  key: string;
  label: string;
  items: DDChecklistItem[];
};

// ---------------------------------------------------------------------------
// Fintech M&A checklist (primary — matches the existing network/wedge)
// ---------------------------------------------------------------------------

const FINTECH_MA_CATEGORIES: DDChecklistCategory[] = [
  {
    key: "financial",
    label: "Financial",
    items: [
      {
        id: "fin-01",
        requirement: "Audited financial statements, last 3 years",
        evidenceTags: ["Financial Statements"],
        severity: "critical",
        redFlagIndicator: "Qualified audit opinion, or no audit for the most recent year",
      },
      {
        id: "fin-02",
        requirement: "Monthly management accounts, trailing 12 months",
        evidenceTags: ["Management Accounts"],
        severity: "high",
        redFlagIndicator: "Material variance between management accounts and audited statements",
      },
      {
        id: "fin-03",
        requirement: "Revenue concentration by customer and by product",
        evidenceTags: ["Revenue Analysis"],
        severity: "high",
        redFlagIndicator: "Single customer or partner exceeding 20% of revenue",
      },
      {
        id: "fin-04",
        requirement: "Unit economics: CAC, LTV, contribution margin by product line",
        evidenceTags: ["Unit Economics"],
        severity: "medium",
        redFlagIndicator: "CAC payback period exceeding 24 months with no improving trend",
      },
      {
        id: "fin-05",
        requirement: "Working capital and cash flow forecast, 12-18 months forward",
        evidenceTags: ["Cash Flow Forecast"],
        severity: "high",
        redFlagIndicator: "Runway under 6 months without this transaction closing",
      },
    ],
  },
  {
    key: "regulatory",
    label: "Regulatory & Licensing",
    items: [
      {
        id: "reg-01",
        requirement: "Current regulatory license(s) and good-standing confirmation from the regulator",
        evidenceTags: ["Regulatory License"],
        severity: "critical",
        redFlagIndicator: "License under conditional status, probation, or pending renewal",
      },
      {
        id: "reg-02",
        requirement: "Regulatory correspondence and findings, last 3 years",
        evidenceTags: ["Regulatory Correspondence"],
        severity: "critical",
        redFlagIndicator: "Open, unresolved regulatory finding or enforcement action",
      },
      {
        id: "reg-03",
        requirement: "AML/CTF policy and most recent independent AML audit",
        evidenceTags: ["AML Policy", "AML Audit"],
        severity: "critical",
        redFlagIndicator: "AML audit older than 12 months, or unresolved high-severity findings",
      },
      {
        id: "reg-04",
        requirement: "Data protection / data residency compliance documentation",
        evidenceTags: ["Data Protection Compliance"],
        severity: "high",
        redFlagIndicator: "Customer or transaction data stored outside the required jurisdiction",
      },
      {
        id: "reg-05",
        requirement: "Change-of-control notification requirements and regulator pre-approval process for this deal",
        evidenceTags: ["Change of Control Requirements"],
        severity: "critical",
        redFlagIndicator: "Deal structure does not account for required regulator pre-approval timeline",
      },
    ],
  },
  {
    key: "legal_corporate",
    label: "Legal & Corporate",
    items: [
      {
        id: "leg-01",
        requirement: "Cap table and full shareholder register",
        evidenceTags: ["Cap Table"],
        severity: "critical",
        redFlagIndicator: "Undisclosed related-party ownership or unresolved founder dispute",
      },
      {
        id: "leg-02",
        requirement: "Material contracts: partners, processors, key vendors",
        evidenceTags: ["Material Contracts"],
        severity: "high",
        redFlagIndicator: "Change-of-control clause allowing key partner to terminate on this deal",
      },
      {
        id: "leg-03",
        requirement: "Litigation and dispute register, active and settled last 5 years",
        evidenceTags: ["Litigation Register"],
        severity: "high",
        redFlagIndicator: "Active litigation with claim value exceeding 10% of deal value",
      },
      {
        id: "leg-04",
        requirement: "IP ownership confirmation for core technology (not contractor-owned)",
        evidenceTags: ["IP Ownership"],
        severity: "high",
        redFlagIndicator: "Core platform IP held by a founder or contractor personally, not the company",
      },
    ],
  },
  {
    key: "technology_data",
    label: "Technology & Data",
    items: [
      {
        id: "tech-01",
        requirement: "System architecture overview and infrastructure provider dependencies",
        evidenceTags: ["Architecture Overview"],
        severity: "medium",
        redFlagIndicator: "Single point of failure with no documented failover for a licensed payment flow",
      },
      {
        id: "tech-02",
        requirement: "Security incident history, last 3 years, including any breach notifications made",
        evidenceTags: ["Security Incident History"],
        severity: "critical",
        redFlagIndicator: "Undisclosed breach later surfacing in regulator correspondence",
      },
      {
        id: "tech-03",
        requirement: "Third-party penetration test and vulnerability scan results, most recent",
        evidenceTags: ["Penetration Test Results"],
        severity: "high",
        redFlagIndicator: "No pentest in the last 12 months, or unresolved critical findings",
      },
    ],
  },
  {
    key: "hr_people",
    label: "HR & People",
    items: [
      {
        id: "hr-01",
        requirement: "Org chart and key-person dependency map",
        evidenceTags: ["Org Chart"],
        severity: "medium",
        redFlagIndicator: "Regulatory/compliance function is a single person with no deputy",
      },
      {
        id: "hr-02",
        requirement: "Key employee retention and change-of-control compensation terms",
        evidenceTags: ["Retention Terms"],
        severity: "medium",
        redFlagIndicator: "No retention terms for the compliance officer or CTO ahead of a control change",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Generic M&A checklist (lighter fallback for non-fintech deals)
// ---------------------------------------------------------------------------

const GENERIC_MA_CATEGORIES: DDChecklistCategory[] = [
  {
    key: "financial",
    label: "Financial",
    items: [
      {
        id: "gen-fin-01",
        requirement: "Audited financial statements, last 3 years",
        evidenceTags: ["Financial Statements"],
        severity: "critical",
        redFlagIndicator: "Qualified audit opinion, or no audit for the most recent year",
      },
      {
        id: "gen-fin-02",
        requirement: "Revenue concentration by customer",
        evidenceTags: ["Revenue Analysis"],
        severity: "high",
        redFlagIndicator: "Single customer exceeding 25% of revenue",
      },
    ],
  },
  {
    key: "legal_corporate",
    label: "Legal & Corporate",
    items: [
      {
        id: "gen-leg-01",
        requirement: "Cap table and full shareholder register",
        evidenceTags: ["Cap Table"],
        severity: "critical",
        redFlagIndicator: "Undisclosed related-party ownership",
      },
      {
        id: "gen-leg-02",
        requirement: "Material contracts and litigation register",
        evidenceTags: ["Material Contracts", "Litigation Register"],
        severity: "high",
        redFlagIndicator: "Active litigation with claim value exceeding 10% of deal value",
      },
    ],
  },
];

const CHECKLISTS: Record<DealType, DDChecklistCategory[]> = {
  fintech_ma: FINTECH_MA_CATEGORIES,
  generic_ma: GENERIC_MA_CATEGORIES,
};

export function checklistForDealType(dealType: DealType): DDChecklistCategory[] {
  return CHECKLISTS[dealType] ?? CHECKLISTS.generic_ma;
}

// ---------------------------------------------------------------------------
// Coverage scoring — "what does the data room NOT contain"
// ---------------------------------------------------------------------------

export type DDCoverageResult = {
  itemId: string;
  requirement: string;
  category: string;
  severity: DDSeverity;
  covered: boolean;
};

/**
 * Compares ingested evidence department tags for a deal workspace against
 * every checklist item's evidenceTags. An item is "covered" if at least one
 * of its evidenceTags matches a department tag actually present in the
 * evidence set. This is deliberately simple (tag match, not semantic
 * matching) so the gap map is trustworthy: it tells you what evidence is
 * present, not whether the AI inferred coverage from unrelated documents.
 */
export function coverageForDeal(
  dealType: DealType,
  ingestedDepartmentTags: string[]
): DDCoverageResult[] {
  const tagSet = new Set(ingestedDepartmentTags.map((t) => t.toLowerCase()));
  const categories = checklistForDealType(dealType);
  const results: DDCoverageResult[] = [];

  for (const category of categories) {
    for (const item of category.items) {
      const covered = item.evidenceTags.some((tag) => tagSet.has(tag.toLowerCase()));
      results.push({
        itemId: item.id,
        requirement: item.requirement,
        category: category.label,
        severity: item.severity,
        covered,
      });
    }
  }
  return results;
}

/** Convenience: just the gaps, most severe first — this is the "coverage gap map" feature. */
export function gapsForDeal(dealType: DealType, ingestedDepartmentTags: string[]): DDCoverageResult[] {
  const severityOrder: Record<DDSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return coverageForDeal(dealType, ingestedDepartmentTags)
    .filter((r) => !r.covered)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

// ---------------------------------------------------------------------------
// IC memo template — section structure for the first-draft export
// ---------------------------------------------------------------------------

export type ICMemoSection = {
  key: string;
  title: string;
  guidance: string;
};

export const IC_MEMO_TEMPLATE: ICMemoSection[] = [
  {
    key: "thesis",
    title: "Investment Thesis",
    guidance: "One paragraph: why this deal, why now, what the buyer believes is true that the market has not priced in.",
  },
  {
    key: "financial_summary",
    title: "Financial Summary",
    guidance: "Revenue, margin, growth trend, and unit economics — grounded only in ingested financial evidence, with source citations.",
  },
  {
    key: "red_flags",
    title: "Red Flags",
    guidance: "Every finding tagged critical or high severity from the checklist, each with its evidence citation. If no evidence supports a claim, say so explicitly rather than omitting it.",
  },
  {
    key: "coverage_gaps",
    title: "Coverage Gaps",
    guidance: "Checklist items with no matching evidence in the data room — see gapsForDeal(). This is a first-class section, not a footnote: what's missing is as important as what's found.",
  },
  {
    key: "regulatory_position",
    title: "Regulatory Position",
    guidance: "License standing, open findings, change-of-control approval requirements and timeline.",
  },
  {
    key: "recommendation",
    title: "Recommendation",
    guidance: "Proceed / proceed with conditions / do not proceed, with the conditions or open questions stated explicitly. Never a bare recommendation without the reasoning chain.",
  },
];
