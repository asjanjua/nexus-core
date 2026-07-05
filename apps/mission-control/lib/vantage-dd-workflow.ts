export type VantageDDArc = "dealroom" | "coverage" | "redflags" | "memo";

export type VantageDDScreen = {
  id: string;
  arc: VantageDDArc;
  title: string;
  purpose: string;
  primaryUser: string;
  routeCandidate: string;
  dealObjects: string[];
};

export type VantageDDStage = {
  id: string;
  arc: VantageDDArc;
  title: string;
  purpose: string;
  userOutcome: string;
  requiredObjects: string[];
  screenIds: string[];
};

export type VantageDDBoundary = {
  id: string;
  title: string;
  rule: string;
};

export type VantageMarketPackRequirement = {
  id: string;
  title: string;
  whyItMatters: string;
};

export type VantageWorkflowIntegrityIssue = {
  stageId: string;
  missingScreenIds: string[];
};

export type VantageScreenGuidance = {
  screenId: string;
  userInputs: string[];
  actionPoints: string[];
};

export const vantageDDArcLabels: Record<VantageDDArc, string> = {
  dealroom: "Deal room setup and diligence scope",
  coverage: "Checklist coverage and evidence depth",
  redflags: "Red flags, judgment, and follow-up",
  memo: "Investment committee memo and decision handoff",
};

export const vantageDDScreens: VantageDDScreen[] = [
  {
    id: "dealroom-setup",
    arc: "dealroom",
    title: "Deal Room Setup",
    purpose:
      "Capture deal type, target profile, buyer thesis, workstream owners, diligence deadline, and data-room scope.",
    primaryUser: "Deal lead",
    routeCandidate: "/vantage/dealroom",
    dealObjects: ["Deal", "Target", "Buyer thesis", "Workstream owner", "Deadline"],
  },
  {
    id: "data-room-index",
    arc: "dealroom",
    title: "Data Room Index",
    purpose:
      "Organize uploaded and connected data-room materials by workstream, sensitivity, source, and review status.",
    primaryUser: "Diligence manager",
    routeCandidate: "/vantage/data-room",
    dealObjects: ["Data-room document", "Workstream", "Sensitivity label", "Review status"],
  },
  {
    id: "checklist-coverage",
    arc: "coverage",
    title: "Checklist Coverage",
    purpose:
      "Map diligence checklist items to evidence across financial, regulatory, legal, technology, data, and people workstreams.",
    primaryUser: "Diligence manager",
    routeCandidate: "/vantage/coverage",
    dealObjects: ["Checklist item", "Workstream", "Evidence tag", "Coverage result"],
  },
  {
    id: "evidence-depth",
    arc: "coverage",
    title: "Evidence Depth",
    purpose:
      "Show whether covered items are actually decision-useful by surfacing document age, source quality, and unresolved questions.",
    primaryUser: "Advisor",
    routeCandidate: "/vantage/evidence-depth",
    dealObjects: ["Evidence item", "Source quality", "Document age", "Open question"],
  },
  {
    id: "red-flag-workbench",
    arc: "redflags",
    title: "Red Flag Workbench",
    purpose:
      "Separate missing evidence from true red flags and route each issue to quantify, request, escalate, or park.",
    primaryUser: "Investment committee sponsor",
    routeCandidate: "/vantage/red-flags",
    dealObjects: ["Red flag", "Missing evidence", "Follow-up action", "Escalation route"],
  },
  {
    id: "advisor-judgment-log",
    arc: "redflags",
    title: "Advisor Judgment Log",
    purpose:
      "Record human diligence judgment, materiality, mitigation, unresolved caveats, and recommendation posture.",
    primaryUser: "Deal advisor",
    routeCandidate: "/vantage/judgment-log",
    dealObjects: ["Judgment note", "Materiality", "Mitigation", "Recommendation posture"],
  },
  {
    id: "ic-memo-builder",
    arc: "memo",
    title: "IC Memo Builder",
    purpose:
      "Draft investment committee sections from coverage, red flags, evidence citations, advisor notes, and caveats.",
    primaryUser: "Deal lead",
    routeCandidate: "/vantage/ic-memo",
    dealObjects: ["Memo section", "Evidence citation", "Red flag summary", "Advisor note"],
  },
  {
    id: "decision-handoff",
    arc: "memo",
    title: "Decision Handoff",
    purpose:
      "Package the IC memo, unresolved items, approval questions, source index, and decision-owner next steps.",
    primaryUser: "Investment committee secretary",
    routeCandidate: "/vantage/decision-handoff",
    dealObjects: ["Decision packet", "Approval question", "Source index", "Next step"],
  },
];

