/**
 * Filename -> evidence document type.
 *
 * WHY THIS EXISTS. The requirement libraries (regulatory-requirement-library,
 * dd-checklist-library) express what satisfies an obligation as document-type
 * tags: "AML Policy", "Capital Adequacy Evidence", "Cap Table". Ingestion,
 * meanwhile, classifies a file into a broad functional DEPARTMENT: "Risk &
 * Compliance", "Finance", "Technology" (see company-classification.ts).
 *
 * Those two vocabularies have zero overlap. Coverage was matching requirement
 * tags against department values, so it could never match anything and every
 * requirement reported as a gap regardless of what the workspace had ingested.
 * This module supplies the missing vocabulary.
 *
 * DELIBERATELY A PURE FUNCTION OVER THE FILENAME, not a stored column. It
 * therefore works on evidence ingested before it existed, with no migration
 * and no backfill. The honest limitation: a document whose filename does not
 * say what it is will not be typed, and will read as a gap. That failure
 * direction is the safe one — an unmatched document under-reports coverage,
 * where a fuzzy body-text match would over-report it, and over-reporting
 * coverage on a regulatory screen is the failure mode with real consequences.
 *
 * If this proves useful, the next step is classifying at ingest and storing
 * the result, so a reviewer can correct a wrong type. Not built yet.
 */

