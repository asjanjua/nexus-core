export type QuorumWorkflowArc = "setup" | "meeting" | "record";

export type QuorumWorkflowScreen = {
  id: string;
  arc: QuorumWorkflowArc;
  title: string;
  purpose: string;
  primaryUser: string;
  routeCandidate: string;
};

export type QuorumGovernanceSource = {
  id: string;
  title: string;
  jurisdiction: "Pakistan";
  url: string;
  productUse: string;
};

export type QuorumWorkflowStage = {
  id: string;
  arc: QuorumWorkflowArc;
  title: string;
  purpose: string;
  userOutcome: string;
  requiredObjects: string[];
  screenIds: string[];
};

export type QuorumGovernanceBoundary = {
  id: string;
  title: string;
  rule: string;
};

export type QuorumJurisdictionPackRequirement = {
  id: string;
  title: string;
  whyItMatters: string;
};

export type QuorumWorkflowIntegrityIssue = {
  stageId: string;
  missingScreenIds: string[];
};

export type QuorumScreenGuidance = {
  screenId: string;
  userInputs: string[];
  actionPoints: string[];
};

export const quorumGovernanceSources: QuorumGovernanceSource[] = [
  {
    id: "pk-companies-act-2017",
    title: "SECP Companies Act, 2017",
    jurisdiction: "Pakistan",
    url: "https://www.secp.gov.pk/companies-act-2017/",
    productUse:
      "Director minimums, terms, board proceedings, quorum, records, circular resolutions, board powers, and interest disclosures.",
  },
  {
    id: "pk-board-meeting-guide",
    title: "SECP Best Practices Guide: Conducting Board Meetings and General Meetings",
    jurisdiction: "Pakistan",
    url: "https://www.secp.gov.pk/document/best-practices-guide-conducting-board-meetings-general-meetings/",
    productUse: "Practical meeting lifecycle guidance for notice, agenda, conduct, minutes, and records.",
  },
  {
    id: "pk-listed-ccg-2019",
    title: "SECP Listed Companies Code of Corporate Governance Regulations, 2019",
    jurisdiction: "Pakistan",
    url: "https://www.secp.gov.pk/document/listed-companies-code-of-corporate-governance-regulations-2019/",
    productUse: "Listed-company board composition, governance responsibilities, committees, and terms of reference.",
  },
  {
    id: "pk-secp-regulations-catalog",
    title: "SECP Regulations Catalog",
    jurisdiction: "Pakistan",
    url: "https://www.secp.gov.pk/laws/regulations/",
    productUse: "Current tracker for CCG, Companies Regulations, NBFC Regulations, postal ballot rules, and sector overlays.",
  },
];

export const quorumGovernanceBoundaries: QuorumGovernanceBoundary[] = [
  {
    id: "no-legal-authority",
    title: "No legal authority",
    rule:
      "Quorum can organize board process, evidence, minutes, and governance records, but it is not a lawyer, regulator, company secretary of record, or statutory filing authority.",
  },
  {
    id: "human-approval-control",
    title: "Human approval control",
    rule:
      "Quorum may prepare notices, packs, minutes, action registers, and export packets; it must not approve, sign, file, send, or make a board record final automatically.",
  },
  {
    id: "jurisdiction-review-required",
    title: "Jurisdiction review required",
    rule:
      "Country, entity, regulator, and company-article rules must be source-backed and reviewed by qualified local counsel or a company secretary before statutory use.",
  },
];

