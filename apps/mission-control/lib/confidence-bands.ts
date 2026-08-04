/**
 * Confidence bands — the primary trust signal.
 *
 * Required by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md:
 * "Numeric confidence percentages must not be the primary user signal."
 *
 * WHY. A percentage invites the reader to treat 82% as "probably right". That
 * is the wrong question. The band answers the question the product actually
 * answers: is this reviewed, is it merely sourced, or is the evidence thin?
 * The percentage remains available as secondary detail, never as the headline.
 *
 * Each band carries an explicit negative claim. A regulated buyer must be able
 * to see what the band does NOT assert, which is where most misplaced trust
 * comes from.
 */

export type ConfidenceBand = "verified" | "supported" | "limited" | "blocked";

/**
 * Thresholds are named, not scattered as literals across components. They are
 * a product decision and should change in exactly one place.
 *
 * `verified` is deliberately NOT reachable from a score alone — the contract
 * requires human review for it, so callers must pass `humanReviewed`.
 */
export const BAND_THRESHOLDS = {
  /** At or above this, a human-reviewed record is Verified. */
  verified: 0.75,
  /** At or above this, an unreviewed but source-backed record is Supported. */
  supported: 0.6,
} as const;

export type BandMeta = {
  band: ConfidenceBand;
  label: string;
  /** What the band means. */
  meaning: string;
  /** What the band explicitly does NOT claim. Contract-mandated. */
  notAClaimThat: string;
  /** Tailwind token class. Locked palette only. */
  tone: string;
  /** Tinted background for pills. */
  bg: string;
  /** Non-colour signal, so the band never depends on colour alone. */
  glyph: string;
};

export const BANDS: Record<ConfidenceBand, BandMeta> = {
  verified: {
    band: "verified",
    label: "Verified",
    meaning:
      "Source-backed, current under its configured validity rule, and human-reviewed where required.",
    notAClaimThat:
      "the conclusion is legally, commercially, or professionally correct.",
    tone: "text-nexus-accent",
    bg: "bg-nexus-accent/15",
    glyph: "●",
  },
  supported: {
    band: "supported",
    label: "Supported",
    meaning:
      "Source-backed but requires a named reviewer or further contextual validation.",
    notAClaimThat: "the evidence is complete.",
    tone: "text-nexus-sky",
    bg: "bg-nexus-sky/15",
    glyph: "◐",
  },
  limited: {
    band: "limited",
    label: "Limited",
    meaning:
      "Missing, stale, conflicting, access-limited, or insufficient evidence.",
    notAClaimThat: "no issue exists.",
    tone: "text-nexus-warn",
    bg: "bg-nexus-warn/15",
    glyph: "◔",
  },
  blocked: {
    band: "blocked",
    label: "Blocked",
    meaning:
      "A required control, source, reviewer, or permission prevents progress.",
    notAClaimThat: "the product can safely continue.",
    tone: "text-nexus-danger",
    bg: "bg-nexus-danger/15",
    glyph: "■",
  },
};

/**
 * Map a raw confidence score to a band.
 *
 * @param confidence 0..1 score, or null/undefined when none was produced.
 * @param opts.humanReviewed a named reviewer has approved this record.
 *   Required for `verified` — a score can never self-certify.
 * @param opts.blocked a control, permission, or missing reviewer prevents
 *   progress. Overrides everything else: Blocked is a state, not a score.
 */
export function toConfidenceBand(
  confidence: number | null | undefined,
  opts: { humanReviewed?: boolean; blocked?: boolean } = {}
): ConfidenceBand {
  if (opts.blocked) return "blocked";
  // No score is not a good score. Absence of a finding is not assurance.
  if (confidence === null || confidence === undefined || Number.isNaN(confidence)) {
    return "limited";
  }
  if (opts.humanReviewed && confidence >= BAND_THRESHOLDS.verified) return "verified";
  if (confidence >= BAND_THRESHOLDS.supported) return "supported";
  return "limited";
}

/** Convenience: band metadata directly from a score. */
export function bandMeta(
  confidence: number | null | undefined,
  opts: { humanReviewed?: boolean; blocked?: boolean } = {}
): BandMeta {
  return BANDS[toConfidenceBand(confidence, opts)];
}
