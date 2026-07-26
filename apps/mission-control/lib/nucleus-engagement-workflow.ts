export type NucleusEngagementArc = "profile" | "package" | "delivery" | "assurance";

export type NucleusEngagementScreen = {
  id: string;
  arc: NucleusEngagementArc;
  title: string;
  purpose: string;
  primaryUser: string;
  routeCandidate: string;
  engagementObjects: string[];
};

export type NucleusEngagementStage = {
  id: string;
  arc: NucleusEngagementArc;
  title: string;
  purpose: string;
  userOutcome: string;
  requiredObjects: string[];
  screenIds: string[];
};

export type NucleusEngagementBoundary = {
  id: string;
  title: string;
  rule: string;
};

export type NucleusWhiteLabelRequirement = {
  id: string;
  title: string;
  whyItMatters: string;
};

export type NucleusWorkflowIntegrityIssue = {
  stageId: string;
  missingScreenIds: string[];
};

export type NucleusScreenGuidance = {
  screenId: string;
  userInputs: string[];
  actionPoints: string[];
};

export const nucleusEngagementArcLabels: Record<NucleusEngagementArc, string> = {
  profile: "Firm profile and brand contract",
  package: "Methodology package assembly",
  delivery: "Client engagement delivery",
  assurance: "Review, publish, and operating assurance",
};

export const nucleusEngagementScreens: NucleusEngagementScreen[] = [
  {
    id: "firm-profile-brand",
    arc: "profile",
    title: "Firm Profile & Brand",
    purpose:
      "Capture the partner firm's identity, logo, accent, typography, practice model, and non-negotiable trust constraints.",
    primaryUser: "Managing partner",
    routeCandidate: "/nucleus/setup",
    engagementObjects: ["Firm profile", "Brand layer", "Practice model", "Trust contract"],
  },
  {
    id: "methodology-catalog",
    arc: "profile",
    title: "Methodology Catalog",
    purpose:
      "Inventory repeatable advisory methods, playbooks, diagnostics, deliverables, approval gates, and owner roles.",
    primaryUser: "Practice lead",
    routeCandidate: "/nucleus/methodologies",
    engagementObjects: ["Methodology", "Playbook", "Deliverable type", "Approval gate"],
  },
  {
    id: "engagement-intake",
    arc: "package",
    title: "Engagement Intake",
    purpose:
      "Turn a client mandate into scope, buyer context, regulated entity profile, evidence needs, and delivery calendar.",
    primaryUser: "Engagement manager",
    routeCandidate: "/nucleus/engagement-intake",
    engagementObjects: ["Client mandate", "Scope", "Buyer context", "Delivery calendar"],
  },
  {
    id: "evidence-room-template",
    arc: "package",
    title: "Evidence Room Template",
    purpose:
      "Define the folders, connectors, document requests, evidence quality rules, and citation standards for each method pack.",
    primaryUser: "Engagement manager",
    routeCandidate: "/nucleus/evidence-room",
    engagementObjects: ["Evidence request", "Connector", "Quality rule", "Citation standard"],
  },
  {
    id: "deliverable-builder",
    arc: "delivery",
    title: "Deliverable Builder",
    purpose:
      "Draft client-ready outputs from the firm's methodology, cited evidence, open questions, caveats, and reviewer notes.",
    primaryUser: "Consultant",
    routeCandidate: "/nucleus/deliverable-builder",
    engagementObjects: ["Deliverable", "Evidence citation", "Open question", "Caveat"],
  },
  {
    id: "reviewer-console",
    arc: "delivery",
    title: "Reviewer Console",
    purpose:
      "Route drafts to named reviewers, capture partner comments, resolve caveats, and keep client-facing changes controlled.",
    primaryUser: "Partner reviewer",
    routeCandidate: "/nucleus/reviewer-console",
    engagementObjects: ["Review queue", "Partner comment", "Caveat", "Change request"],
  },
  {
    id: "client-portal-preview",
    arc: "assurance",
    title: "Client Portal Preview",
    purpose:
      "Preview exactly what the client will see: status, evidence coverage, AI provenance, reviewer sign-off, and next actions.",
    primaryUser: "Engagement manager",
    routeCandidate: "/nucleus/client-portal",
    engagementObjects: ["Client portal", "Status", "Provenance", "Next action"],
  },
  {
    id: "operating-pack-publish",
    arc: "assurance",
    title: "Operating Pack Publish",
    purpose:
      "Package the white-label workspace for rollout with fixed trust patterns, audit trail, billing posture, and support owner.",
    primaryUser: "Platform owner",
    routeCandidate: "/nucleus/publish",
    engagementObjects: ["Operating pack", "Audit trail", "Billing posture", "Support owner"],
  },
];