export const quorumJurisdictionPackRequirements: QuorumJurisdictionPackRequirement[] = [
  {
    id: "official-sources",
    title: "Official source links",
    whyItMatters:
      "Every country pack needs official legal, regulator, or exchange-source links so users can inspect the authority behind a rule.",
  },
  {
    id: "effective-review-dates",
    title: "Effective and review dates",
    whyItMatters:
      "Board rules change. Packs must show effective date, last reviewed date, next review date, and whether a rule is stale.",
  },
  {
    id: "entity-overlays",
    title: "Entity and regulator overlays",
    whyItMatters:
      "Private companies, listed companies, financial institutions, nonprofits, and regulated entities can have different board composition, meeting, quorum, committee, and filing rules.",
  },
  {
    id: "company-document-overrides",
    title: "Company document overrides",
    whyItMatters:
      "Articles, charters, shareholder agreements, TORs, and delegation matrices can fill gaps or add stricter internal requirements.",
  },
  {
    id: "qualified-reviewer",
    title: "Qualified reviewer",
    whyItMatters:
      "Global deployment needs a named reviewer role or firm for each pack before the product presents a rule as usable for statutory compliance.",
  },
];

export const quorumGovernanceScreens: QuorumWorkflowScreen[] = [
  {
    id: "setup-wizard",
    arc: "setup",
    title: "Quorum Setup Wizard",
    purpose: "Select country, entity type, regulator overlay, source pack, board secretary, and financial year.",
    primaryUser: "Company secretary",
    routeCandidate: "/board/setup",
  },
  {
    id: "board-register",
    arc: "setup",
    title: "Board Register",
    purpose: "Track directors, chair, CEO, nominee/independent status, gender/fit-and-proper flags, and term expiry.",
    primaryUser: "Company secretary",
    routeCandidate: "/board/register",
  },
  {
    id: "committee-register",
    arc: "setup",
    title: "Committee Register",
    purpose: "Track audit, HR/remuneration, risk, nomination, sustainability, shariah, and custom committees.",
    primaryUser: "Board secretary",
    routeCandidate: "/board/committees",
  },
  {
    id: "tor-policy-library",
    arc: "setup",
    title: "TOR And Policy Library",
    purpose: "Maintain board charter, committee TORs, delegation matrix, conflicts, signing authority, and retention rules.",
    primaryUser: "Governance lead",
    routeCandidate: "/board/policies",
  },
  {
    id: "meeting-calendar",
    arc: "setup",
    title: "Meeting Calendar",
    purpose: "Show annual board and committee cadence, statutory deadlines, and next meeting readiness.",
    primaryUser: "Board secretary",
    routeCandidate: "/board/calendar",
  },
  {
    id: "agenda-builder",
    arc: "meeting",
    title: "Agenda Builder",
    purpose: "Build agenda items with owner, authority route, outcome type, evidence, conflicts, and draft resolution wording.",
    primaryUser: "Company secretary",
    routeCandidate: "/board/agenda",
  },
  {
    id: "board-pack-builder",
    arc: "meeting",
    title: "Board Pack Builder",
    purpose: "Assemble papers, evidence coverage, missing materials, source confidence, and deltas since last meeting.",
    primaryUser: "Management sponsor",
    routeCandidate: "/board/pack",
  },
  {
    id: "director-preread",
    arc: "meeting",
    title: "Director Pre-Read",
    purpose: "Support pack reading, Director Q&A, unresolved clarifications, and conflict declarations.",
    primaryUser: "Director",
    routeCandidate: "/board/pre-read",
  },
  {
    id: "attendance-quorum",
    arc: "meeting",
    title: "Attendance And Quorum",
    purpose: "Check attendees, apologies, video mode, board/committee quorum, and item-level recusal impact.",
    primaryUser: "Chair",
    routeCandidate: "/board/quorum",
  },
  {
    id: "conflict-declaration",
    arc: "meeting",
    title: "Conflict Declaration",
    purpose: "Capture annual and item-level conflicts, recusal status, and minutes wording.",
    primaryUser: "Director",
    routeCandidate: "/board/conflicts",
  },
  {
    id: "committee-recommendation",
    arc: "meeting",
    title: "Committee Recommendation",
    purpose: "Connect committee paper, recommendation to board, minutes link, and escalation trail.",
    primaryUser: "Committee chair",
    routeCandidate: "/board/committee-recommendations",
  },
  {
    id: "decision-vote-capture",
    arc: "meeting",
    title: "Decision And Vote Capture",
    purpose: "Capture discussion, motion/resolution, vote or consensus, conditions, deferrals, and next actions.",
    primaryUser: "Chair",
    routeCandidate: "/board/decisions",
  },
  {
    id: "circular-resolution",
    arc: "meeting",
    title: "Circular Resolution",
    purpose: "Circulate resolution, attach papers, track approvals, and note the resolution at the later meeting.",
    primaryUser: "Company secretary",
    routeCandidate: "/board/circular-resolutions",
  },
  {
    id: "minutes-drafting",
    arc: "record",
    title: "Minutes Drafting",
    purpose: "Draft minutes from agenda, attendance, conflicts, discussion notes, decisions, and actions.",
    primaryUser: "Company secretary",
    routeCandidate: "/board/minutes/draft",
  },
  {
    id: "minutes-signoff",
    arc: "record",
    title: "Minutes Review And Sign-Off",
    purpose: "Track comments, corrections, chair authentication, final record status, and export readiness.",
    primaryUser: "Chair",
    routeCandidate: "/board/minutes/review",
  },
  {
    id: "action-register",
    arc: "record",
    title: "Action Register",
    purpose: "Manage owners, due dates, blockers, committee follow-up, and carry-forward items.",
    primaryUser: "Board secretary",
    routeCandidate: "/board/actions",
  },
  {
    id: "audit-pack",
    arc: "record",
    title: "Governance Audit Pack",
    purpose: "Export board pack, minutes, resolution log, signature packet, source index, and retention status.",
    primaryUser: "Company secretary",
    routeCandidate: "/board/audit-pack",
  },
];

