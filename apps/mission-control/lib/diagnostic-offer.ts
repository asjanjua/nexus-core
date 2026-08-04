/**
 * Readiness Diagnostic — commercial offer registry.
 *
 * The diagnostic is the evidence-tested front door that sits between the free
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
 * Rung one: the self-serve diagnostic. If a price is set, it qualifies intent
 * rather than acting as a revenue line. Keep it hidden until checkout and
 * customer receipt flows exist in production.
 *
 * If this becomes paid again, charge plainly rather than waiving with card
 * capture. A waived fee that later converts on a condition the customer
 * triggered can create negative-option disclosure problems and weakens the
 * governance story.
 */
export const FEE: { amount: string; basis: string; note: string } | null = null;

/**
 * Rung two: the partner-delivered engagement. Kept distinct from FEE on
 * purpose. The self-serve output cannot trace decisions or map obligations at
 * clause level, and if both rungs share one label the lower figure anchors the
 * higher one out of existence.
 *
 * `fee` is now set. It is also the figure the launch waiver strikes through,
 * so the two must be changed together — see ENGAGEMENT_WAIVER below.
 */
export const ENGAGEMENT: {
  name: string;
  summary: string;
  fee: { amount: string; basis: string } | null;
} = {
  name: "Evidence-Tested Readiness Review",
  summary:
    "Where the self-serve assessment reports what your team believes, this engagement tests it. Two weeks, partner-delivered: three decisions traced end to end, retrieval timed against your real data, and your AI use mapped to the instruments that bind you at clause level.",
  /**
   * Published so the waiver has something real to be measured against. Until
   * this was set there was no number that had ever been charged, and a
   * struck-through figure would have been a fabricated saving.
   *
   * Priced as a qualification step rather than a revenue line, consistent with
   * the note above FEE. It is deliberately low against two weeks of partner
   * time; the return is a scoped SOW, not the fee itself.
   */
  fee: {
    amount: "$4,500",
    basis:
      "Fixed fee, all inclusive. One engagement covers the review regardless of how many entities sit inside the group, and there are no expenses on top.",
  },
};

/**
 * Launch window: the engagement fee is waived for work that starts before
 * `endsAt`.
 *
 * DATE-DRIVEN ON PURPOSE. An offer written as page copy is still on the site
 * in December claiming to be free. `waiverStatus()` decides, so the block
 * disappears on its own when the window closes.
 *
 * NO CARD CAPTURE, NO AUTO-CONVERSION. This honours the warning above FEE: a
 * waived fee that later starts charging on a condition the customer triggered
 * is a negative-option arrangement, and for a firm selling governance that is
 * a self-inflicted wound. When the window closes the offer simply ends, and
 * anyone already inside it stays inside it.
 *
 * THE ANCHOR MUST BE REAL. The waiver shows `ENGAGEMENT.fee` struck through,
 * which is only honest because that is the fee actually charged once the
 * window closes. Striking through a number nobody was ever asked to pay is a
 * misleading-price problem in the GCC and Pakistan alike, so the test suite
 * refuses any saving claim while `ENGAGEMENT.fee` is null.
 */
export const ENGAGEMENT_WAIVER = {
  /** Inclusive. Engagements confirmed on or before this date pay no fee. */
  endsAt: "2026-11-04",
  headline: "Engagement fee waived before 4 November 2026",
  terms:
    "The Evidence-Tested Readiness Review is normally $4,500 as a fixed, all-inclusive fee. It is waived entirely for engagements confirmed on or before 4 November 2026, and charged at $4,500 from 5 November. No card is taken and nothing converts to a paid subscription afterwards. Software plans are separate and priced by team size.",
} as const;

/**
 * Guard for the copy above: a saving may only be claimed while there is a
 * published fee to claim it against. Called by the test suite rather than at
 * runtime, because the failure it catches is an editing mistake, not a
 * user-triggered state.
 */
export function waiverClaimsSavingHonestly(): boolean {
  const claimsSaving = /\b(normally|waived|instead of|save)\b/i.test(
    `${ENGAGEMENT_WAIVER.headline} ${ENGAGEMENT_WAIVER.terms}`
  );
  return !claimsSaving || ENGAGEMENT.fee !== null;
}

export type WaiverStatus = {
  active: boolean;
  endsAt: string;
  /** Whole days left, 0 on the final day. Null once the window has closed. */
  daysRemaining: number | null;
};

const MS_PER_DAY = 86_400_000;

/**
 * Is the waiver live? Compares whole UTC days so a visitor on the closing date
 * still sees the offer regardless of their clock's time of day.
 */
export function waiverStatus(now: Date = new Date()): WaiverStatus {
  const end = Date.parse(`${ENGAGEMENT_WAIVER.endsAt}T23:59:59.999Z`);
  const current = now.getTime();
  if (!Number.isFinite(current) || current > end) {
    return { active: false, endsAt: ENGAGEMENT_WAIVER.endsAt, daysRemaining: null };
  }
  return {
    active: true,
    endsAt: ENGAGEMENT_WAIVER.endsAt,
    daysRemaining: Math.max(0, Math.floor((end - current) / MS_PER_DAY)),
  };
}

/** What the self-serve readiness assessment returns. Automated, same day. */
export const SELF_SERVE_OUTPUT = [
  {
    title: "Scored readiness assessment",
    body: "Your organisation scored across the seven dimensions below, with the weakest two identified as the constraint to address first.",
  },
  {
    title: "Named gaps, not a grade",
    body: "Each low score returns the specific question a board or a regulator would ask about it, so you know what you cannot currently answer.",
  },
  {
    title: "A workspace you can invite colleagues into",
    body: "Each person gets their own login, because a shared login breaks the audit trail that makes any of this defensible. Three seats included before anything changes.",
  },
] as const;

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
