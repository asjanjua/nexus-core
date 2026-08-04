# Nucleus Governed Advisory Delivery Workflow

Status: Domain-owned workflow and Figma design baseline. Candidate routes are not implemented product claims until their domain model, permissions, audit events, tests, and production verification exist.

Last updated: 2026-07-29.

Nucleus is the white-label governed advisory-delivery product. It helps an advisory firm turn its methodology into an accountable client engagement without allowing brand customization to weaken evidence provenance, review boundaries, client visibility controls, or auditability.

This is product planning, not professional advice. The advisory firm remains responsible for its recommendations, professional standards, reviewer approvals, and client-facing conclusions.

## Source Of Truth

- Code registry: `apps/mission-control/lib/nucleus-engagement-workflow.ts`
- Tests: `apps/mission-control/tests/nucleus-engagement-workflow.test.ts`
- Existing reference build: `19 Nucleus Rebuilt`, node `108:2` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=108-2
- Full workflow build: `33 Nucleus Full Workflow / 2026-07-29`, node `232:2` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=232-2. Twelve editable 1440x900 desktop frames.

## Product Boundary

The shared Nexus Core supplies ingestion, evidence, provenance, governance, identity, agents, billing, and audit primitives. Nucleus owns the partner workflow: firm configuration, method-pack assembly, client engagement delivery, reviewer control, client-safe preview, controlled publication, and platform assurance.

Nucleus can draft and organize. It must not replace professional judgement, silently publish client output, conceal an unresolved caveat, or alter the fixed trust semantics beneath a partner brand.

## Brand Contract

| Overridable by partner | Contractually fixed |
|---|---|
| Logo, accent, typeface, cover style, practice model, method-pack language | Status vocabulary, AI provenance, source/evidence patterns, reviewer state, approval boundaries, consequence previews, audit labels |

The client experience may feel native to the partner firm. The meaning of `AI draft`, `reviewed`, `missing evidence`, `blocked`, and `published` must remain stable across every branded deployment.

Every client-facing surface must also carry a non-overridable trust footer: `Delivered by {firm}. Recommendations and client-facing conclusions are the firm's, not the platform's.`

## Workflow Arcs

| Arc | Product purpose |
|---|---|
| Firm | Configure permitted brand layer, repeatable methodology, and accountable team/reviewer model. |
| Method pack | Convert a client mandate into scoped intake, evidence requests, and delivery gates. |
| Delivery | Draft outputs with sources and caveats; route review and client questions without leaking internal work. |
| Assurance | Preview the exact client surface, publish only with partner authority, then maintain access, support, freshness, and audit posture. |

## Full Screen Set

| Screen | Arc | Candidate route | Primary user outcome |
|---|---|---|---|
| Firm Profile & Brand | Firm | `/nucleus/profile` | Configure a recognizable partner experience while seeing the fixed trust contract. |
| Methodology Catalog | Firm | `/nucleus/methodologies` | Define reusable method packs, deliverables, evidence standards, and review gates. |
| Team & Reviewer Model | Firm | `/nucleus/team` | Assign who can draft, review, publish, support, and view. |
| Engagement Intake | Method pack | `/nucleus/engagement-intake` | Turn the mandate into scope, sponsor, exclusions, context, milestones, and accountable owner. |
| Evidence Room Template | Method pack | `/nucleus/evidence-room` | Generate focused, client-safe evidence requests with quality and citation rules. |
| Delivery Plan | Method pack | `/nucleus/delivery-plan` | Keep milestones, dependencies, review gates, and client visibility in one operational view. |
| Deliverable Builder | Delivery | `/nucleus/deliverable-builder` | Draft source-backed deliverables with AI provenance, open questions, and caveats visible. |
| Reviewer Console | Delivery | `/nucleus/reviewer-console` | Give partners a named, accountable queue for review decisions and changes. |
| Client Question Desk | Delivery | `/nucleus/client-questions` | Manage client questions and replies without exposing internal notes or unreviewed analysis. |
| Client Portal Preview | Assurance | `/nucleus/client-portal` | Inspect exactly what clients will see before publication. |
| Operating Pack Publish | Assurance | `/nucleus/publish` | Run controlled partner sign-off, client-access, support, and release checks. |
| Platform Assurance | Assurance | `/nucleus/assurance` | Review source freshness, support, access, billing posture, and scheduled partner checks after launch. |

## Usability Rules

- Keep the four arcs visible, but present day-to-day work as compact queues with owner, deadline, evidence/review state, and one direct next action.
- Preserve the client mandate, named partner, method pack, delivery deadline, and client-visibility state across every downstream screen; users should not have to reconstruct context from another tab.
- Treat internal drafts, client-safe drafts, reviewer comments, and published material as distinct states. A client view must never be inferred from internal completion.
- Put citations, caveats, open questions, and AI provenance adjacent to the deliverable claim they qualify, not in an abstract audit page.
- Keep partner review and client publication as separate, named human actions. A completed review must not silently publish an output.
- Make client questions a controlled workflow with explicit visibility rather than letting untracked email threads become the delivery system.
- Use the Portal Preview as the final exposure check: it must make internal-only data, source disclosure, reviewer state, and allowed client actions clear before release.

## Implementation Sequence

1. Persist firm profile, brand contract, methodology catalog, team roles, and reviewer rights.
2. Implement engagement intake, evidence templates, and delivery plan against a durable engagement object.
3. Implement deliverable drafts, source/caveat links, reviewer queue, and client-question visibility boundary.
4. Add portal preview, explicit publish event, client access management, support/billing owner, and audit events.
5. Test fixed trust semantics independently of partner branding. A customization test must prove that status, provenance, approval, and audit patterns cannot be relabeled or bypassed.

## Validation Boundaries

- Nucleus is not a substitute for the partner firm’s professional judgement or client responsibility.
- A partner reviewer owns the acceptance of client-facing advice; Nucleus cannot approve on the firm’s behalf.
- Publication requires an explicit authorized human action and a durable audit event.
- Client portals must show only controlled client-safe content, with unresolved caveats, source coverage, and reviewer state handled according to the agreed client experience.