export const vantageScreenGuidance: VantageScreenGuidance[] = [
  {
    screenId: "dealroom-setup",
    userInputs: ["Deal type and target", "Buyer thesis", "Workstream owners and deadline"],
    actionPoints: ["Open diligence workspace", "Confirm IC sponsor and reviewer"],
  },
  {
    screenId: "data-room-index",
    userInputs: ["Uploaded files", "Source folders", "Sensitivity and workstream labels"],
    actionPoints: ["Organize evidence by workstream", "Request missing data-room sections"],
  },
  {
    screenId: "checklist-coverage",
    userInputs: ["Deal checklist", "Evidence tags", "Coverage by workstream"],
    actionPoints: ["Prioritize uncovered critical items", "Send evidence requests"],
  },
  {
    screenId: "evidence-depth",
    userInputs: ["Document age", "Source quality", "Open questions"],
    actionPoints: ["Flag weak evidence", "Ask advisor to judge decision-usefulness"],
  },
  {
    screenId: "red-flag-workbench",
    userInputs: ["Red flag indicator", "Materiality", "Follow-up owner"],
    actionPoints: ["Escalate material issues", "Separate missing evidence from true risk"],
  },
  {
    screenId: "advisor-judgment-log",
    userInputs: ["Advisor note", "Mitigation", "Recommendation posture"],
    actionPoints: ["Record human judgment", "Attach caveats before IC memo"],
  },
  {
    screenId: "ic-memo-builder",
    userInputs: ["Memo section", "Evidence citation", "Red-flag summary"],
    actionPoints: ["Draft source-backed IC memo", "Mark sections needing reviewer input"],
  },
  {
    screenId: "decision-handoff",
    userInputs: ["Approval questions", "Unresolved items", "Decision owner"],
    actionPoints: ["Package IC handoff", "Confirm Vantage is not making the decision"],
  },
];


export const vantageDDStages: VantageDDStage[] = [
  {
    id: "open-dealroom",
    arc: "dealroom",
    title: "Open the deal room",
    purpose: "Create the diligence workspace, buyer thesis, workstream model, and data-room inventory.",
    userOutcome: "The deal team has a scoped data room before coverage scoring begins.",
    requiredObjects: ["Deal", "Target", "Buyer thesis", "Data-room index"],
    screenIds: ["dealroom-setup", "data-room-index"],
  },
  {
    id: "score-diligence-coverage",
    arc: "coverage",
    title: "Score diligence coverage",
    purpose: "Map checklist items to evidence and test whether each match is decision-useful.",
    userOutcome: "The team can distinguish coverage from real diligence depth.",
    requiredObjects: ["Checklist item", "Evidence item", "Coverage result", "Open question"],
    screenIds: ["checklist-coverage", "evidence-depth"],
  },
  {
    id: "review-red-flags",
    arc: "redflags",
    title: "Review red flags",
    purpose: "Triage red flags, missing evidence, materiality, mitigants, and advisor judgment.",
    userOutcome: "The IC sponsor can see what is truly risky and what simply needs more evidence.",
    requiredObjects: ["Red flag", "Materiality", "Mitigation", "Judgment note"],
    screenIds: ["red-flag-workbench", "advisor-judgment-log"],
  },
  {
    id: "prepare-ic-handoff",
    arc: "memo",
    title: "Prepare IC handoff",
    purpose: "Draft the memo and package decision questions with source-backed caveats.",
    userOutcome: "The IC receives a decision-ready pack without Vantage pretending to make the investment decision.",
    requiredObjects: ["IC memo", "Decision packet", "Source index", "Approval question"],
    screenIds: ["ic-memo-builder", "decision-handoff"],
  },
];

