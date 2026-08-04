# Pinavia Vertical Product Screen Plans

Status: Design and product architecture plan. Route names beyond existing surfaces are planned, not implemented.

Last updated: 2026-07-29.

This is the implementation companion to the per-product workflow documents. It deliberately avoids a shared workflow template: Quorum, Meridian, Vantage, and Nucleus are separate products with distinct users, authority models, and commercial boundaries. They share Nexus Core only for ingestion, evidence, provenance, governance, agents, identity, and billing.

## Figma Source

Editable design board: [30 Vertical Product Screen Plans / 2026-07-29](https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=222-2).

| Product | Figma frame | Screen count |
|---|---:|---:|
| Quorum | `222:3` | 17 |
| Meridian | `222:121` | 12 |
| Vantage | `222:209` | 12 |
| Nucleus | `222:297` | 12 |

Every designed screen must make four things legible: accountable human, evidence state, next governed action, and the relevant authority boundary.

## Shared Delivery Rules

- A screen is `planned` until its route, persistence, permissions, audit events, and tests exist.
- Use domain-owned objects. Do not homogenize board records, regulatory requirements, deal findings, and consulting deliverables into a generic workflow item.
- Carry forward the core evidence contract: source, freshness, confidence, access scope, provenance, and unresolved caveats.
- Carry the extended evidence lifecycle contract too: validity period, supersession relationship, downstream impact, acknowledgement, retention, legal hold, and export-on-exit state. See `docs/VERTICAL_PRODUCT_TRUST_AND_FAILURE_CONTRACT.md`.
- Drafting and packaging may be assisted. Statutory, fiduciary, investment, and client-advice acts remain human actions with named accountability.
- Build slices that start with context, permit evidence work, expose control points, and end with a human handoff or durable record.
- Evidence is workspace-scoped by default. Cross-product reuse requires an explicit named-owner share action with recipient room, purpose, classification, expiry, and an audit event; it is never implied by the shared Nexus Core.

## Quorum: Board Governance Record

**Users:** board secretary, chair, directors, governance lead, CEO, committee chair.

**Outcome:** a source-backed board and committee lifecycle from legal/policy setup through a durable authenticated record.

**Boundary:** Quorum may prepare packs, prompts, minutes, and action registers. It must not determine legal validity, approve for directors, sign, file, or make minutes final automatically.

| Arc | Screen | Candidate route | Primary governed action |
|---|---|---|---|
| Setup | Jurisdiction & Entity Setup | `/board/setup` | Select entity, overlays, source pack, secretary. |
| Setup | Board Register | `/board/register` | Check composition, appointments, terms. |
| Setup | Committee & TOR Register | `/board/committees` | Confirm mandate, membership, chair, quorum. |
| Setup | Policy & Authority Library | `/board/policies` | Map reserved matters and signing authority. |
| Setup | Annual Meeting Calendar | `/board/calendar` | Plan cadence and dependencies. |
| Meeting | Agenda Builder | `/board/agenda` | Set outcome, owner, authority and conflict route. |
| Meeting | Board Pack Builder | `/board/pack` | Resolve evidence, freshness, and pack deltas. |
| Meeting | Director Pre-Read | `/board/pre-read` | Collect questions, clarifications, disclosures. |
| Meeting | Attendance & Quorum | `/board/quorum` | Check attendance and recusal impact. |
| Meeting | Conflict Declaration | `/board/conflicts` | Record disclosures before deliberation. |
| Meeting | Committee Recommendation | `/board/committee-recommendations` | Carry committee advice into board authority. |
| Meeting | Decision & Vote Capture | `/board/decisions` | Record resolution, conditions, deferrals, actions. |
| Meeting | Circular Resolution | `/board/circular-resolutions` | Track circulation and later meeting noting. |
| Record | Minutes Workspace | `/board/minutes` | Draft source-linked minutes. |
| Record | Chair Authentication | `/board/minutes/review` | Route formal human record review. |
| Record | Action Register | `/board/actions` | Assign, escalate, and carry actions forward. |
| Record | Governance Record | `/board/record` | Retain the approved record and audit trail. |