export const quorumScreenGuidance: QuorumScreenGuidance[] = [
  {
    screenId: "setup-wizard",
    userInputs: ["Country/entity type", "Regulator overlay", "Articles and board policy pack"],
    actionPoints: ["Choose source pack", "Assign governance reviewer"],
  },
  {
    screenId: "board-register",
    userInputs: ["Director list", "Appointment and term dates", "Independence and nominee status"],
    actionPoints: ["Resolve composition gaps", "Confirm expired or missing director records"],
  },
  {
    screenId: "committee-register",
    userInputs: ["Committee names", "Membership and chair roles", "Committee mandate"],
    actionPoints: ["Create missing required committees", "Link committee TORs"],
  },
  {
    screenId: "tor-policy-library",
    userInputs: ["Board charter", "Committee TORs", "Delegation and conflicts policies"],
    actionPoints: ["Map approval authority", "Flag missing or stale policies"],
  },
  {
    screenId: "meeting-calendar",
    userInputs: ["Annual cadence", "Committee reporting dates", "Statutory deadlines"],
    actionPoints: ["Schedule missing meetings", "Add deadline owners"],
  },
  {
    screenId: "agenda-builder",
    userInputs: ["Agenda item owner", "Outcome type", "Evidence and draft resolution wording"],
    actionPoints: ["Check authority route", "Resolve conflicts before agenda lock"],
  },
  {
    screenId: "board-pack-builder",
    userInputs: ["Management papers", "Evidence set", "Late-paper and restricted-material flags"],
    actionPoints: ["Request missing papers", "Publish pack for director pre-read"],
  },
  {
    screenId: "director-preread",
    userInputs: ["Director questions", "Read acknowledgements", "Conflict declarations"],
    actionPoints: ["Route unresolved questions", "Mark items needing live discussion"],
  },
  {
    screenId: "attendance-quorum",
    userInputs: ["Attendees and apologies", "Video attendance", "Item-level recusals"],
    actionPoints: ["Confirm quorum before each decision", "Record recusal impact"],
  },
  {
    screenId: "conflict-declaration",
    userInputs: ["Annual interest declarations", "Item-level conflicts", "Recusal notes"],
    actionPoints: ["Capture minutes wording", "Block conflicted participation where required"],
  },
  {
    screenId: "committee-recommendation",
    userInputs: ["Committee paper", "Recommendation text", "Committee minutes link"],
    actionPoints: ["Escalate recommendation to board", "Attach evidence trail"],
  },
  {
    screenId: "decision-vote-capture",
    userInputs: ["Motion text", "Vote or consensus result", "Conditions and deferrals"],
    actionPoints: ["Assign resulting actions", "Mark decision as draft until minutes approval"],
  },
  {
    screenId: "circular-resolution",
    userInputs: ["Resolution text", "Attached papers", "Director approvals"],
    actionPoints: ["Track outstanding approvals", "Queue noting at next meeting"],
  },
  {
    screenId: "minutes-drafting",
    userInputs: ["Attendance", "Discussion notes", "Decisions, conflicts, and actions"],
    actionPoints: ["Generate draft minutes", "Send to reviewer queue"],
  },
  {
    screenId: "minutes-signoff",
    userInputs: ["Reviewer comments", "Corrections", "Chair authentication"],
    actionPoints: ["Resolve comments", "Prepare final record for human sign-off"],
  },
  {
    screenId: "action-register",
    userInputs: ["Action owner", "Due date", "Board item and evidence link"],
    actionPoints: ["Escalate blocked actions", "Carry forward open items"],
  },
  {
    screenId: "audit-pack",
    userInputs: ["Final pack scope", "Signature packet", "Retention and export requirements"],
    actionPoints: ["Export governance file", "Confirm no automatic filing or signing"],
  },
];


