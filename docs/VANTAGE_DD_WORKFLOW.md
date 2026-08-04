# Vantage DD Workflow

Status: Domain-owned workflow plan, added 2026-07-06.

Vantage is the due-diligence and deal-intelligence vertical. It should not inherit Meridian's regulatory filing lifecycle or Quorum's board lifecycle. Its workflow is built around the deal room, diligence coverage, red flags, advisor judgment, and investment committee handoff.

This is product planning, not investment, legal, accounting, or regulatory advice. Vantage should support the deal team and investment committee; it must not make the investment decision.

## Source Of Truth

- Code registry: `apps/mission-control/lib/vantage-dd-workflow.ts`
- Tests: `apps/mission-control/tests/vantage-dd-workflow.test.ts`
- DD checklist library: `apps/mission-control/lib/domain/dd-checklist-library.ts`
- Figma exploration: `10 Pivot Workflow Builds V0.1`, node `82:3` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=82-3
- Cross-vertical input/action Figma board: `11 Vertical Input Action Screens V0.2`, node `87:3` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=87-3
- Full Vantage workflow build: `32 Vantage Full Workflow / 2026-07-29`, node `230:2` — https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=230-2. Twelve editable 1440x900 desktop frames, design-only until their route, deal data model, permissions, audit events, and tests are implemented and verified.

## Product Boundary

The shared Nexus engine handles ingestion, evidence, source confidence, governance, agents, billing, and approvals. Vantage owns the deal workflow: how a data room becomes coverage insight, red-flag judgment, and an IC memo handoff.

Vantage must not label a deal as approved, investable, rejected, legally cleared, or risk-free.

## Global Use Model

Vantage should expand through market and sector packs, not through a single hardcoded fintech M&A checklist.

Every global market pack must define:

| Requirement | Why it matters |
|---|---|
| Buyer and target market | Cross-border deals need buyer country, target country, operating countries, currency, language, and data-room access assumptions separated. |
| Sector risk overlay | Fintech, healthcare, SaaS, financial institutions, infrastructure, and professional services have different diligence workstreams and red-flag patterns. |
| Local advisor review | Legal, tax, regulatory, accounting, technical, and commercial findings should expose the responsible human reviewer before IC handoff. |
| Materiality thresholds | A red flag's importance depends on deal size, buyer mandate, jurisdiction, regulated activity, and committee tolerance. |
| Data-room localization | Global deal rooms may include multilingual documents, local accounting formats, local registry extracts, and jurisdiction-specific evidence. |
| Decision authority boundary | Vantage can draft evidence-backed analysis, but the investment committee or authorized buyer body owns the decision. |

These requirements are encoded in `vantageMarketPackRequirements`.

## Screen Guidance

The code registry defines `vantageScreenGuidance` and `guidanceForVantageScreen()`. This is the source for the Figma input/action review board and for future route copy when Vantage screens are implemented.

For each Vantage screen, the guidance must show:

- user input needed from the deal team or advisor
- action points that move diligence forward
- the decision-authority boundary that keeps investment decisions with the IC or authorized buyer body

When a new Vantage screen is added, add its guidance and test coverage in the same change.

## Workflow Arcs

| Arc | Why it exists |
|---|---|
| Dealroom | Define deal type, target, buyer thesis, workstreams, owners, deadline, and data-room inventory. |
| Coverage | Map the diligence checklist to evidence and test whether each match is decision-useful. |
| Redflags | Separate missing evidence from actual risk, capture materiality, mitigants, owner follow-up, and advisor judgment. |
| Memo | Draft IC memo sections and package decision questions with source-backed caveats. |

## Planned Screens

