/**
 * Regulatory requirement library for NexusAI Mission Control (Meridian /
 * Regulatory Submissions pivot).
 *
 * Drives the selection workflow: a user picks their regulator, then their
 * existing or aspirational license type, and gets the matching requirement
 * set with a coverage gap map against ingested evidence. Same typed-content-
 * pack convention as sector-library.ts and dd-checklist-library.ts.
 *
 * IMPORTANT — regulatory accuracy caveat: the SECP license taxonomy and
 * requirement items below reflect a reasonable first-pass understanding of
 * NBFC Rules 2003 / NBFC Regulations 2008 categories, NOT a validated legal
 * review. SBP/SAMA/CBUAE sections are deliberately thin placeholders. Every
 * item here needs sign-off from someone with current regulatory expertise
 * before this is used in front of a real customer or submission — treat this
 * as the scaffolding the workflow needs, not a compliance authority.
 *
 * Entry priority per paperwork/pivots/regulatory-submissions/
 * Strategy_Regulatory_Submissions.md (corrected 2026-07-05): NBFIs under
 * SECP first, then EMIs/fintechs under SBP, then SAMA/CBUAE.
 */

export type RegulatorKey = "secp" | "sbp" | "sama" | "cbuae";

export type LicenseStatus = "existing" | "aspirational";

export type RequirementSeverity = "critical" | "high" | "medium";

export type LicenseType = {
  key: string;
  label: string;
  regulator: RegulatorKey;
};

export type RegulatorDefinition = {
  key: RegulatorKey;
  label: string;
  jurisdiction: string;
  licenseTypes: LicenseType[];
};

export type RequirementItem = {
  id: string;
  requirement: string;
  /** Evidence department tags that would satisfy this item — same matching
   * mechanism as evidence ingestion (extract.ts / retrieval.ts) and the DD
   * checklist library's coverageForDeal(). */
  evidenceTags: string[];
  severity: RequirementSeverity;
  /** Which license status this requirement applies to. Many items (e.g.
   * minimum capital) apply to both — you must prove it to get licensed AND
   * keep proving it to stay licensed. */
  appliesTo: LicenseStatus[];
  gapIndicator: string;
};

// ---------------------------------------------------------------------------
// Step 1: regulator + license type selection
// ---------------------------------------------------------------------------

export const REGULATORS: RegulatorDefinition[] = [
  {
    key: "secp",
    label: "SECP (Securities and Exchange Commission of Pakistan)",
    jurisdiction: "Pakistan",
    licenseTypes: [
      { key: "secp_nbfc_investment_finance", label: "NBFC — Investment Finance Services", regulator: "secp" },
      { key: "secp_nbfc_leasing", label: "NBFC — Leasing", regulator: "secp" },
      { key: "secp_nbfc_microfinance", label: "NBFC — Microfinance", regulator: "secp" },
      { key: "secp_modaraba", label: "Modaraba", regulator: "secp" },
      { key: "secp_amc", label: "Asset Management Company (Mutual Funds)", regulator: "secp" },
    ],
  },
  {
    key: "sbp",
    label: "SBP (State Bank of Pakistan)",
    jurisdiction: "Pakistan",
    licenseTypes: [
      { key: "sbp_emi", label: "Electronic Money Institution (EMI)", regulator: "sbp" },
      { key: "sbp_pspo", label: "Payment System Operator / Payment Service Provider (PSO/PSP)", regulator: "sbp" },
    ],
  },
  {
    key: "sama",
    label: "SAMA (Saudi Central Bank)",
    jurisdiction: "Saudi Arabia",
    licenseTypes: [
      { key: "sama_payment_services", label: "Payment Services Provider", regulator: "sama" },
    ],
  },
  {
    key: "cbuae",
    label: "CBUAE (Central Bank of the UAE)",
    jurisdiction: "United Arab Emirates",
    licenseTypes: [
      { key: "cbuae_sva_ppi", label: "Stored Value Facilities / Prepaid Payment Instruments", regulator: "cbuae" },
    ],
  },
];

export function licenseTypesForRegulator(regulator: RegulatorKey): LicenseType[] {
  return REGULATORS.find((r) => r.key === regulator)?.licenseTypes ?? [];
}

// ---------------------------------------------------------------------------
// Step 2: requirement items, keyed by license type
// ---------------------------------------------------------------------------

