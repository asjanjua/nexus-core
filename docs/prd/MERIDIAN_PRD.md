# Meridian PRD — Regulatory Workflow

Status: bounded regulated-enterprise pilot pattern | Owner: Product + Compliance | Updated: 2026-08-02

## 1. Executive summary

1. Meridian serves compliance, licensing, and regulatory-submission teams.
2. Value is an evidence-coverage/gap view and reviewer-ready filing pack draft.
3. It wins through citations, jurisdiction scope, sensitivity, and hard human stops.
4. Its primary lane is regulated enterprise; advisory is a secondary route.
5. It never files, certifies, submits, or states a regulatory conclusion.
6. `/meridian`, `/meridian/scope`, `/meridian/license-profile`, `/meridian/evidence-coverage`, and `/meridian/filing-pack` exist as protected routes (`HANDOVER.md`).
7. `meridian_scope` is an implemented persisted object (`db/schema.ts`).
8. Signed-in scope/save/evidence smoke is still required before operational claims.
9. It shares core identity, evidence, routing, reviewer, audit, and approvals.
10. It owns jurisdiction, regulator, license, requirement, and filing-context semantics.

## 2. Problem and user

Compliance leads assemble an application/return from scattered policies, evidence, advisers, and deadlines. The economic buyer is the accountable executive; the reviewer is compliance/legal/counsel. For Pakistan examples the relevant regulator may be SECP or SBP; Meridian must capture the actual authority and fear: an unsupported, incomplete, or unauthorized filing. Other jurisdictions are not implied.

## 3. Positioning and wedge

First pilot: scope a specific jurisdiction/license objective → map supplied evidence to requirements → identify gaps → prepare a review pack. Alternatives are spreadsheets, shared drives, counsel, and regulatory workflow tools. Meridian is not a filing portal, legal-advice engine, system of record, or submission agent.

## 4. Scope

| Horizon | Scope |
|---|---|
| V-now | Meridian hub/scope/profile/evidence coverage/filing-pack routes and `meridian_scope`; regulatory requirement library (`lib/domain/regulatory-requirement-library.ts`) |
| V-pilot | NEW: jurisdiction-pack versioning, requirement-review decisions, counsel sign-off record, export provenance manifest |
| V-launch+1 | NEW: approved regulator-specific pack only after counsel/design-partner validation |

## 5. Journeys

Meridian landing/readiness → regulated lane → onboarding inherits profile → compliance owner scopes jurisdiction, regulator, license, objective, deadline and reviewer → authorized evidence upload → gap map → draft pack → counsel/compliance review → human decides filing/stop → value proof. Missing evidence creates a gap, never a fabricated completion. No accepted reviewer prevents pilot-ready. A stopped pilot records why; Meridian sends and files nothing.

## 6. Data and governance

Existing `meridian_scope` plus core evidence/reviewer/approval/audit records are sufficient for the current scope arc. NEW for pilot: requirement-pack version, review decision, and counsel-approval metadata. Information is confidential/restricted by default. Scope write is owner-controlled; gap/pack output is draft; only authorized humans may export, certify, or file outside Nexus.

## 7. AI surfaces

Coverage analysis uses a high-quality sponsor-facing policy route plus retrieval; pack narrative uses `recommendation_finalization`/`decision_memo` with premium finalization where policy requires. AI may map user-selected requirements to provided evidence and call out gaps; it must not interpret law as advice, certify completeness, or file. Trusted status needs material requirement-to-source coverage and named compliance/counsel review. Baseline unmeasured — Compliance owner, 2026-08-16.

## 8. Commercial model

Entry: governed scoping. Pilot: one jurisdiction/license objective and evidence bundle, priced through an SOW rather than checkout. Expansion: a validated pack/routine after reviewer scorecard proof. Core paperwork changes only for regulator, scope, counsel/reviewer, deadline, permitted evidence, and filing boundary.

## 9. Metrics

Shared funnel plus scoped-object completion, requirement evidence coverage, unresolved critical gaps, reviewer turnaround, and time-to-review pack. Baselines unmeasured.

## 10. Risks and open decisions

Map vs territory: scope and handoff routes are implemented; no legal conclusion or filing capability is live. Risks: regulator-specific accuracy, confidential evidence, scope creep, ambiguous authority, and unverified mutable flow. Mitigate with jurisdiction packs, restricted access, one-object SOW, counsel hard stop, and signed-in smoke. OPEN: first jurisdiction/design partner and counsel standard by 2026-08-16.

## 11. Release gates

Demo: authorized synthetic evidence and explicit no-filing boundary. Launch: describe Meridian as governed workflow intelligence, not submission automation. Pilot signing: named regulator/objective, reviewer/counsel, source boundary, SOW and success metric.

## Immediate next steps

1. Choose one jurisdiction/license pilot.
2. Confirm counsel review standard.
3. Run signed-in scope-to-gap smoke.
4. Define pack-version/counsel metadata.
5. Sign a bounded SOW.

## Partner update

Meridian makes regulatory evidence coverage and review visible; it does not automate a filing. The product has protected scope and review-pack routes plus a persisted scope object. Its first pilot is one specific regulator, objective, evidence bundle, and accountable reviewer. Every output is source-backed draft material. Compliance or counsel retains decision, certification, and submission authority. The current gap is signed-in mutable proof and regulator-specific validation. Launch claims will remain limited to the governed workflow. Expansion waits for a scored pilot. No independent Meridian infrastructure is required.