**Build order:** setup/registers -> calendar/agenda -> pack/pre-read -> quorum/conflicts/decisions -> minutes/actions/record.

**Global pack:** versioned jurisdiction, entity-type, regulator, company-articles, and policy packs with official sources, effective dates, local counsel/company-secretary review, and transparent confidence.

## Meridian: Regulatory Readiness and Filing Preparation

**Users:** compliance lead, regulatory counsel, license applicant, CRO/CCO, filing coordinator.

**Outcome:** a reviewed regulatory evidence pack that distinguishes missing proof from a substantive gap and hands submission to an authorized human.

**Boundary:** Meridian must never file, submit, certify, sign, or present an automated legal/regulatory conclusion as specialist advice.

| Arc | Screen | Candidate route | Primary governed action |
|---|---|---|---|
| Scope | Regulatory Scope | `/meridian/scope` | Set jurisdiction, regulator, license, objective. |
| Scope | License Profile | `/meridian/license-profile` | Confirm entity, ownership, activities, posture. |
| Evidence | Requirement Library | `/meridian/requirements` | Review applicable official requirements. |
| Evidence | Evidence Coverage | `/meridian/evidence-coverage` | Map requirements to citations and evidence. |
| Evidence | Evidence Request Desk | `/meridian/evidence-requests` | Request named missing artifacts. |
| Gap | Gap Triage | `/meridian/gaps` | Assign severity, owner, deadline. |
| Gap | Caveat Register | `/meridian/caveats` | Preserve legal, evidence, management caveats. |
| Gap | Reviewer Workspace | `/meridian/review` | Record qualified challenge and disposition. |
| Filing | Submission Memo | `/meridian/submission-memo` | Draft source-backed narrative for review. |
| Filing | Filing Pack | `/meridian/filing-pack` | Assemble approved export materials. |
| Filing | Human Filing Handoff | `/meridian/filing-handoff` | Confirm authorized filer, channel, status. |
| Filing | Pack Archive | `/meridian/archive` | Preserve versions, sources, sign-off, submission evidence. |

**Build order:** scope/license -> requirements/evidence -> requests/gaps/caveats/review -> memo/pack/human filing handoff -> archive.

**Global pack:** versioned jurisdiction/regulator packs, applicability logic, official sources with effective dates, controlled translation, local specialist review, and country-specific filing-channel rules.

## Vantage: Diligence Intelligence and IC Handoff

**Users:** corporate development lead, PE/VC deal team, transaction advisor, IC sponsor, functional diligence owners.

**Outcome:** an evidence-backed IC handoff where coverage, risk, mitigants, and advisor judgment are distinct rather than hidden in an opaque score.

**Boundary:** Vantage must not label a deal approved, investable, rejected, legally cleared, or risk-free. The advisor owns judgment; the IC or authorized buyer body owns the decision.

| Arc | Screen | Candidate route | Primary governed action |
|---|---|---|---|
| Dealroom | Deal Room Setup | `/vantage/dealroom` | Capture thesis, target, owners, deadline. |
| Dealroom | Data Room Index | `/vantage/data-room` | Classify source, sensitivity, workstream. |
| Dealroom | Workstream Plan | `/vantage/workstreams` | Assign diligence requests and leads. |
| Coverage | Checklist Coverage | `/vantage/coverage` | Show covered, missing, critical unknowns. |
| Coverage | Evidence Depth | `/vantage/evidence-depth` | Test freshness, source quality, usefulness. |
| Coverage | Question Tracker | `/vantage/questions` | Route company/advisor follow-up. |
| Red Flags | Red Flag Workbench | `/vantage/red-flags` | Separate risk from absent evidence. |
| Red Flags | Advisor Judgment Log | `/vantage/judgment-log` | State materiality, posture, caveats. |
| Red Flags | Mitigation & Conditions | `/vantage/mitigations` | Track mitigants and condition-precedent options. |
| Memo | IC Memo Builder | `/vantage/ic-memo` | Draft cited IC material. |
| Memo | Decision Handoff | `/vantage/decision-handoff` | Package questions for decision authority. |
| Memo | Deal Archive | `/vantage/archive` | Preserve diligence basis and decision record. |