/** Ordered specific-first: an "AML Audit Report" is an audit, not just a policy. */
const PATTERNS: Array<{ type: string; match: RegExp }> = [
  // --- audits and assurance -------------------------------------------------
  { type: "AML Audit", match: /\baml\b.*\b(audit|review|assessment)|\b(audit|review)\b.*\baml\b|cft.*audit/i },
  { type: "IS Audit Report", match: /\b(is|it|information systems?|cyber|security)\b.*\baudit\b|systems? audit/i },
  { type: "Penetration Test Results", match: /\b(pen ?test|penetration test|vapt|vulnerability assessment)\b/i },
  { type: "BCP DR Test Report", match: /\b(bcp|dr|business continuity|disaster recovery)\b.*\b(test|drill|report|plan)\b|\bbcp\b|\bdrp\b/i },

  // --- policies and manuals -------------------------------------------------
  { type: "AML Policy", match: /\b(aml|cft|anti[- ]money|kyc|know your customer|sanctions)\b.*\b(policy|procedure|framework|manual|programme|program)\b|\baml\b(?!.*audit)/i },
  { type: "Compliance Manual", match: /\bcompliance\b.*\b(manual|policy|framework|handbook|procedure)\b/i },
  { type: "Client Protection Policy", match: /\b(consumer|customer|client)\b.*\b(protection|charter|fair treatment)\b|complaint.*(policy|procedure|handling)|grievance/i },
  { type: "Data Protection Compliance", match: /\b(data protection|privacy|pdpl|gdpr|dpia|data residency|localisation|localization)\b/i },
  { type: "IT Risk Framework", match: /\b(it|information security|infosec|cyber|technology|operational)\b.*\b(risk|security)\b.*\b(policy|framework|register|manual)\b|\bisms\b|information security polic/i },

  // --- capital and financials ----------------------------------------------
  { type: "Capital Adequacy Evidence", match: /\b(capital adequacy|paid[- ]?up capital|minimum capital|car|net worth|equity certificate|capital verification)\b/i },
  { type: "Financial Statements", match: /\b(audited|annual|statutory)\b.*\b(accounts|financials?|statements?|report)\b|\b(financial statements?|balance sheet|income statement|p&l|profit and loss)\b/i },
  { type: "Management Accounts", match: /\bmanagement accounts?\b|\bmonthly (accounts|financials?)\b|\bmis\b.*\b(pack|report)\b/i },
  { type: "Cash Flow Forecast", match: /\b(cash ?flow|liquidity)\b.*\b(forecast|projection|model|plan)\b/i },
  { type: "Revenue Analysis", match: /\brevenue\b.*\b(analysis|breakdown|bridge|cohort)\b|\barr\b|\bmrr\b/i },
  { type: "Unit Economics", match: /\bunit economics\b|\bcac\b|\bltv\b|contribution margin/i },

  // --- licensing and regulator interaction ---------------------------------
  { type: "Regulatory License", match: /\b(licen[cs]e|authorisation|authorization|certificate of (registration|authorisation)|noc|in[- ]principle approval|ipa)\b/i },
  { type: "Regulatory Correspondence", match: /\b(sbp|secp|sama|cbuae|regulator|central bank)\b.*\b(letter|correspondence|query|observation|response|circular|notice)\b|\bshow cause\b/i },
  { type: "Regulatory Returns", match: /\b(regulatory|statutory|periodic|quarterly|annual|monthly)\b.*\breturns?\b|\breturns?\b.*\b(sbp|secp|sama|cbuae)\b|\bfiling\b.*\breturn\b/i },
  { type: "Pilot Operations Report", match: /\bpilot\b.*\b(report|plan|exit|operations?|phase|results?)\b/i },

  // --- governance and people ------------------------------------------------
  { type: "Fit and Proper Certification", match: /\bfit[- ]and[- ]proper\b|\bfpt\b|\bdirector\b.*\b(declaration|questionnaire|clearance)\b|sponsor.*declaration/i },
  { type: "Related Party Disclosures", match: /\brelated[- ]party\b|\bconnected (party|lending)\b/i },
  { type: "Shariah Compliance Certification", match: /\b(shariah|shari'?ah|sharia)\b/i },

  // --- e-money and payments specific ---------------------------------------
  { type: "Customer Funds Safeguarding", match: /\b(safeguard|segregat|trust account|escrow|designated account|customer funds?|client money|float)\b/i },
  { type: "Reconciliation Reports", match: /\brecon(ciliation)?\b/i },
  { type: "Settlement Arrangements", match: /\b(settlement|clearing|nostro|scheme participation|participant agreement)\b/i },
  { type: "Customer Onboarding Controls", match: /\b(onboarding|cdd|customer due diligence|wallet (limits?|tier)|account opening)\b/i },
  { type: "Complaint Reports", match: /\bcomplaints?\b.*\b(report|log|register|mis|volumes?)\b/i },

  // --- operations, contracts, incidents ------------------------------------
  { type: "Material Contracts", match: /\b(contract|agreement|msa|sla|sow|outsourcing|vendor agreement)\b/i },
  { type: "Vendor Risk Assessment", match: /\b(vendor|third[- ]party|supplier|outsourc\w*)\b.*\b(risk|assessment|due diligence|register)\b/i },
  { type: "Security Incident History", match: /\b(incident|breach|fraud)\b.*\b(report|log|register|history|notification)\b|\bpostmortem\b/i },
  { type: "Architecture Overview", match: /\b(architecture|system design|technical overview|infrastructure diagram|data flow)\b/i },

  // --- plans and corporate --------------------------------------------------
  { type: "Business Plan", match: /\b(business plan|feasibility|five[- ]year plan|5[- ]year plan|projections?|application dossier)\b/i },
  { type: "Cap Table", match: /\bcap(itali[sz]ation)? table\b|\bshareholding\b|\bshare register\b/i },
  { type: "Litigation Register", match: /\b(litigation|dispute|court case|arbitration)\b.*\b(register|log|schedule|summary)\b|\blitigation\b/i },
  { type: "IP Ownership", match: /\b(intellectual property|\bip\b)\b.*\b(assignment|ownership|register|schedule)\b|trademark|patent/i },

  // --- portfolio reporting (SECP packs) ------------------------------------
  { type: "Portfolio at Risk Report", match: /\b(par|portfolio at risk|delinquen\w*|npl|arrears)\b/i },
  { type: "Lease Portfolio Report", match: /\blease\b.*\b(portfolio|schedule|report|book)\b/i },
  { type: "Fund Performance Report", match: /\bfund\b.*\b(performance|factsheet|nav|report)\b/i },
];

/**
 * Document types a filename indicates. May be empty (unrecognised) or hold
 * several — "AML Policy and Independent Audit 2026.pdf" is genuinely both.
 */
export function documentTypesForFilename(path: string | null | undefined): string[] {
  if (!path) return [];
  // Match on the basename: directory names like /compliance/ would otherwise
  // type every file beneath them.
  const name = path.split(/[/\\]/).pop() ?? "";
  if (!name) return [];
  return PATTERNS.filter((p) => p.match.test(name)).map((p) => p.type);
}

/** Distinct document types across a set of ingested file paths. */
export function documentTypesForPaths(paths: Array<string | null | undefined>): string[] {
  return [...new Set(paths.flatMap(documentTypesForFilename))];
}

/** Every type this classifier can produce — used to assert vocabulary alignment. */
export function knownDocumentTypes(): string[] {
  return [...new Set(PATTERNS.map((p) => p.type))].sort();
}
