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

/** "Board agenda", "agenda - AGM", but not "team offsite agenda". */
const GOVERNANCE_CONTEXT_AGENDA =
  /\b(board|committee|agm|egm|directors|shareholders?)\b[^/\\]*\bagenda\b|\bagenda\b[^/\\]*\b(board|committee|agm|egm|directors|shareholders?)\b/i;

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
  { type: "Change of Control Requirements", match: /\bchange of control\b|\bcoc\b.*\b(clause|consent|provision)\b|\bassignment clause\b/i },
  { type: "Retention Terms", match: /\b(retention|earn[- ]?out|lock[- ]?up|non[- ]?compete|key (person|man))\b/i },
  { type: "Org Chart", match: /\borg(ani[sz]ation)?[- ]?chart\b|\bheadcount\b|\breporting lines?\b/i },

  // --- board governance (Quorum) -------------------------------------------
  // Ordered before the generic "Minutes" rule so "Board Notice of Meeting"
  // types as a notice rather than only matching on the word "meeting".
  { type: "Board Notice", match: /\bnotice of (meeting|agm|egm)\b|\bboard notice\b|\bmeeting notice\b/i },
  { type: "Notice", match: /\bnotice of (meeting|agm|egm)\b|\bmeeting notice\b/i },
  // Agenda, attendance and resolution are ordinary office words. Requiring a
  // governance context word keeps "Team offsite agenda.docx" from satisfying
  // a board requirement, and an HR attendance sheet from satisfying QUORUM,
  // which is a critical item. The cost is that a bare "Agenda.docx" goes
  // untyped — understating, which is the direction we accept everywhere else.
  { type: "Agenda", match: GOVERNANCE_CONTEXT_AGENDA },
  { type: "Board Pack", match: /\bboard (pack|papers?|book)\b/i },
  // "Attendance register" is the normal board filename, so it must match; an
  // HR attendance sheet must not, because it would satisfy QUORUM, a critical
  // item. Excluding the staff-side words is more accurate than demanding a
  // governance word the real file often lacks.
  { type: "Attendance", match: /^(?!.*\b(staff|employee|team|payroll|class|student)\b).*(\battendance\b|\bregister of members\b)/i },
  { type: "Quorum", match: /\bquorum\b/i },
  { type: "Conflicts Register", match: /\bconflicts? (of interest )?(register|declaration|disclosure)\b/i },
  { type: "Conflicts", match: /\bconflicts? of interest\b/i },
  { type: "Minutes", match: /\bminutes\b/i },
  { type: "Board Resolution", match: /\b(board|circular|written) resolution\b|\bresolution no\b/i },
  { type: "Resolutions", match: /\b(board|committee|shareholder|special|ordinary) resolutions?\b|\bresolutions? (log|register|record)\b|\bresolution no\b/i },
  { type: "Decisions", match: /\bdecisions? (log|register|record|paper)\b/i },

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

// ---------------------------------------------------------------------------
// Content signal
// ---------------------------------------------------------------------------

/**
 * Real data rooms are full of "Project Falcon - Annex 4.pdf". Filename alone
 * leaves those permanently untyped, which understates coverage and, on a
 * client's own files, makes the screen look broken rather than careful.
 *
 * The content signal reads the document itself, but is deliberately stricter
 * than the filename rule, because prose mentions things it is not about: an
 * AML policy that references the capital requirement must not be typed as
 * capital adequacy evidence. A content match therefore counts only when it
 * looks like what the document IS rather than something it mentions:
 *
 *   - the match falls in the TITLE REGION, the opening stretch where a
 *     document states what it is; or
 *   - the pattern recurs at least MIN_RECURRENCE times, which a passing
 *     reference does not do.
 *
 * Still deterministic, still no LLM, in keeping with the native engines.
 */
const TITLE_REGION_CHARS = 300;
const MIN_RECURRENCE = 3;

/**
 * How much of a document is scanned for type signals.
 *
 * Roughly the first ten pages. Beyond that the cost is real and the signal is
 * not: a type mentioned only on page forty is describing something the
 * document refers to, not what the document IS. Capping makes the classifier
 * understate rather than overstate, which is the direction this whole feature
 * errs in.
 *
 * Measured before it was added. Fifty-kilobyte documents cost ~2.5ms each to
 * classify, so a two-thousand-document data room spent 4.8 seconds inside the
 * coverage API and 14 seconds building the review queue — on every request,
 * because none of this is cached.
 */
const SCAN_LIMIT_CHARS = 20_000;

export type DocumentTypeSignal = "filename" | "content";

export type DocumentTypeMatch = {
  type: string;
  /**
   * How the type was established. `filename` means the author named the file;
   * `content` means it was inferred from the text. Callers should surface the
   * difference rather than flatten it — an inferred type is weaker evidence
   * and a reviewer may want to overrule it.
   */
  signal: DocumentTypeSignal;
};

function contentTypes(text: string): string[] {
  const scan = text.length > SCAN_LIMIT_CHARS ? text.slice(0, SCAN_LIMIT_CHARS) : text;
  const head = scan.slice(0, TITLE_REGION_CHARS);
  return PATTERNS.filter((p) => {
    if (p.match.test(head)) return true;
    // `match` carries no /g, so build a counting copy rather than mutating
    // shared state via lastIndex.
    const global = new RegExp(p.match.source, p.match.flags.includes("g") ? p.match.flags : p.match.flags + "g");
    let count = 0;
    while (global.exec(scan) !== null) {
      count += 1;
      if (count >= MIN_RECURRENCE) return true;
    }
    return false;
  }).map((p) => p.type);
}