export const nucleusScreenGuidance: NucleusScreenGuidance[] = [
  {
    screenId: "firm-profile-brand",
    userInputs: ["Firm name, logo, accent, and typeface", "Practice areas and client segments"],
    actionPoints: ["Confirm overridable brand layer", "Lock core status and trust tokens"],
  },
  {
    screenId: "methodology-catalog",
    userInputs: ["Method names", "Playbook steps", "Deliverable types and approval gates"],
    actionPoints: ["Select launch method pack", "Assign practice owners"],
  },
  {
    screenId: "engagement-intake",
    userInputs: ["Client mandate", "Scope boundaries", "Delivery calendar and sponsor"],
    actionPoints: ["Open engagement room", "Confirm regulated-entity context"],
  },
  {
    screenId: "evidence-room-template",
    userInputs: ["Evidence checklist", "Connector choices", "Citation and quality standards"],
    actionPoints: ["Generate evidence requests", "Flag missing source systems"],
  },
  {
    screenId: "deliverable-builder",
    userInputs: ["Draft sections", "Evidence citations", "Caveats and open questions"],
    actionPoints: ["Draft client output", "Mark sections needing human review"],
  },
  {
    screenId: "reviewer-console",
    userInputs: ["Reviewer owner", "Partner comments", "Change requests"],
    actionPoints: ["Approve or send back draft sections", "Record reviewer accountability"],
  },
  {
    screenId: "client-portal-preview",
    userInputs: ["Client-facing status", "Allowed next actions", "Provenance visibility"],
    actionPoints: ["Preview client room", "Remove internal-only notes"],
  },
  {
    screenId: "operating-pack-publish",
    userInputs: ["Launch checklist", "Billing posture", "Support owner"],
    actionPoints: ["Publish controlled operating pack", "Confirm no trust tokens were overridden"],
  },
];

export const nucleusEngagementStages: NucleusEngagementStage[] = [
  {
    id: "define-firm-operating-model",
    arc: "profile",
    title: "Define the firm operating model",
    purpose: "Separate brandable client experience from fixed trust mechanics and practice governance.",
    userOutcome: "The partner knows what they can brand and what remains contractually fixed.",
    requiredObjects: ["Firm profile", "Brand layer", "Methodology catalog", "Trust contract"],
    screenIds: ["firm-profile-brand", "methodology-catalog"],
  },
  {
    id: "assemble-method-pack",
    arc: "package",
    title: "Assemble the method pack",
    purpose: "Turn a consulting method into scoped client intake, evidence requests, and delivery gates.",
    userOutcome: "The engagement team has a repeatable room before client delivery begins.",
    requiredObjects: ["Client mandate", "Evidence template", "Connector map", "Delivery calendar"],
    screenIds: ["engagement-intake", "evidence-room-template"],
  },
  {
    id: "deliver-client-work",
    arc: "delivery",
    title: "Deliver client work",
    purpose: "Draft outputs from the firm's methods while keeping reviewer judgment and caveats visible.",
    userOutcome: "Client deliverables are faster to prepare without hiding who reviewed them.",
    requiredObjects: ["Deliverable", "Evidence citation", "Review queue", "Partner comment"],
    screenIds: ["deliverable-builder", "reviewer-console"],
  },
  {
    id: "publish-controlled-platform",
    arc: "assurance",
    title: "Publish the controlled platform",
    purpose: "Preview the client surface, preserve auditability, and publish only within the trust contract.",
    userOutcome: "The partner can launch a branded AI platform without diluting governance guarantees.",
    requiredObjects: ["Client portal", "Audit trail", "Operating pack", "Support owner"],
    screenIds: ["client-portal-preview", "operating-pack-publish"],
  },
];