export const quorumWorkflowStages: QuorumWorkflowStage[] = [
  {
    id: "configure-board",
    arc: "setup",
    title: "Configure the board",
    purpose: "Set the jurisdiction, entity type, source pack, regulator overlay, articles, board size, and committee model.",
    userOutcome: "The company knows which governance rules and internal policies apply before any meeting is planned.",
    requiredObjects: ["Company profile", "Jurisdiction pack", "Articles", "Board policy pack"],
    screenIds: ["setup-wizard"],
  },
  {
    id: "register-directors-committees",
    arc: "setup",
    title: "Register directors and committees",
    purpose: "Build the board and committee registers before agenda work begins.",
    userOutcome: "Composition gaps, term expiries, and committee coverage are visible early.",
    requiredObjects: ["Board register", "Committee register", "Director profile", "Committee membership"],
    screenIds: ["board-register", "committee-register"],
  },
  {
    id: "load-tors-policies",
    arc: "setup",
    title: "Load TORs and policies",
    purpose: "Turn TORs, delegation rules, conflicts policy, and signing authority into structured checks.",
    userOutcome: "Each agenda item can be checked against the right mandate and approval path.",
    requiredObjects: ["Terms of reference", "Policy library", "Delegation matrix"],
    screenIds: ["tor-policy-library"],
  },
  {
    id: "plan-calendar",
    arc: "setup",
    title: "Plan the meeting calendar",
    purpose: "Map annual board and committee cadence against statutory and reporting deadlines.",
    userOutcome: "The board can see whether meetings are planned before compliance pressure appears.",
    requiredObjects: ["Meeting", "Deadline", "Committee cadence"],
    screenIds: ["meeting-calendar"],
  },
  {
    id: "create-agenda-pack",
    arc: "meeting",
    title: "Create agenda and board pack",
    purpose: "Build agenda items, attach evidence, classify outcomes, and assemble the board pack.",
    userOutcome: "Directors receive a pack where each item has owner, evidence, authority route, and expected outcome.",
    requiredObjects: ["Agenda item", "Board pack", "Evidence", "Resolution draft"],
    screenIds: ["agenda-builder", "board-pack-builder"],
  },
  {
    id: "director-preread",
    arc: "meeting",
    title: "Run director pre-read",
    purpose: "Let directors review the pack, ask questions, request clarification, and declare conflicts.",
    userOutcome: "The chair enters the meeting knowing what is unresolved and where directors may need to recuse.",
    requiredObjects: ["Director Q&A", "Conflict declaration", "Read acknowledgement"],
    screenIds: ["director-preread", "conflict-declaration"],
  },
  {
    id: "check-quorum-conflicts",
    arc: "meeting",
    title: "Check attendance, quorum, and conflicts",
    purpose: "Capture attendees, apologies, quorum, conflicted items, and recusal impact.",
    userOutcome: "The board can see whether each item can validly proceed before discussion starts.",
    requiredObjects: ["Attendance", "Quorum rule", "Recusal", "Conflict declaration"],
    screenIds: ["attendance-quorum", "conflict-declaration"],
  },
  {
    id: "capture-decisions",
    arc: "meeting",
    title: "Capture decisions and resolutions",
    purpose: "Record discussion, motions, votes, conditions, deferrals, committee recommendations, and circular resolutions.",
    userOutcome: "Every board outcome has an evidence trail, resolution text, and next step.",
    requiredObjects: ["Decision", "Resolution", "Vote", "Committee recommendation", "Action"],
    screenIds: ["committee-recommendation", "decision-vote-capture", "circular-resolution"],
  },
  {
    id: "draft-review-minutes",
    arc: "record",
    title: "Draft and review minutes",
    purpose: "Generate a draft minutes record, manage corrections, and prepare chair authentication.",
    userOutcome: "Minutes move from draft to review to final without losing conflict, quorum, and decision context.",
    requiredObjects: ["Minutes", "Comment", "Authentication", "Signature packet"],
    screenIds: ["minutes-drafting", "minutes-signoff"],
  },
  {
    id: "close-actions-export",
    arc: "record",
    title: "Close actions and export the governance file",
    purpose: "Carry decisions into actions and prepare the board pack, minutes, resolution, signature, and evidence export.",
    userOutcome: "Follow-up is assigned and the board record is ready for audit or counsel review.",
    requiredObjects: ["Action register", "Audit trail", "Export pack", "Retention status"],
    screenIds: ["action-register", "audit-pack"],
  },
];