export const vantageDDBoundaries: VantageDDBoundary[] = [
  {
    id: "no-investment-decision",
    title: "No investment decision",
    rule:
      "Vantage can draft analysis and surface risk; it must not mark a deal as approved, investable, or rejected on behalf of the IC.",
  },
  {
    id: "advisor-judgment-visible",
    title: "Advisor judgment visible",
    rule:
      "Every recommendation posture must identify the human reviewer, material caveats, and evidence behind the judgment.",
  },
  {
    id: "source-backed-memo",
    title: "Source-backed memo",
    rule:
      "IC memo sections should cite evidence and checklist context instead of presenting synthesized claims as ungrounded conclusions.",
  },
];

export const vantageMarketPackRequirements: VantageMarketPackRequirement[] = [
  {
    id: "buyer-target-market",
    title: "Buyer and target market",
    whyItMatters:
      "Cross-border deals need buyer country, target country, operating countries, currency, language, and data-room access assumptions separated.",
  },
  {
    id: "sector-risk-overlay",
    title: "Sector risk overlay",
    whyItMatters:
      "Fintech, healthcare, SaaS, financial institutions, infrastructure, and professional services have different diligence workstreams and red-flag patterns.",
  },
  {
    id: "local-advisor-review",
    title: "Local advisor review",
    whyItMatters:
      "Legal, tax, regulatory, accounting, technical, and commercial findings should expose the responsible human reviewer before IC handoff.",
  },
  {
    id: "materiality-thresholds",
    title: "Materiality thresholds",
    whyItMatters:
      "A red flag's importance depends on deal size, buyer mandate, jurisdiction, regulated activity, and committee tolerance.",
  },
  {
    id: "data-room-localization",
    title: "Data-room localization",
    whyItMatters:
      "Global deal rooms may include multilingual documents, local accounting formats, local registry extracts, and jurisdiction-specific evidence.",
  },
  {
    id: "decision-authority-boundary",
    title: "Decision authority boundary",
    whyItMatters:
      "Vantage can draft evidence-backed analysis, but the investment committee or authorized buyer body owns the decision.",
  },
];

export function vantageScreensForArc(arc: VantageDDArc): VantageDDScreen[] {
  return vantageDDScreens.filter((screen) => screen.arc === arc);
}

export function vantageScreensForStage(stage: VantageDDStage): VantageDDScreen[] {
  const screenMap = new Map(vantageDDScreens.map((screen) => [screen.id, screen]));
  return stage.screenIds.map((screenId) => {
    const screen = screenMap.get(screenId);
    if (!screen) {
      throw new Error(`Missing Vantage DD screen: ${screenId}`);
    }
    return screen;
  });
}

export function guidanceForVantageScreen(screenId: string): VantageScreenGuidance {
  const guidance = vantageScreenGuidance.find((item) => item.screenId === screenId);
  if (!guidance) {
    throw new Error(`Missing Vantage screen guidance: ${screenId}`);
  }
  return guidance;
}

export function safeVantageScreensForStage(stage: VantageDDStage): VantageDDScreen[] {
  const screenMap = new Map(vantageDDScreens.map((screen) => [screen.id, screen]));
  const screens = stage.screenIds.flatMap((screenId) => {
    const screen = screenMap.get(screenId);
    return screen ? [screen] : [];
  });
  const missingScreenIds = stage.screenIds.filter((screenId) => !screenMap.has(screenId));
  if (missingScreenIds.length > 0) {
    console.error(`Missing Vantage DD screens for stage ${stage.id}: ${missingScreenIds.join(", ")}`);
  }
  return screens;
}

export function validateVantageWorkflowIntegrity(): VantageWorkflowIntegrityIssue[] {
  const screenIds = new Set(vantageDDScreens.map((screen) => screen.id));
  return vantageDDStages.flatMap((stage) => {
    const missingScreenIds = stage.screenIds.filter((screenId) => !screenIds.has(screenId));
    return missingScreenIds.length > 0 ? [{ stageId: stage.id, missingScreenIds }] : [];
  });
}