| Screen | Arc | Candidate route | Purpose |
|---|---|---|---|
| Deal Room Setup | Dealroom | `/vantage/dealroom` | Capture deal type, target profile, buyer thesis, workstream owners, diligence deadline, and data-room scope. |
| Data Room Index | Dealroom | `/vantage/data-room` | Organize uploaded and connected materials by workstream, sensitivity, source, and review status. |
| Workstream Plan | Dealroom | `/vantage/workstreams` | Make each diligence workstream scannable with accountable owner, reviewer, key question, due date, dependency, and escalation state. |
| Checklist Coverage | Coverage | `/vantage/coverage` | Map checklist items to evidence across financial, regulatory, legal, technology, data, and people workstreams. |
| Evidence Depth | Coverage | `/vantage/evidence-depth` | Surface document age, source quality, unresolved questions, and decision-usefulness. |
| Question Tracker | Coverage | `/vantage/questions` | Turn missing or ambiguous evidence into linked, owner-named questions with response and escalation history. |
| Red Flag Workbench | Redflags | `/vantage/red-flags` | Route issues to quantify, request, escalate, or park. |
| Advisor Judgment Log | Redflags | `/vantage/judgment-log` | Record materiality, mitigation, caveats, and human recommendation posture. |
| Mitigation & Conditions | Redflags | `/vantage/mitigations` | Make proposed mitigations and conditions inspectable through owner, evidence, deadline, dependency, and IC visibility. |
| IC Memo Builder | Memo | `/vantage/ic-memo` | Draft IC sections from coverage, red flags, citations, advisor notes, and caveats. |
| Decision Handoff | Memo | `/vantage/decision-handoff` | Package memo, unresolved items, approval questions, source index, and next steps. |
| Deal Archive | Memo | `/vantage/archive` | Retain the deal scope, evidence, questions, flags, judgments, memo versions, decision handoff, retention and access record. |

## Usability Rules For The Full Screen Set

- Keep the four lifecycle arcs visible in the left navigation, but put operational work into compact queues with owner, date, status, and direct next action rather than deep nested views.
- Show coverage and evidence depth separately. A document match is not a conclusion that the evidence is decision-useful.
- Keep questions, red flags, advisor judgement, and mitigations as separate objects. This avoids turning an incomplete data room into an undifferentiated risk list.
- Preserve the buyer thesis, deadline, workstream owner, and IC relevance in each downstream screen so users do not lose deal context while moving through the workflow.
- On memo and handoff screens, show open items and the named decision authority next to the primary action. Never provide an approve/reject/investable CTA.

## Current Executable Slice

`/vantage/coverage` is now a protected, executable Coverage screen. A diligence manager selects a supported deal checklist and optional review reference, then runs the existing `vantage_diligence_analysis` skill against processed, governed workspace evidence. The screen renders coverage, evidence gaps, critical gaps, passport exclusions, cited sample requirements, and priority evidence requests.

The screen deliberately does not surface the engine's internal recommendation label as an investment conclusion. It keeps the decision boundary visible: coverage is an evidence fact; materiality and any investment decision belong to named humans.

## Next Implementation Slice

Build the preceding deal-room setup, then the remaining downstream routes:

1. Create `/vantage/dealroom` with persisted deal type, target, thesis, owners, deadline, and data-room scope.
2. Feed that saved deal context into `/vantage/coverage` instead of requiring a per-run checklist choice.
3. Add `/vantage/red-flags` for human materiality, owner follow-up, and advisor judgment.
4. Add `/vantage/ic-memo` and `/vantage/decision-handoff` after those human-review objects exist.

## Runtime Safety

Keep `vantageScreensForStage()` strict for tests and registry authors. It should throw when a stage references a deleted or missing screen.

When route code starts using the registry, prefer `safeVantageScreensForStage()`. It logs missing draft screens and renders the screens that still exist, so Vantage pages can degrade gracefully during workflow expansion.

## Validation Boundaries

- Vantage supports advisor judgment; it does not make the investment decision.
- Every recommendation posture should identify the human reviewer and material caveats.
- IC memo sections must cite evidence and checklist context rather than presenting ungrounded synthesis.