export function screensForArc(arc: QuorumWorkflowArc): QuorumWorkflowScreen[] {
  return quorumGovernanceScreens.filter((screen) => screen.arc === arc);
}

export function screensForStage(stage: QuorumWorkflowStage): QuorumWorkflowScreen[] {
  const screenMap = new Map(quorumGovernanceScreens.map((screen) => [screen.id, screen]));
  return stage.screenIds.map((screenId) => {
    const screen = screenMap.get(screenId);
    if (!screen) {
      throw new Error(`Missing Quorum governance screen: ${screenId}`);
    }
    return screen;
  });
}

export function guidanceForQuorumScreen(screenId: string): QuorumScreenGuidance {
  const guidance = quorumScreenGuidance.find((item) => item.screenId === screenId);
  if (!guidance) {
    throw new Error(`Missing Quorum screen guidance: ${screenId}`);
  }
  return guidance;
}

export function safeScreensForStage(stage: QuorumWorkflowStage): QuorumWorkflowScreen[] {
  const screenMap = new Map(quorumGovernanceScreens.map((screen) => [screen.id, screen]));
  const screens = stage.screenIds.flatMap((screenId) => {
    const screen = screenMap.get(screenId);
    return screen ? [screen] : [];
  });
  const missingScreenIds = stage.screenIds.filter((screenId) => !screenMap.has(screenId));
  if (missingScreenIds.length > 0) {
    console.error(`Missing Quorum governance screens for stage ${stage.id}: ${missingScreenIds.join(", ")}`);
  }
  return screens;
}

export function validateQuorumWorkflowIntegrity(): QuorumWorkflowIntegrityIssue[] {
  const screenIds = new Set(quorumGovernanceScreens.map((screen) => screen.id));
  return quorumWorkflowStages.flatMap((stage) => {
    const missingScreenIds = stage.screenIds.filter((screenId) => !screenIds.has(screenId));
    return missingScreenIds.length > 0 ? [{ stageId: stage.id, missingScreenIds }] : [];
  });
}

export const quorumWorkflowArcLabels: Record<QuorumWorkflowArc, string> = {
  setup: "Setup and compliance readiness",
  meeting: "Meeting run",
  record: "Record and follow-through",
};
