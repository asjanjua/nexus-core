export type MeridianRegulatoryArc = "scope" | "evidence" | "gap" | "filing";

export type MeridianRegulatoryScreen = {
  id: string;
  arc: MeridianRegulatoryArc;
  title: string;
  purpose: string;
  primaryUser: string;
  routeCandidate: string;
  regulatoryObjects: string[];
};

export type MeridianRegulatoryStage = {
  id: string;
  arc: MeridianRegulatoryArc;
  title: string;
  purpose: string;
  userOutcome: string;
  requiredObjects: string[];
  screenIds: string[];
};

export type MeridianRegulatoryBoundary = {
  id: string;
  title: string;
  rule: string;
};

export type MeridianJurisdictionPackRequirement = {
  id: string;
  title: string;
  whyItMatters: string;
};

export type MeridianWorkflowIntegrityIssue = {
  stageId: string;
  missingScreenIds: string[];
};

export type MeridianScreenGuidance = {
  screenId: string;
  userInputs: string[];
  actionPoints: string[];
};

export const meridianRegulatoryArcLabels: Record<MeridianRegulatoryArc, string> = {
  scope: "Jurisdiction, regulator, and license scope",
  evidence: "Requirement evidence and source coverage",
  gap: "Regulatory gap triage and owner follow-up",
  filing: "Submission pack, caveats, and reviewer sign-off",
};

export const meridianRegulatoryScreens: MeridianRegulatoryScreen[] = [
  {
    id: "regulatory-scope",
    arc: "scope",
    title: "Regulatory Scope",
    purpose:
      "Select jurisdiction, regulator, license type, license status, filing objective, deadline, and responsible reviewer.",
    primaryUser: "Compliance lead",
    routeCandidate: "/meridian/scope",
    regulatoryObjects: ["Jurisdiction", "Regulator", "License type", "License status", "Filing objective"],
  },
  {
    id: "license-profile",
    arc: "scope",
    title: "License Profile",
    purpose:
      "Capture applicant or license-holder details, ownership posture, directors/sponsors, regulated activities, and current license state.",
    primaryUser: "Founder or CFO",
    routeCandidate: "/meridian/license-profile",
    regulatoryObjects: ["Applicant profile", "Ownership", "Director/sponsor record", "Regulated activity"],
  },
  {
    id: "requirement-library",
    arc: "evidence",
    title: "Requirement Library",
    purpose:
      "Show the domain-reviewed requirement set for the selected regulator/license/status with severity and evidence tags.",
    primaryUser: "Regulatory analyst",
    routeCandidate: "/meridian/requirements",
    regulatoryObjects: ["Requirement", "Severity", "Evidence tag", "Applicability rule"],
  },
  {
    id: "evidence-coverage",
    arc: "evidence",
    title: "Evidence Coverage",
    purpose:
      "Map uploaded or connected documents to each requirement and separate matched, missing, stale, and low-confidence evidence.",
    primaryUser: "Compliance analyst",
    routeCandidate: "/meridian/evidence-coverage",
    regulatoryObjects: ["Evidence item", "Source link", "Coverage result", "Confidence flag"],
  },
  {
    id: "gap-triage",
    arc: "gap",
    title: "Gap Triage",
    purpose:
      "Prioritize critical and high gaps, assign owners, request missing documents, and record specialist review comments.",
    primaryUser: "Regulatory advisor",
    routeCandidate: "/meridian/gaps",
    regulatoryObjects: ["Gap", "Owner", "Review note", "Document request"],
  },
  {
    id: "caveat-register",
    arc: "gap",
    title: "Caveat Register",
    purpose:
      "Track legal, regulatory, evidence-quality, and management-confirmation caveats before the submission pack is trusted.",
    primaryUser: "External reviewer",
    routeCandidate: "/meridian/caveats",
    regulatoryObjects: ["Caveat", "Reviewer", "Resolution", "Approval block"],
  },
  {
    id: "submission-memo",
    arc: "filing",
    title: "Submission Memo",
    purpose:
      "Draft the requirement summary, evidence narrative, unresolved caveats, management attestations, and reviewer sign-off.",
    primaryUser: "Compliance lead",
    routeCandidate: "/meridian/submission-memo",
    regulatoryObjects: ["Memo section", "Evidence citation", "Attestation", "Reviewer sign-off"],
  },
  {
    id: "filing-pack",
    arc: "filing",
    title: "Filing Pack",
    purpose:
      "Assemble an export-ready pack with the memo, evidence index, requirement matrix, caveats, and approval state.",
    primaryUser: "Founder or compliance lead",
    routeCandidate: "/meridian/filing-pack",
    regulatoryObjects: ["Export pack", "Requirement matrix", "Evidence index", "Approval state"],
  },
];