**Build order:** dealroom/workstreams -> coverage/depth/questions -> red flags/mitigations/judgment -> IC memo/handoff -> archive.

**Global pack:** buyer/target/operating-country context, sector overlays, multilingual sources, local advisor ownership, configurable materiality thresholds, and data-room access controls.

## Nucleus: White-Label Governed Advisory Delivery

**Users:** managing partner, practice lead, engagement manager, consultant, partner reviewer, client sponsor.

**Outcome:** a partner-owned advisory platform that turns a method into a controlled client engagement without weakening provenance, review, or client-facing caveats.

**Boundary:** Nucleus may draft and organize. The advisory firm remains responsible for recommendations, reviewer approval, and client-facing conclusions. It must never conceal source coverage, reviewer status, unresolved caveats, or fixed trust semantics.

**Client attribution:** every client-facing Nucleus surface must carry a non-overridable trust footer: `Delivered by {firm}. Recommendations and client-facing conclusions are the firm's, not the platform's.`

| Arc | Screen | Candidate route | Primary governed action |
|---|---|---|---|
| Profile | Firm Profile & Brand | `/nucleus/profile` | Configure allowed brand layer and trust contract. |
| Profile | Methodology Catalog | `/nucleus/methodologies` | Define reusable method packs and gates. |
| Profile | Team & Reviewer Model | `/nucleus/team` | Set delivery/review roles and rights. |
| Package | Engagement Intake | `/nucleus/engagement-intake` | Convert mandate into scoped engagement. |
| Package | Evidence Room Template | `/nucleus/evidence-room` | Create request lists and quality rules. |
| Package | Delivery Plan | `/nucleus/delivery-plan` | Set milestones, owners, client visibility. |
| Delivery | Deliverable Builder | `/nucleus/deliverable-builder` | Draft with citations, caveats, open questions. |
| Delivery | Reviewer Console | `/nucleus/reviewer-console` | Resolve partner review and changes. |
| Delivery | Client Question Desk | `/nucleus/client-questions` | Manage client-facing questions and replies. |
| Assurance | Client Portal Preview | `/nucleus/client-portal` | Preview exactly what client sees. |
| Assurance | Operating Pack Publish | `/nucleus/publish` | Release controlled branded workspace. |
| Assurance | Platform Assurance | `/nucleus/assurance` | Review audit, billing, support posture. |

**Build order:** firm/method/team -> engagement/evidence/delivery plan -> deliverable/review/questions -> preview/publish/assurance.

**Global pack:** distinguish overridable brand (logo, accent, typeface, methodology) from fixed trust mechanics (status semantics, provenance, approval boundaries, audit labels, consequence previews).

## Family Build Order

1. Build the shared authority gate, consequence preview, provenance strip, access-denied state, evidence-supersession state, audit-event schema, and forbidden-action tests before any drafting/export surface.
2. Preserve and extend existing runnable surfaces: Quorum `/board`, Meridian scope/evidence work, Vantage `/vantage/coverage`, Nucleus registry.
3. Build upstream setup/context screens for Meridian, Vantage, and Nucleus so downstream analysis attaches to persisted domain objects.
4. Add review/handoff screens before exports or customer-facing publishing, then add correction/dispute/closeout screens before a vertical is pilot-ready.
5. Add durable permissions, retention/legal-hold rules, evidence versioning, and cross-product-sharing control before presenting a vertical as pilot-ready.
6. Promote a designed route into its domain workflow registry and tests in the same pull request.
