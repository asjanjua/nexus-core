/**
 * Forbidden-action enforcement.
 *
 * Required by docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md, which names
 * one forbidden action per vertical, the audit event each must emit when
 * attempted, and the test that must prove it. Until this existed, the
 * boundaries were prose in the workflow registries and copy on the hub
 * screens — a promise with nothing behind it. The contract is explicit that
 * those were "planned contracts, not claims that runtime enforcement exists
 * today". This module is what makes them real.
 *
 * WHY A SHARED MODULE rather than four inline checks:
 *
 *  - The event names are contractual. A typo in one route silently produces an
 *    unauditable event, and nothing fails. Here they are declared once.
 *  - The four verticals must refuse identically. A buyer who sees Meridian
 *    refuse politely and Vantage refuse rudely learns the boundary is a
 *    per-screen decision rather than a product property.
 *  - New routes inherit the guard by naming their product, instead of each
 *    author re-deriving what is forbidden.
 *
 * WHAT THIS IS NOT. This blocks the machine from performing the act. It does
 * not stop a human doing it through the regulator's own channel, a board
 * portal, or a data room — that is the point. The product prepares; a named
 * human commits.
 */

import { z } from "zod";

export const governedProductSchema = z.enum(["quorum", "meridian", "vantage", "nucleus"]);
export type GovernedProduct = z.infer<typeof governedProductSchema>;

/**
 * Audit event emitted when a forbidden action is attempted. Names are fixed by
 * the contract — do not rename without updating the contract doc, since these
 * strings end up in an audit trail a regulator may read.
 */
export const FORBIDDEN_EVENT = {
  quorum: "quorum.finalisation_blocked",
  meridian: "meridian.filing_blocked",
  vantage: "vantage.decision_blocked",
  nucleus: "nucleus.publish_blocked",
} as const satisfies Record<GovernedProduct, string>;

export type ForbiddenEvent = (typeof FORBIDDEN_EVENT)[GovernedProduct];

type Boundary = {
  /** Verbs the machine must never perform for this product. */
  forbiddenActions: readonly string[];
  /** Audit event emitted on an attempt. */
  event: ForbiddenEvent;
  /** Shown to the user. States the boundary and who may act instead. */
  refusal: string;
  /** Where the act legitimately happens, so refusal is not a dead end. */
  humanPath: string;
};

export const BOUNDARIES: Record<GovernedProduct, Boundary> = {
  quorum: {
    forbiddenActions: ["finalize_minutes", "sign", "file", "approve_board_action"],
    event: FORBIDDEN_EVENT.quorum,
    refusal:
      "Quorum cannot finalise minutes, sign, file, or approve a board action. A named chair or company secretary does that.",
    humanPath: "Route to the chair or company secretary for sign-off.",
  },
  meridian: {
    forbiddenActions: ["file", "submit", "certify", "sign"],
    event: FORBIDDEN_EVENT.meridian,
    refusal:
      "Meridian cannot file, submit, certify, or sign a regulatory package. It prepares and checks; a named authorised filer submits.",
    humanPath: "Hand off to the named authorised filer, who submits through the regulator's own channel.",
  },
  vantage: {
    forbiddenActions: ["approve_deal", "mark_investable", "reject_deal", "clear_legally", "mark_risk_free"],
    event: FORBIDDEN_EVENT.vantage,
    refusal:
      "Vantage cannot mark a deal approved, investable, rejected, legally cleared, or risk-free. It prepares diligence; the investment committee decides.",
    humanPath: "Prepare the IC memo and route the open questions to the named decision-maker.",
  },
  nucleus: {
    forbiddenActions: ["publish_client_advice", "approve_for_firm", "conceal_trust_mechanics"],
    event: FORBIDDEN_EVENT.nucleus,
    refusal:
      "Nucleus cannot publish client advice, approve on the firm's behalf, or conceal the fixed trust mechanics. A partner reviews and releases.",
    humanPath: "Send to the partner review queue before anything reaches the client.",
  },
};

/** Thrown when a caller attempts a forbidden action. Carries the audit event. */
export class ForbiddenActionError extends Error {
  readonly product: GovernedProduct;
  readonly action: string;
  readonly event: ForbiddenEvent;
  readonly humanPath: string;

  constructor(product: GovernedProduct, action: string) {
    const boundary = BOUNDARIES[product];
    super(boundary.refusal);
    this.name = "ForbiddenActionError";
    this.product = product;
    this.action = action;
    this.event = boundary.event;
    this.humanPath = boundary.humanPath;
  }
}

/** Is this action forbidden for this product? */
export function isForbiddenAction(product: GovernedProduct, action: string): boolean {
  return BOUNDARIES[product].forbiddenActions.includes(action);
}

export type ForbiddenCheck =
  | { allowed: true }
  | {
      allowed: false;
      event: ForbiddenEvent;
      refusal: string;
      humanPath: string;
      action: string;
      product: GovernedProduct;
    };

/**
 * Non-throwing check, for routes that want to emit the audit event and return
 * a 403 rather than unwind. Prefer this in API handlers: the attempt must be
 * recorded, and an uncaught throw can skip the audit write.
 */
export function checkForbiddenAction(product: GovernedProduct, action: string): ForbiddenCheck {
  if (!isForbiddenAction(product, action)) return { allowed: true };
  const boundary = BOUNDARIES[product];
  return {
    allowed: false,
    event: boundary.event,
    refusal: boundary.refusal,
    humanPath: boundary.humanPath,
    action,
    product,
  };
}

/** Throwing variant, for service code where a forbidden call is a bug. */
export function assertActionAllowed(product: GovernedProduct, action: string): void {
  if (isForbiddenAction(product, action)) {
    throw new ForbiddenActionError(product, action);
  }
}
