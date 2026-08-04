/**
 * Regulatory requirement library for NexusAI Mission Control (Meridian /
 * Regulatory Submissions pivot).
 *
 * Drives the selection workflow: a user picks their regulator, then their
 * existing or aspirational license type, and gets the matching requirement
 * set with a coverage gap map against ingested evidence. Same typed-content-
 * pack convention as sector-library.ts and dd-checklist-library.ts.
 *
 * IMPORTANT — regulatory accuracy caveat: the SECP items reflect a reasonable
 * first-pass understanding of NBFC Rules 2003 / NBFC Regulations 2008
 * categories, and the SBP EMI and PSO/PSP items a first-pass understanding of
 * the corresponding SBP instruments. NONE of it is a validated legal review.
 * SAMA and CBUAE remain thin placeholders. Every item here needs sign-off from
 * someone with current regulatory expertise before it is used in front of a
 * real customer or submission — treat this as the scaffolding the workflow
 * needs, not a compliance authority.
 *
 * CONVENTION, applies to every pack: requirement strings name the obligation
 * and the instrument that carries it, never the figure. No capital amounts,
 * ratios, wallet limits, cadences in days, or filing deadlines are restated
 * here. Those change faster than this file will be maintained, and a stale
 * threshold asserted confidently is more damaging than no threshold at all.
 * `hasDedicatedRequirementPack()` reports which licences have a real pack;
 * the UI labels the rest as generic.
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

/**
 * SBP — Electronic Money Institution.
 *
 * Structured around the EMI Regulations' three-stage path: in-principle
 * approval, then a pilot with a limited customer set, then commercial launch.
 * That staging is the thing most applicants underestimate, so it is modelled
 * as explicit requirements rather than folded into "business plan".
 *
 * DELIBERATE: no monetary thresholds, ratios, limits, or deadlines appear in
 * any requirement string. They are the fastest part of a regulation to change
 * and a stale number stated confidently is worse than no number. Each item
 * points at the instrument that carries the current figure. Same convention as
 * the SECP items ("per NBFC Regulations 2008 category threshold").
 *
 * Needs sign-off from someone with current SBP practice before customer use —
 * see the regulatory-accuracy caveat at the top of this file.
 */