export const meridianScreenGuidance: MeridianScreenGuidance[] = [
  {
    screenId: "regulatory-scope",
    userInputs: ["Jurisdiction and regulator", "License type and status", "Filing objective and deadline"],
    actionPoints: ["Select requirement pack", "Assign qualified reviewer"],
  },
  {
    screenId: "license-profile",
    userInputs: ["Applicant/license-holder details", "Ownership and director records", "Regulated activities"],
    actionPoints: ["Resolve missing profile data", "Confirm activities match license scope"],
  },
  {
    screenId: "requirement-library",
    userInputs: ["Regulator source pack", "Applicability filters", "Effective and review dates"],
    actionPoints: ["Review critical requirements", "Mark unreviewed source content"],
  },
  {
    screenId: "evidence-coverage",
    userInputs: ["Uploaded documents", "Connector evidence", "Evidence tags and source confidence"],
    actionPoints: ["Request missing evidence", "Separate stale from absent documents"],
  },
  {
    screenId: "gap-triage",
    userInputs: ["Gap owner", "Severity", "Requested document or explanation"],
    actionPoints: ["Assign critical gaps", "Block filing pack until owners respond"],
  },
  {
    screenId: "caveat-register",
    userInputs: ["Legal/regulatory caveat", "Reviewer note", "Resolution status"],
    actionPoints: ["Capture reviewer caveats", "Escalate unresolved caveats"],
  },
  {
    screenId: "submission-memo",
    userInputs: ["Requirement summary", "Evidence narrative", "Management attestations"],
    actionPoints: ["Draft memo sections", "Route for specialist review"],
  },
  {
    screenId: "filing-pack",
    userInputs: ["Requirement matrix", "Evidence index", "Approval state"],
    actionPoints: ["Assemble export pack", "Confirm human filing authority"],
  },
];


export const meridianRegulatoryStages: MeridianRegulatoryStage[] = [
  {
    id: "set-regulatory-scope",
    arc: "scope",
    title: "Set the regulatory scope",
    purpose: "Determine which jurisdiction, regulator, license type, and license status the workspace is testing.",
    userOutcome: "The user knows which regulatory requirement set is in scope before evidence is assessed.",
    requiredObjects: ["Jurisdiction", "Regulator", "License type", "License status"],
    screenIds: ["regulatory-scope", "license-profile"],
  },
  {
    id: "map-requirements-to-evidence",
    arc: "evidence",
    title: "Map requirements to evidence",
    purpose: "Use the requirement library and ingested evidence tags to show coverage against each required item.",
    userOutcome: "The user can see which requirements are covered, missing, stale, or low confidence.",
    requiredObjects: ["Requirement", "Evidence item", "Coverage result"],
    screenIds: ["requirement-library", "evidence-coverage"],
  },
  {
    id: "triage-gaps-and-caveats",
    arc: "gap",
    title: "Triage gaps and caveats",
    purpose: "Separate true regulatory gaps from missing evidence and force owner/reviewer accountability.",
    userOutcome: "Critical gaps and unresolved caveats are visible before any filing narrative is trusted.",
    requiredObjects: ["Gap", "Owner", "Caveat", "Review note"],
    screenIds: ["gap-triage", "caveat-register"],
  },
  {
    id: "prepare-filing-pack",
    arc: "filing",
    title: "Prepare the filing pack",
    purpose: "Assemble the memo, requirement matrix, evidence index, caveats, and sign-off state.",
    userOutcome: "The user has a reviewable pack, not an auto-filed or legally certified submission.",
    requiredObjects: ["Submission memo", "Requirement matrix", "Evidence index", "Approval state"],
    screenIds: ["submission-memo", "filing-pack"],
  },
];