const SECP_NBFC_INVESTMENT_FINANCE: RequirementItem[] = [
  {
    id: "secp-if-01",
    requirement: "Minimum equity requirement evidence (per NBFC Regulations 2008 category threshold)",
    evidenceTags: ["Capital Adequacy Evidence"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No current audited evidence of minimum equity being met",
  },
  {
    id: "secp-if-02",
    requirement: "Sponsors' and directors' fit-and-proper certification",
    evidenceTags: ["Fit and Proper Certification"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Fit-and-proper certification missing or expired for a current director/sponsor",
  },
  {
    id: "secp-if-03",
    requirement: "Business plan / feasibility study for the license category applied for",
    evidenceTags: ["Business Plan"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No feasibility study submitted, or projections not evidenced",
  },
  {
    id: "secp-if-04",
    requirement: "Draft or approved compliance manual, including AML/CFT policy",
    evidenceTags: ["Compliance Manual", "AML Policy"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No AML/CFT policy, or policy not updated for current AML/CFT regulations",
  },
  {
    id: "secp-if-05",
    requirement: "IT infrastructure and risk management framework documentation",
    evidenceTags: ["IT Risk Framework"],
    severity: "medium",
    appliesTo: ["aspirational"],
    gapIndicator: "No documented risk management framework covering IT/operational risk",
  },
  {
    id: "secp-if-06",
    requirement: "Statutory audit reports, last 3 years",
    evidenceTags: ["Financial Statements"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "Audit report missing for the most recent financial year",
  },
  {
    id: "secp-if-07",
    requirement: "Quarterly/annual regulatory returns filed with SECP",
    evidenceTags: ["Regulatory Returns"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "A required periodic return was filed late or not at all in the last cycle",
  },
  {
    id: "secp-if-08",
    requirement: "Related-party transaction disclosures",
    evidenceTags: ["Related Party Disclosures"],
    severity: "medium",
    appliesTo: ["existing"],
    gapIndicator: "Related-party transaction not disclosed in the relevant filing period",
  },
];

const SECP_NBFC_LEASING: RequirementItem[] = [
  {
    id: "secp-lease-01",
    requirement: "Minimum equity requirement evidence for leasing NBFC category",
    evidenceTags: ["Capital Adequacy Evidence"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No current audited evidence of minimum equity being met",
  },
  {
    id: "secp-lease-02",
    requirement: "Lease asset portfolio quality and provisioning policy",
    evidenceTags: ["Lease Portfolio Report"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "No documented provisioning policy for non-performing lease assets",
  },
  {
    id: "secp-lease-03",
    requirement: "Statutory audit reports, last 3 years",
    evidenceTags: ["Financial Statements"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "Audit report missing for the most recent financial year",
  },
  {
    id: "secp-lease-04",
    requirement: "Business plan / feasibility study",
    evidenceTags: ["Business Plan"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No feasibility study submitted",
  },
];

const SECP_NBFC_MICROFINANCE: RequirementItem[] = [
  {
    id: "secp-mf-01",
    requirement: "Minimum equity requirement evidence for microfinance NBFC category",
    evidenceTags: ["Capital Adequacy Evidence"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No current audited evidence of minimum equity being met",
  },
  {
    id: "secp-mf-02",
    requirement: "Portfolio-at-risk (PAR) reporting and client protection policy",
    evidenceTags: ["Portfolio at Risk Report", "Client Protection Policy"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "No client protection policy, or PAR not reported for the most recent quarter",
  },
  {
    id: "secp-mf-03",
    requirement: "AML/CFT policy tailored to cash-based/low-value transaction risk",
    evidenceTags: ["AML Policy"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "AML policy does not address the specific risk profile of microfinance transactions",
  },
  {
    id: "secp-mf-04",
    requirement: "Business plan / feasibility study",
    evidenceTags: ["Business Plan"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No feasibility study submitted",
  },
];

const SECP_MODARABA: RequirementItem[] = [
  {
    id: "secp-mod-01",
    requirement: "Modaraba management company fit-and-proper certification",
    evidenceTags: ["Fit and Proper Certification"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Fit-and-proper certification missing or expired for the management company's directors",
  },
  {
    id: "secp-mod-02",
    requirement: "Shariah compliance certification / Shariah advisor sign-off",
    evidenceTags: ["Shariah Compliance Certification"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No current Shariah advisor sign-off, or sign-off older than the required renewal period",
  },
  {
    id: "secp-mod-03",
    requirement: "Statutory audit reports, last 3 years",
    evidenceTags: ["Financial Statements"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "Audit report missing for the most recent financial year",
  },
];

const SECP_AMC: RequirementItem[] = [
  {
    id: "secp-amc-01",
    requirement: "Minimum equity requirement evidence for Asset Management Company",
    evidenceTags: ["Capital Adequacy Evidence"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No current audited evidence of minimum equity being met",
  },
  {
    id: "secp-amc-02",
    requirement: "Fund performance and NAV reporting for each managed fund",
    evidenceTags: ["Fund Performance Report"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "NAV or performance report missing for a managed fund in the current reporting period",
  },
  {
    id: "secp-amc-03",
    requirement: "Fit-and-proper certification for fund managers and directors",
    evidenceTags: ["Fit and Proper Certification"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Fit-and-proper certification missing or expired for a current fund manager or director",
  },
];

// Thin, deliberately generic placeholders — expand with real requirements
// before customer use. See regulatory-accuracy caveat at the top of this file.
const GENERIC_PLACEHOLDER: RequirementItem[] = [
  {
    id: "generic-01",
    requirement: "Current license / registration confirmation from the regulator",
    evidenceTags: ["Regulatory License"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "License status not confirmed as current and in good standing",
  },
  {
    id: "generic-02",
    requirement: "Minimum capital requirement evidence",
    evidenceTags: ["Capital Adequacy Evidence"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No current evidence of minimum capital being met",
  },
  {
    id: "generic-03",
    requirement: "AML/CFT policy and most recent independent audit",
    evidenceTags: ["AML Policy", "AML Audit"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "AML policy or audit missing, or audit older than the required cadence",
  },
  {
    id: "generic-04",
    requirement: "Business plan / license application dossier",
    evidenceTags: ["Business Plan"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No business plan or application dossier evidenced",
  },
];

const REQUIREMENTS_BY_LICENSE_TYPE: Record<string, RequirementItem[]> = {
  secp_nbfc_investment_finance: SECP_NBFC_INVESTMENT_FINANCE,
  secp_nbfc_leasing: SECP_NBFC_LEASING,
  secp_nbfc_microfinance: SECP_NBFC_MICROFINANCE,
  secp_modaraba: SECP_MODARABA,
  secp_amc: SECP_AMC,
};

/**
 * Requirements for a specific (regulator, license type, status) selection —
 * the output of the "choose your regulator, then your license" workflow.
 * Falls back to the generic placeholder set for any license type not yet
 * built out (currently: everything under SBP/SAMA/CBUAE).
 */
export function requirementsFor(
  licenseTypeKey: string,
  status: LicenseStatus
): RequirementItem[] {
  const items = REQUIREMENTS_BY_LICENSE_TYPE[licenseTypeKey] ?? GENERIC_PLACEHOLDER;
  return items.filter((item) => item.appliesTo.includes(status));
}

// ---------------------------------------------------------------------------
// Coverage scoring — same pattern as dd-checklist-library.ts coverageForDeal
// ---------------------------------------------------------------------------

export type RequirementCoverageResult = {
  itemId: string;
  requirement: string;
  severity: RequirementSeverity;
  covered: boolean;
};

export function coverageForSubmission(
  licenseTypeKey: string,
  status: LicenseStatus,
  ingestedDepartmentTags: string[]
): RequirementCoverageResult[] {
  const tagSet = new Set(ingestedDepartmentTags.map((t) => t.toLowerCase()));
  const items = requirementsFor(licenseTypeKey, status);
  return items.map((item) => ({
    itemId: item.id,
    requirement: item.requirement,
    severity: item.severity,
    covered: item.evidenceTags.some((tag) => tagSet.has(tag.toLowerCase())),
  }));
}

/** Convenience: just the gaps, most severe first — the "what your evidence doesn't yet prove" feature. */
export function gapsForSubmission(
  licenseTypeKey: string,
  status: LicenseStatus,
  ingestedDepartmentTags: string[]
): RequirementCoverageResult[] {
  const severityOrder: Record<RequirementSeverity, number> = { critical: 0, high: 1, medium: 2 };
  return coverageForSubmission(licenseTypeKey, status, ingestedDepartmentTags)
    .filter((r) => !r.covered)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
