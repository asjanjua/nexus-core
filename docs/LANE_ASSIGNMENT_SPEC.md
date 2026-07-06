# Lane Assignment and Lane Lifecycle Specification

Status: Canonical spec for buyer-lane assignment, inheritance, and reclassification.
Implements the bridge in `docs/USER_STRATEGY_AND_PIVOTS.md`: readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot.
Last updated: 2026-07-06.

## 1. Principles

1.1. Readiness sets the initial lane. Onboarding adapts within that lane. Lane changes require explicit evidence, user or admin confirmation, and an audit note.

1.2. The lane is a starting contract, not a permanent prison. But changing it should be rare, explainable, and confirmed. No ambient auto-switching: onboarding answers never silently recalculate the lane.

1.3. Lane assignment runs server-side only (`lib/services/lane-assignment.ts`). The public client never decides its own buyer lane.

1.4. Regulated enterprise is sticky. Moving into it can be suggested by the system; moving out of it requires explicit user confirmation, because the human-approval and no-autonomous-writeback boundary depends on it. Those boundaries apply in every lane regardless.

## 2. Assignment Rules

Inputs: sector, company size, role (three optional dropdowns on the public `/readiness` page) plus the readiness band.

| Priority | Condition | Lane |
| --- | --- | --- |
| 1 | Sector in regulated set (`financial_services`, `healthcare`, `government_public`) | `regulated_enterprise` |
| 2 | Role in advisory set (`consultant`, `advisor`, `transformation_lead`) | `business_advisory` |
| 3 | Company size `51-200` or `200+` | `business_advisory` |
| 4 | Size `1-20` or `21-50` and band is not Emerging | `sme_self_serve` |
| 5 | Otherwise | `evaluator` |

Confidence: `high` when sector and size are both present, `medium` when one is present, `low` when neither. Every assignment carries a human-readable reason.

Tune thresholds here first, then in `lib/services/lane-assignment.ts` and `tests/lane-assignment.test.ts`.

## 3. Handoff (Anonymous to Authenticated)

3.1. `POST /api/readiness/submit` stores a pending record in `readiness_submissions` (migration 0033) with a single-use claim code. Only the SHA-256 hash is stored. TTL 72 hours.

3.2. Carry order: URL claim token primary (`/sign-up?readiness=<code>`), sessionStorage backup holding the token only, email lookup as manual recovery. The full readiness payload is never carried client-side.

3.3. `POST /api/readiness/claim` (authenticated) consumes the code atomically, writes the strategy profile (lane, initialLane, scores, band, sector, size, role, laneConfidence, externalRef = submission id), sets `governancePosture = regulated` for regulated_enterprise, and audits `readiness.claim_redeemed`.

3.4. Claims always write to the caller's own workspace. No workspaceId override is accepted anywhere in the strategy-profile surface.

## 4. Lane Lifecycle Fields

Stored on `strategy_profiles` (migration 0033):

| Field | Meaning |
| --- | --- |
| `buyerLane` | Current lane |
| `initialLane` | Lane assigned at claim; write-once |
| `laneChangeReason` | Free-text reason, required for any change |
| `laneConfidence` | high / medium / low at assignment |
| `laneChangedBy` | `system_suggestion`, `user_confirmation`, or `admin_override` |
| `laneChangedAt` | Timestamp of last change |

## 5. Permitted Lane-Change Events (V1)

- User states company size or compliance needs were captured wrongly.
- Readiness confidence is low and onboarding provides better signal.
- Onboarding reveals regulated workflow requirements (system may suggest moving up; user confirms).
- User explicitly selects a different path.
- Admin or operator override.

Every change records reason, actor type, and timestamp, and appears in the audit trail. The reclassification checkpoint lives in the onboarding wizard (profile confirmation stage). There is no other in-product lane switch in V1.

5.1. **Server-side enforcement.** These rules are enforced by `PATCH /api/strategy-profile`, not only by wizard UI:

- A lane change on an existing profile without a substantive reason (minimum 8 characters) fails with `lane_change_reason_required`.
- Leaving `regulated_enterprise` without `regulatedExitConfirmed: true` fails with `regulated_exit_confirmation_required`.
- On any accepted lane change the server defaults `laneChangedBy` to `user_confirmation` and stamps `laneChangedAt` if missing.
- The `strategy_profile_updated` audit event carries `oldBuyerLane`, `newBuyerLane`, `laneChangeReason`, `laneChangedBy`, `laneChangedAt`, and `regulatedExitConfirmed` when present.

Pinned by `tests/strategy-profile-authz.test.ts` and `tests/strategy-profile-repository.test.ts`.

## 6. Funnel Instrumentation

The audit events `readiness.assessment_submitted` (with assignedLane) and `readiness.claim_redeemed` make the "buyer lane assigned" and "workspace provisioned with readiness context" funnel stages in `docs/USER_STRATEGY_AND_PIVOTS.md` measurable.

## 7. Open Items

- Pruning job for expired or consumed `readiness_submissions` rows.
- Product email carrying the claim link (Resend path per the email boundary).
- Mission Control surface showing lane, band, sponsor, reviewer post-onboarding.
- In-product workflow scorer as the pilot bridge (see `docs/WORKFLOW_TWIN_SCORER.md`).