const SBP_EMI: RequirementItem[] = [
  {
    id: "sbp-emi-01",
    requirement: "Paid-up capital evidence against the EMI Regulations threshold for the stage applied for",
    evidenceTags: ["Capital Adequacy Evidence", "Financial Statements"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No audited evidence of paid-up capital at the threshold for the current stage",
  },
  {
    id: "sbp-emi-02",
    requirement: "Maintained capital held unimpaired and free of encumbrance, evidenced on an ongoing basis",
    evidenceTags: ["Capital Adequacy Evidence"],
    severity: "critical",
    appliesTo: ["existing"],
    // Distinct from sbp-emi-01: raising the capital once and keeping it
    // unimpaired are different obligations and fail in different ways.
    gapIndicator: "No current evidence that maintained capital remains unimpaired",
  },
  {
    id: "sbp-emi-03",
    requirement: "Sponsors', directors' and senior management fit-and-proper assessment records",
    evidenceTags: ["Fit and Proper Certification"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Fit-and-proper record missing or out of date for a current sponsor, director or key officer",
  },
  {
    id: "sbp-emi-04",
    requirement: "Customer funds safeguarding arrangement: e-money float held in a designated account with a scheduled bank, segregated from institutional funds",
    evidenceTags: ["Customer Funds Safeguarding"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    // The defining EMI obligation. An EMI is not a bank; the float is not
    // its money. Everything else can be remediated, this cannot.
    gapIndicator: "No evidence of a segregated designated account, or no agreement with the holding bank",
  },
  {
    id: "sbp-emi-05",
    requirement: "Float reconciliation: outstanding e-money liability reconciled to the safeguarding account balance at the required frequency",
    evidenceTags: ["Customer Funds Safeguarding", "Reconciliation Reports"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "No reconciliation records, or an unexplained variance left unresolved in the last cycle",
  },
  {
    id: "sbp-emi-06",
    requirement: "Business plan with financial projections, target segments, and the distribution and agent model",
    evidenceTags: ["Business Plan"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No business plan, or projections not supported by stated assumptions",
  },
  {
    id: "sbp-emi-07",
    requirement: "In-principle approval correspondence from SBP for the licence applied for",
    evidenceTags: ["Regulatory Correspondence", "Regulatory License"],
    severity: "critical",
    appliesTo: ["aspirational"],
    gapIndicator: "No in-principle approval on file, or conditions attached to it not tracked",
  },
  {
    id: "sbp-emi-08",
    requirement: "Pilot operations plan and pilot exit report against SBP's stated conditions",
    evidenceTags: ["Pilot Operations Report", "Regulatory Correspondence"],
    severity: "critical",
    appliesTo: ["aspirational"],
    // Commercial launch is gated on the pilot. Applicants routinely plan for
    // the licence and not for the stage that actually decides it.
    gapIndicator: "No pilot plan, or pilot completed without a documented report against the approval conditions",
  },
  {
    id: "sbp-emi-09",
    requirement: "Commercial launch approval from SBP",
    evidenceTags: ["Regulatory License", "Regulatory Correspondence"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "Operating beyond pilot scope without evidence of commercial launch approval",
  },
  {
    id: "sbp-emi-10",
    requirement: "AML/CFT policy, customer due diligence procedures, and transaction monitoring rules",
    evidenceTags: ["AML Policy", "Compliance Manual"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No AML/CFT policy, or policy not updated for the current AML/CFT regulations and guidance",
  },
  {
    id: "sbp-emi-11",
    requirement: "Independent AML/CFT audit at the required cadence",
    evidenceTags: ["AML Audit"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "No independent AML audit, or the most recent audit is older than the required cadence",
  },
  {
    id: "sbp-emi-12",
    requirement: "Customer and agent onboarding controls, including tiered wallet limits and the biometric or equivalent verification method used",
    evidenceTags: ["Compliance Manual", "Customer Onboarding Controls"],
    severity: "high",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Onboarding controls or wallet tiering not documented against the current regulatory limits",
  },
  {
    id: "sbp-emi-13",
    requirement: "Information security policy and the most recent independent information systems audit",
    evidenceTags: ["IT Risk Framework", "IS Audit Report"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No IS audit, or audit findings from the last review left unremediated",
  },
  {
    id: "sbp-emi-14",
    requirement: "Technology and payment systems readiness, including the interoperability and scheme connections relied on",
    evidenceTags: ["Architecture Overview", "IT Risk Framework"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No systems architecture or readiness evidence for the connections the business model depends on",
  },
  {
    id: "sbp-emi-15",
    requirement: "Data localisation and customer data protection arrangement, including where data is hosted and processed",
    evidenceTags: ["Data Protection Compliance"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    // Hosting location is a permissioning question in Pakistan, not just an
    // engineering one, and offshore stacks are where applicants get caught.
    gapIndicator: "Hosting and processing locations not documented, or offshore processing without evidenced approval",
  },
  {
    id: "sbp-emi-16",
    requirement: "Outsourcing and third-party arrangements register with the associated risk assessments",
    evidenceTags: ["Material Contracts", "Vendor Risk Assessment"],
    severity: "medium",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Material outsourced function with no contract or no risk assessment on file",
  },
  {
    id: "sbp-emi-17",
    requirement: "Consumer protection framework: disclosure of charges, complaint handling procedure, and turnaround commitments",
    evidenceTags: ["Client Protection Policy"],
    severity: "high",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No documented complaint procedure, or charges not disclosed in the required form",
  },
  {
    id: "sbp-emi-18",
    requirement: "Complaint volumes, resolution times, and unresolved case reporting for the current period",
    evidenceTags: ["Client Protection Policy", "Complaint Reports"],
    severity: "medium",
    appliesTo: ["existing"],
    gapIndicator: "No complaint reporting for the current period, or resolution times not evidenced",
  },
  {
    id: "sbp-emi-19",
    requirement: "Business continuity and disaster recovery plan with evidence of the most recent test",
    evidenceTags: ["IT Risk Framework", "BCP DR Test Report"],
    severity: "high",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No BCP/DR plan, or no evidence the plan has been tested within the required period",
  },
  {
    id: "sbp-emi-20",
    requirement: "Security incident and fraud reporting to SBP for the current period",
    evidenceTags: ["Security Incident History", "Regulatory Correspondence"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "A reportable incident with no evidence it was reported within the required window",
  },
  {
    id: "sbp-emi-21",
    requirement: "Periodic regulatory returns filed with SBP",
    evidenceTags: ["Regulatory Returns"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "A required periodic return filed late or not at all in the last cycle",
  },
  {
    id: "sbp-emi-22",
    requirement: "Annual audited financial statements",
    evidenceTags: ["Financial Statements"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "Audited statements missing for the most recent financial year",
  },
];

/**
 * SBP — Payment System Operator / Payment Service Provider.
 *
 * Shares the licensing shape of the EMI path but not the float. A PSO/PSP
 * that does not issue e-money holds no customer balances, so the safeguarding
 * items are deliberately absent rather than reworded — a requirement that does
 * not apply must not appear as a gap the applicant can never close.
 *
 * Same no-figures convention as SBP_EMI. Needs current-practice sign-off.
 */
const SBP_PSPO: RequirementItem[] = [
  {
    id: "sbp-pspo-01",
    requirement: "Paid-up capital evidence against the PSO/PSP threshold for the authorisation sought",
    evidenceTags: ["Capital Adequacy Evidence", "Financial Statements"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No audited evidence of paid-up capital at the applicable threshold",
  },
  {
    id: "sbp-pspo-02",
    requirement: "Sponsors', directors' and senior management fit-and-proper assessment records",
    evidenceTags: ["Fit and Proper Certification"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Fit-and-proper record missing or out of date for a current sponsor, director or key officer",
  },
  {
    id: "sbp-pspo-03",
    requirement: "Business plan describing the payment services offered, the settlement model, and participant relationships",
    evidenceTags: ["Business Plan"],
    severity: "high",
    appliesTo: ["aspirational"],
    gapIndicator: "No business plan, or the settlement model not described in enough detail to assess",
  },
  {
    id: "sbp-pspo-04",
    requirement: "In-principle approval correspondence from SBP and the conditions attached to it",
    evidenceTags: ["Regulatory Correspondence", "Regulatory License"],
    severity: "critical",
    appliesTo: ["aspirational"],
    gapIndicator: "No in-principle approval on file, or attached conditions not tracked to closure",
  },
  {
    id: "sbp-pspo-05",
    requirement: "Certificate of authorisation from SBP, current and covering the services actually offered",
    evidenceTags: ["Regulatory License"],
    severity: "critical",
    appliesTo: ["existing"],
    // Scope creep past the authorised service list is a common finding.
    gapIndicator: "Authorisation missing, expired, or narrower than the services being offered",
  },
  {
    id: "sbp-pspo-06",
    requirement: "Settlement and clearing arrangements, including the settlement bank and participant agreements",
    evidenceTags: ["Material Contracts", "Settlement Arrangements"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No settlement bank agreement, or participant arrangements not documented",
  },
  {
    id: "sbp-pspo-07",
    requirement: "Merchant and participant onboarding and due diligence procedure",
    evidenceTags: ["Compliance Manual", "Customer Onboarding Controls"],
    severity: "high",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No documented onboarding due diligence for merchants or participants",
  },
  {
    id: "sbp-pspo-08",
    requirement: "AML/CFT policy and transaction monitoring appropriate to the payment flows operated",
    evidenceTags: ["AML Policy", "Compliance Manual"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No AML/CFT policy, or monitoring rules not mapped to the flows actually operated",
  },
  {
    id: "sbp-pspo-09",
    requirement: "Independent AML/CFT audit at the required cadence",
    evidenceTags: ["AML Audit"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "No independent AML audit, or the most recent audit is older than the required cadence",
  },
  {
    id: "sbp-pspo-10",
    requirement: "Information security policy, PCI DSS or equivalent card-data standard where applicable, and the most recent systems audit",
    evidenceTags: ["IT Risk Framework", "IS Audit Report"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No IS audit, or no current certification where card data is handled",
  },
  {
    id: "sbp-pspo-11",
    requirement: "Data localisation and customer data protection arrangement, including hosting and processing locations",
    evidenceTags: ["Data Protection Compliance"],
    severity: "critical",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Hosting and processing locations not documented, or offshore processing without evidenced approval",
  },
  {
    id: "sbp-pspo-12",
    requirement: "Outsourcing and third-party technology arrangements register with risk assessments",
    evidenceTags: ["Material Contracts", "Vendor Risk Assessment"],
    severity: "medium",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "Material outsourced function with no contract or no risk assessment on file",
  },
  {
    id: "sbp-pspo-13",
    requirement: "Business continuity, disaster recovery, and service availability commitments with evidence of the most recent test",
    evidenceTags: ["IT Risk Framework", "BCP DR Test Report"],
    severity: "high",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No BCP/DR plan, or no evidence the plan has been tested within the required period",
  },
  {
    id: "sbp-pspo-14",
    requirement: "Security incident, fraud, and service outage reporting to SBP for the current period",
    evidenceTags: ["Security Incident History", "Regulatory Correspondence"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "A reportable incident or outage with no evidence it was reported within the required window",
  },
  {
    id: "sbp-pspo-15",
    requirement: "Consumer protection: charge disclosure, dispute and chargeback handling, and complaint turnaround",
    evidenceTags: ["Client Protection Policy"],
    severity: "high",
    appliesTo: ["existing", "aspirational"],
    gapIndicator: "No documented dispute or complaint procedure, or charges not disclosed in the required form",
  },
  {
    id: "sbp-pspo-16",
    requirement: "Periodic regulatory returns and transaction reporting filed with SBP",
    evidenceTags: ["Regulatory Returns"],
    severity: "high",
    appliesTo: ["existing"],
    gapIndicator: "A required periodic return or transaction report filed late or not at all in the last cycle",
  },
  {
    id: "sbp-pspo-17",
    requirement: "Annual audited financial statements",
    evidenceTags: ["Financial Statements"],
    severity: "critical",
    appliesTo: ["existing"],
    gapIndicator: "Audited statements missing for the most recent financial year",
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
  sbp_emi: SBP_EMI,
  sbp_pspo: SBP_PSPO,
};

/**
 * Requirements for a specific (regulator, license type, status) selection —
 * the output of the "choose your regulator, then your license" workflow.
 * Falls back to the generic placeholder set for any license type not yet
 * built out (currently: everything under SBP/SAMA/CBUAE).
 */
/**
 * Whether a licence type has a purpose-built requirement pack, or falls back
 * to the generic set.
 *
 * This is exported so the UI can SAY SO. Showing an SBP EMI applicant four
 * generic items under the heading "requirement library" would be the exact
 * overclaim this product exists to prevent. Callers must label a generic pack
 * as generic.
 */
export function hasDedicatedRequirementPack(licenseTypeKey: string): boolean {
  return licenseTypeKey in REQUIREMENTS_BY_LICENSE_TYPE;
}

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
  /** Document types present in the workspace — NOT department values. */
  ingestedDocumentTypes: string[]
): RequirementCoverageResult[] {
  const tagSet = new Set(ingestedDocumentTypes.map((t) => t.toLowerCase()));
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
  /** Document types present in the workspace — NOT department values. */
  ingestedDocumentTypes: string[]
): RequirementCoverageResult[] {
  const severityOrder: Record<RequirementSeverity, number> = { critical: 0, high: 1, medium: 2 };
  return coverageForSubmission(licenseTypeKey, status, ingestedDocumentTypes)
    .filter((r) => !r.covered)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