export const meridianRegulatoryBoundaries: MeridianRegulatoryBoundary[] = [
  {
    id: "no-legal-authority",
    title: "No regulatory authority",
    rule:
      "Meridian can organize requirements and evidence, but it is not a regulator, lawyer, compliance officer, or filing authority.",
  },
  {
    id: "specialist-review-required",
    title: "Specialist review required",
    rule:
      "Requirement content and submission-readiness conclusions must be reviewed by qualified, current domain specialists before customer or regulator use.",
  },
  {
    id: "human-filing-control",
    title: "Human filing control",
    rule:
      "Meridian may prepare a pack and track approval state; it must not file, submit, certify, or sign anything automatically.",
  },
];

export const meridianJurisdictionPackRequirements: MeridianJurisdictionPackRequirement[] = [
  {
    id: "regulator-taxonomy",
    title: "Regulator and license taxonomy",
    whyItMatters:
      "Every market needs its own regulator, license, permission, and filing taxonomy. SECP/NBFC terms must not leak into unrelated markets.",
  },
  {
    id: "official-source-catalog",
    title: "Official source catalog",
    whyItMatters:
      "Requirement packs must link to official law, rulebook, regulator, exchange, or supervisory guidance sources with source dates.",
  },
  {
    id: "applicability-rules",
    title: "Applicability rules",
    whyItMatters:
      "Requirements need explicit applicability by entity type, license status, activity, threshold, filing objective, and effective date.",
  },
  {
    id: "local-specialist-review",
    title: "Local specialist review",
    whyItMatters:
      "Global rollout requires qualified local compliance/legal review before a pack is treated as current or customer-facing.",
  },
  {
    id: "translation-and-terminology",
    title: "Translation and terminology control",
    whyItMatters:
      "Non-English markets need controlled translations and original-language source references so regulatory meaning is not lost.",
  },
  {
    id: "filing-channel-boundary",
    title: "Filing channel boundary",
    whyItMatters:
      "Each market has different portals, forms, signatures, and submission authority. Meridian should prepare packs, not impersonate an authorized filer.",
  },
];

export function meridianScreensForArc(arc: MeridianRegulatoryArc): MeridianRegulatoryScreen[] {
  return meridianRegulatoryScreens.filter((screen) => screen.arc === arc);
}

export function meridianScreensForStage(stage: MeridianRegulatoryStage): MeridianRegulatoryScreen[] {
  const screenMap = new Map(meridianRegulatoryScreens.map((screen) => [screen.id, screen]));
  return stage.screenIds.map((screenId) => {
    const screen = screenMap.get(screenId);
    if (!screen) {
      throw new Error(`Missing Meridian regulatory screen: ${screenId}`);
    }
    return screen;
  });
}

export function guidanceForMeridianScreen(screenId: string): MeridianScreenGuidance {
  const guidance = meridianScreenGuidance.find((item) => item.screenId === screenId);
  if (!guidance) {
    throw new Error(`Missing Meridian screen guidance: ${screenId}`);
  }
  return guidance;
}

export function safeMeridianScreensForStage(stage: MeridianRegulatoryStage): MeridianRegulatoryScreen[] {
  const screenMap = new Map(meridianRegulatoryScreens.map((screen) => [screen.id, screen]));
  const screens = stage.screenIds.flatMap((screenId) => {
    const screen = screenMap.get(screenId);
    return screen ? [screen] : [];
  });
  const missingScreenIds = stage.screenIds.filter((screenId) => !screenMap.has(screenId));
  if (missingScreenIds.length > 0) {
    console.error(`Missing Meridian regulatory screens for stage ${stage.id}: ${missingScreenIds.join(", ")}`);
  }
  return screens;
}

export function validateMeridianWorkflowIntegrity(): MeridianWorkflowIntegrityIssue[] {
  const screenIds = new Set(meridianRegulatoryScreens.map((screen) => screen.id));
  return meridianRegulatoryStages.flatMap((stage) => {
    const missingScreenIds = stage.screenIds.filter((screenId) => !screenIds.has(screenId));
    return missingScreenIds.length > 0 ? [{ stageId: stage.id, missingScreenIds }] : [];
  });
}