export const nucleusEngagementBoundaries: NucleusEngagementBoundary[] = [
  {
    id: "fixed-trust-layer",
    title: "Fixed trust layer",
    rule:
      "Nucleus can replace the client-facing brand layer, but it must not alter core status colours, evidence provenance, approval boundaries, audit labels, or consequence previews.",
  },
  {
    id: "partner-owned-advice",
    title: "Partner-owned advice",
    rule:
      "Nucleus can draft and organize client deliverables; the advisory firm remains responsible for recommendations, approvals, and client-facing conclusions.",
  },
  {
    id: "no-hidden-client-output",
    title: "No hidden client output",
    rule:
      "Anything shown in a client portal must expose source coverage, reviewer status, and unresolved caveats before it is published.",
  },
];

export const nucleusWhiteLabelRequirements: NucleusWhiteLabelRequirement[] = [
  {
    id: "overridable-brand-layer",
    title: "Overridable brand layer",
    whyItMatters:
      "Partners need their logo, accent, and typography to feel native to their firm without changing the trust contract underneath.",
  },
  {
    id: "fixed-status-vocabulary",
    title: "Fixed status vocabulary",
    whyItMatters:
      "Approved, blocked, AI-drafted, stale, missing, and human-reviewed must mean the same thing across every branded deployment.",
  },
  {
    id: "method-pack-portability",
    title: "Method-pack portability",
    whyItMatters:
      "A repeatable consulting method should move between clients while preserving evidence requirements, caveats, and review gates.",
  },
  {
    id: "client-portal-control",
    title: "Client portal control",
    whyItMatters:
      "Advisory teams need to preview and approve what clients see before any draft, finding, or status becomes client-facing.",
  },
  {
    id: "commercial-boundary",
    title: "Commercial boundary",
    whyItMatters:
      "Nucleus is a platform and methodology layer, not unpaid implementation work disguised as a diagnostic or pilot.",
  },
];

export function nucleusScreensForArc(arc: NucleusEngagementArc): NucleusEngagementScreen[] {
  return nucleusEngagementScreens.filter((screen) => screen.arc === arc);
}

export function nucleusScreensForStage(stage: NucleusEngagementStage): NucleusEngagementScreen[] {
  const screenMap = new Map(nucleusEngagementScreens.map((screen) => [screen.id, screen]));
  return stage.screenIds.map((screenId) => {
    const screen = screenMap.get(screenId);
    if (!screen) {
      throw new Error(`Missing Nucleus engagement screen: ${screenId}`);
    }
    return screen;
  });
}

export function guidanceForNucleusScreen(screenId: string): NucleusScreenGuidance {
  const guidance = nucleusScreenGuidance.find((item) => item.screenId === screenId);
  if (!guidance) {
    throw new Error(`Missing Nucleus screen guidance: ${screenId}`);
  }
  return guidance;
}

export function safeNucleusScreensForStage(stage: NucleusEngagementStage): NucleusEngagementScreen[] {
  const screenMap = new Map(nucleusEngagementScreens.map((screen) => [screen.id, screen]));
  const screens = stage.screenIds.flatMap((screenId) => {
    const screen = screenMap.get(screenId);
    return screen ? [screen] : [];
  });
  const missingScreenIds = stage.screenIds.filter((screenId) => !screenMap.has(screenId));
  if (missingScreenIds.length > 0) {
    console.error(`Missing Nucleus engagement screens for stage ${stage.id}: ${missingScreenIds.join(", ")}`);
  }
  return screens;
}

export function validateNucleusWorkflowIntegrity(): NucleusWorkflowIntegrityIssue[] {
  const screenIds = new Set(nucleusEngagementScreens.map((screen) => screen.id));
  return nucleusEngagementStages.flatMap((stage) => {
    const missingScreenIds = stage.screenIds.filter((screenId) => !screenIds.has(screenId));
    return missingScreenIds.length > 0 ? [{ stageId: stage.id, missingScreenIds }] : [];
  });
}
