# Pinavia Family Master PRD

Status: governing product decision document | Owner: Head of Product | Updated: 2026-08-02

## 1. Portfolio thesis

Pinavia is an endorsed house of brands: NexusAI is the governed intelligence core; Quorum, Meridian, Vantage, and Nucleus are buyer-specific product rooms, not separate platforms. The company decision and buyer map are recorded in `paperwork/Pinavia_Brand_and_Domain_Architecture.md`; the product rule is in `docs/USER_STRATEGY_AND_PIVOTS.md`.

Every entry starts with **readiness assessment → lane → inherited onboarding → first workflow pilot → governed value proof**. Generic signup is never the product start. Every consequential boundary requires a named human: Pinavia may prepare, cite, score, route, and draft; it may not autonomously write back, send externally, file, pay, make an HR action, sign, certify, submit, or make a legal/investment decision (`AGENTS.md`, `docs/APPROVAL_POLICIES_SPEC.md`).

## 2. Shared funnel and lanes

| Lane | Entry / value moment | Commercial route | Required proof before expansion |
|---|---|---|---|
| Evaluator / SME | Readiness result and sample source-backed brief | Free | Lane and first workflow chosen |
| SME self-serve | Small evidence bundle and owner brief | Pro waitlist at launch; Stripe only after pilot revenue | Evidence + reviewer loop where consequential |
| Business / advisory | Workflow scorer and sponsor-ready scope | Paid SOW pilot | Sponsor, accepted reviewer seat, evidence, shadow ROI |
| Regulated enterprise | Governed workspace and passport boundary | Scoping then paid SOW pilot | Sensitivity boundary, named reviewer, audit evidence, no-writeback acknowledgement |

The implementation persists readiness/lane context in `strategy_profiles`, identity-bound reviewer seats in `reviewer_seats`, scorer gates in `workflow_twin_runs`, and expand/hold/stop in `pilot_outcomes` (`apps/mission-control/db/schema.ts`). A recommendation with no evidence signal is shown as provisional, not blocked or disguised as certainty (`docs/WORKFLOW_TWIN_SCORER.md`).

## 3. Shared governance contract

Core governance is workspace-scoped evidence, confidence, sensitivity (`public/internal/confidential/restricted`), agent passports, audit events, reviewable recommendations, and human approvals (`apps/mission-control/db/schema.ts`; `docs/APPROVAL_POLICIES_SPEC.md`). The reviewer seat is real only after invitation acceptance binds it to a Clerk identity; declared name fields are not a substitute. Product rooms inherit this contract and may add scoped metadata, never a second identity/auth/database/runtime.

## 4. Core versus product-owned boundary

| Built once in NexusAI core | Owned by product room |
|---|---|
| Clerk identity/org, workspace tenancy, evidence/R2, Postgres/Drizzle, retrieval, model routing, audit, passports, approvals, readiness/lane, reviewer seats, workflow scoring, pilot outcomes, billing intent | Quorum board-cycle semantics; Meridian jurisdiction/requirement scope; Vantage deal/checklist semantics; Nucleus methodology/brand configuration |

`docs/API_SERVICE_BOUNDARY_DECISION.md` fixes the architecture as a modular monolith. No PRD may introduce a per-pivot runtime, database, authentication stack, checkout, or autonomous workflow engine.

## 5. AI policy

All AI surfaces use the typed policy in `apps/mission-control/lib/config/model-routing.ts` and the constraints in `docs/MODEL_ROUTING.md`: restricted data is excluded from experimental pools; sponsor-facing recommendations and decisions use premium finalization; low evidence causes refusal/escalation rather than a cheaper guess. AI may draft and cite; it must not decide, approve, execute, certify, file, submit, or send. Promotion from draft to trusted requires source coverage, a named reviewer decision, and a product eval threshold; thresholds not yet instrumented are OPEN, Head of Product + Engineering, 2026-08-16.

## 6. Commercial model

The binding sequence is free launch + Pro waitlist → pilot SOW revenue → Stripe self-serve (`docs/USER_STRATEGY_AND_PIVOTS.md`). The shared paperwork is `docs/PILOT_SOW_TEMPLATE.md`, `PILOT_ONBOARDING_CHECKLIST.md`, `PILOT_SUCCESS_SCORECARD.md`, and `PILOT_BILLING_TRIGGERS.md`. A product room changes the workflow, evidence list, reviewer role, outcome metric, and regulator/deal/board context—not the commercial rail.

## 7. Prioritisation rule

Investment goes first to NexusAI launch-critical gaps. A product room receives a staffed pilot slice only when it has (1) a named design partner and economic buyer, (2) one bounded workflow with source bundle and reviewer, (3) a route/data model/review path that is implemented and locally verified, and (4) a signed SOW hypothesis with a measurable ROI denominator. Regulated rooms additionally need a jurisdiction boundary and human approval path. This rule resolves the historic “reserve/build later” product-brand plan against newer code-backed pilot routes.

## 8. Release gates

| Gate | Date | Must be true |
|---|---:|---|
| Pilot-proof demo | 2026-08-16 | Current release preflight, public route smoke, one signed-in mutable workflow smoke, clear human authority boundary |
| Public launch | 2026-09-01 | NexusAI readiness/start-pilot path operationally verified; waitlist, not checkout; product-room claims limited to verified routes |
| Pilot signing | 2026-09-15 target | SOW, sponsor, accepted reviewer, evidence bundle, success scorecard, billing trigger, and named first workflow |

Use `docs/RELEASE_GATE_2026-07-07.md`, `docs/DEMO_RUNBOOK_REGULATED.md`, and `HANDOVER.md`; never infer operational verification from a local build.

## 9. Risks and open decisions

1. Signed-in mutable smoke is incomplete for several routes — mitigate with one controlled workspace per product; Engineering; 2026-08-16.
2. The live SHA observation gap remains in the handover — mitigate with deploy-SHA confirmation; Release owner; 2026-08-06.
3. Product-room breadth can outrun buyer evidence — apply investment rule; Product; continuous.
4. Stripe implementation exists in schema/webhook seams but checkout is not launch-approved — keep waitlist wording; Commercial; 2026-09-01.
5. Pilot-signing date is inferred, not founder-confirmed — Founder; 2026-08-05.

## 10. Immediate next steps

1. Confirm the pilot-signing date and first design partner.
2. Select one NexusAI pilot workflow and provision its controlled evidence bundle.
3. Complete reviewer-seat invite and signed-in mutable smoke.
4. Confirm deployed SHA and record release-gate evidence.
5. Let one pivot pass the investment rule; keep others as bounded pilot patterns.

## Investor / partner update

Pinavia is one governed intelligence core with five buyer-facing product rooms. Readiness routes buyers to a lane and a safe first workflow rather than a generic dashboard. Evidence, confidence, sensitivity, passports, audit, and human approval are shared once. NexusAI is the 30-day public-launch priority. Quorum, Meridian, Vantage, and Nucleus have code-backed pilot slices but are not independent platforms. No product autonomously acts, files, pays, sends, signs, or decides. Launch monetization is free plus Pro intent collection, followed by paid SOW pilots. Stripe checkout is post-pilot. The next proof is a signed-in, reviewer-bound, source-backed workflow. Product investment follows buyer evidence, not brand ambition.