/**
 * Types for one document from both signals. Filename wins where both fire, so
 * a type is never reported as merely inferred when the author named it.
 */
export function classifyDocument(input: {
  path?: string | null;
  text?: string | null;
}): DocumentTypeMatch[] {
  const fromName = documentTypesForFilename(input.path);
  const named = new Set(fromName);
  const matches: DocumentTypeMatch[] = fromName.map((type) => ({ type, signal: "filename" }));

  if (input.text && input.text.trim()) {
    for (const type of contentTypes(input.text)) {
      if (!named.has(type)) {
        named.add(type);
        matches.push({ type, signal: "content" });
      }
    }
  }
  return matches;
}

/** Distinct types across a set of documents, from both signals. */
export function documentTypesForDocuments(
  docs: Array<{ path?: string | null; text?: string | null }>
): string[] {
  return [...new Set(docs.flatMap((d) => classifyDocument(d).map((m) => m.type)))];
}

/**
 * Types the text mentions but not strongly enough to apply.
 *
 * `contentTypes` deliberately requires a title-region hit or MIN_RECURRENCE
 * repeats, so a passing mention never types a document. Those rejected matches
 * are still the best clue a human has about an otherwise unidentifiable file,
 * and throwing them away leaves a review queue with nothing to order by.
 *
 * Offered as a SUGGESTION ONLY. Anything returned here has already failed the
 * bar for automatic application; surfacing it as a one-click confirmation is
 * different from acting on it.
 */
export function weakContentHints(
  text: string | null | undefined,
  /**
   * Types already applied, when the caller has them. Passing these avoids
   * recomputing contentTypes, which was doubling the cost of every review
   * queue row for no benefit.
   */
  alreadyStrong?: Iterable<string>
): string[] {
  if (!text || !text.trim()) return [];
  const scan = text.length > SCAN_LIMIT_CHARS ? text.slice(0, SCAN_LIMIT_CHARS) : text;
  const strong = new Set(alreadyStrong ?? contentTypes(text));
  return PATTERNS.filter((p) => !strong.has(p.type) && p.match.test(scan)).map((p) => p.type);
}

// ---------------------------------------------------------------------------
// Reviewer overrides
// ---------------------------------------------------------------------------

export type DocumentTypeOverride = {
  /** The reviewer's complete answer. Empty means "supports nothing". */
  types: string[];
  setBy: string;
  note?: string | null;
};

export type ResolvedDocumentTypes = {
  types: string[];
  /**
   * `reviewer` means a human decided. `filename` and `content` are inferences.
   * `none` means nothing identified it. Surfaced so a screen can distinguish a
   * confirmed answer from a guess rather than flattening them.
   */
  source: DocumentTypeSignal | "reviewer" | "none";
  /** True when a human has looked, whatever they concluded. */
  reviewed: boolean;
};

/**
 * Final document types for a record, reviewer first.
 *
 * PRECEDENCE IS TOTAL, NOT ADDITIVE. An override replaces the derived types
 * rather than merging with them, because the main thing a reviewer needs to do
 * is REMOVE a wrong type. A merge would make a mistaken inference permanent:
 * the reviewer could add the right answer but never delete the wrong one, and
 * the requirement it falsely satisfied would stay satisfied.
 *
 * An empty override is therefore meaningful and is honoured. "A human opened
 * this and it supports nothing" is a real finding, and it must not silently
 * fall back to the guess the human just rejected.
 */
export function resolveDocumentTypes(
  record: { sourcePath?: string | null; text?: string | null },
  override?: DocumentTypeOverride | null
): ResolvedDocumentTypes {
  if (override) {
    return { types: [...override.types], source: "reviewer", reviewed: true };
  }
  // Takes `sourcePath` because that is the field name on EvidenceRecord, and
  // maps it explicitly. Passing the record straight through silently dropped
  // the filename — classifyDocument reads `path`, so every document fell back
  // to content matching and named files stopped being recognised.
  const matches = classifyDocument({ path: record.sourcePath, text: record.text });
  if (matches.length === 0) return { types: [], source: "none", reviewed: false };
  // Filename beats content when both fired; classifyDocument already orders
  // filename matches first.
  const source = matches.some((m) => m.signal === "filename") ? "filename" : "content";
  return { types: matches.map((m) => m.type), source, reviewed: false };
}

/**
 * Does this record satisfy any of a content pack's evidence tags?
 *
 * USE THIS RATHER THAN WRITING THE COMPARISON BY HAND. Four separate native
 * engines independently wrote `tags.includes(record.department)`, and all four
 * were wrong the same way: department values are broad functions ("Finance",
 * "Executive / Strategy") while evidence tags are document types ("Cap Table",
 * "Conflicts Register"). The vocabularies share no values, so every one of
 * those engines silently reported zero coverage. Having one predicate is the
 * only reason a fifth engine will not repeat it.
 */
export function matchesEvidenceTags(
  record: { sourcePath?: string | null; text?: string | null },
  evidenceTags: string[]
): boolean {
  if (evidenceTags.length === 0) return false;
  const wanted = new Set(evidenceTags.map((t) => t.toLowerCase()));
  return classifyDocument({ path: record.sourcePath, text: record.text }).some((m) =>
    wanted.has(m.type.toLowerCase())
  );
}

/** Every type this classifier can produce — used to assert vocabulary alignment. */
export function knownDocumentTypes(): string[] {
  return [...new Set(PATTERNS.map((p) => p.type))].sort();
}
