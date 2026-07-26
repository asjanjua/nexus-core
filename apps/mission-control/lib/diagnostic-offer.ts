/**
 * Readiness Diagnostic — commercial offer registry.
 *
 * The paid diagnostic is the priced front door that sits between the free
 * `/readiness` self-assessment and a scoped pilot SOW. `/readiness` scores
 * seven dimensions from the client's own answers; this engagement tests those
 * same seven dimensions against their evidence. Keeping the dimension list in
 * one place means the free instrument and the paid one can never drift apart.
 *
 * Fee visibility is a single decision, not a rewrite. `FEE` is null by
 * default, and the page renders as a clean scope-and-timeline offer with no
 * gap where a number should be. Set it and the commercial block appears.
 * Nothing else needs to change.
 */

/**
 * Engagement fee. Null means "not stated on the page" — the offer then reads
 * on scope and timeline alone and pricing stays in conversation.
 *
 * To publish a fee, set the object. `note` carries the qualifier a regulated
 * buyer expects (what the figure excludes, what varies).
 */
export const FEE: { amount: string; basis: string; note: string } | null = null;

/** Engagement duration. Stated publicly in all configurations. */
export const TIMELINE = {
  duration: "Two weeks",
  detail:
    "Ten working days from kick-off to findings walkthrough. Short enough to approve without a procurement cycle, long enough to test evidence rather than opinion.",
} as const;

/**
 * The seven dimensions assessed. Labels and ids match `app/readiness/page.tsx`
 * DIMENSIONS exactly — if that list changes, this one must change with it.
 *
 * `selfAssessed` is what the free quiz can establish from a single answer.
 * `diagnostic` is what the paid engagement establishes from their evidence.
 * The gap between those two columns is the entire commercial argument.
 */
export const DIMENSIONS = [
  {
    id: "org_drag",
    label: "Organisational Drag",
    selfAssessed: "How many approval steps you believe a decision passes through.",
    diagnostic:
      "We trace three recent decisions end to end and record where each one actually waited, who held it, and for how long.",
  },
  {
    id: "ai_maturity",
    label: "AI as a Core Function",
    selfAssessed: "Where you place AI in the organisation today.",
    diagnostic:
      "We map current AI use against who owns it, what it touches, and which uses are running without a mandate.",
  },
  {
    id: "data_readiness",
    label: "Data Readiness",
    selfAssessed: "Whether an authorised person can retrieve key data in under an hour.",
    diagnostic:
      "We attempt the retrieval on a sample of the decision data your leaders actually cite, and time it.",
  },
  {
    id: "workflow_standardisation",
    label: "Workflow Standardisation",
    selfAssessed: "How well you believe critical processes are documented.",
    diagnostic:
      "We test the documentation against the people who run the process and record what exists only in someone's head.",
  },
  {
    id: "governance_maturity",
    label: "Governance Maturity",
    selfAssessed: "Your stated posture on AI oversight.",
    diagnostic:
      "We check whether an AI output produced last month could be reconstructed today: source, reviewer, approval, and rollback.",
  },
  {
    id: "regulatory_preparedness",
    label: "Regulatory Preparedness",
    selfAssessed: "Whether you have mapped obligations to AI deployment.",
    diagnostic:
      "We map your AI use to the specific instruments that bind you, at clause level, in your jurisdiction.",
  },
  {
    id: "decision_velocity",
    label: "Decision Velocity",
    selfAssessed: "How quickly you believe clear intelligence becomes action.",
    diagnostic:
      "We measure elapsed time from evidence available to action taken on the decisions you nominate.",
  },
] as const;

/** What the client receives. These are artefacts, not activities. */
export const DELIVERABLES = [
  {
    title: "Readiness findings pack",
    body: "Scored assessment across the seven dimensions, each finding tied to the evidence it came from. Written for circulation to a board or an executive committee without translation.",
  },
  {
    title: "Prioritised remediation roadmap",
    body: "The gaps ordered by what unblocks the most downstream value, with the sequencing constraints named. This is the document that justifies a phase two internally.",
  },
  {
    title: "Regulatory obligation map",
    body: "Your AI use mapped to the instruments that bind you at clause level, with the gaps between current controls and stated obligations marked.",
  },
  {
    title: "Findings walkthrough",
    body: "A working session with your sponsor and whoever owns remediation. The purpose is agreement on what is true, not a presentation.",
  },
] as const;

/** How the two weeks run. */
export const APPROACH = [
  {
    stage: "Days 1 to 2",
    title: "Scope and evidence request",
    body: "We agree the three decisions to trace and the data sample to test, then issue a single consolidated evidence request. No open-ended document trawl.",
  },
  {
    stage: "Days 3 to 7",
    title: "Evidence testing",
    body: "Structured interviews with process owners, retrieval testing against the nominated data, and clause-level regulatory mapping.",
  },
  {
    stage: "Days 8 to 9",
    title: "Findings and sequencing",
    body: "Findings written up against evidence, gaps prioritised, roadmap sequenced with constraints named.",
  },
  {
    stage: "Day 10",
    title: "Walkthrough and handover",
    body: "Findings walkthrough with the sponsor and remediation owner. Pack handed over in final form.",
  },
] as const;

/**
 * Stated exclusions. These protect both sides: the client knows what they are
 * not buying, and the engagement cannot quietly expand into unpaid delivery.
 */
export const EXCLUSIONS = [
  "No implementation, configuration, or system build. This engagement establishes what is true and what to do about it.",
  "No regulatory filing, certification, or submission on your behalf. Findings support your own submissions; a named person in your organisation files them.",
  "No legal opinion. The regulatory map identifies applicable obligations; it does not substitute for advice from your counsel.",
  "No vendor selection or procurement support.",
] as const;

/** What the client must provide for the two weeks to hold. */
export const CLIENT_RESPONSIBILITIES = [
  "A named executive sponsor with authority to nominate the decisions traced.",
  "Access to the three nominated decisions and their participants within the first week.",
  "A named remediation owner present at the walkthrough.",
  "Response to the consolidated evidence request within three working days.",
] as const;
