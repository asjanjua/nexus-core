# Vantage PRD — Deal Diligence

Status: bounded advisory/deal pilot pattern | Owner: Product + Deal advisory | Updated: 2026-08-02

## 1. Executive summary

1. Vantage serves deal teams, PE/VC investors, and transaction advisers.
2. Value is a cited diligence coverage/gap view and reviewer-ready IC handoff.
3. It wins by separating missing evidence from a risk and preserving caveats.
4. Its lanes are business/advisory and regulated enterprise where deal data warrants it.
5. It competes with spreadsheets, data rooms, analysts, and diligence providers.
6. `/vantage`, `/vantage/coverage`, and `/vantage/red-flags` are code-backed protected routes (`HANDOVER.md`).
7. The typed DD checklist is implemented in `lib/domain/dd-checklist-library.ts`.
8. The native analysis endpoint exists; signed-in controlled-evidence proof remains required.
9. It shares NexusAI core infrastructure and governance.
10. It owns deal/checklist/workstream/IC semantics, never the investment decision.

## 2. Problem and user

Deal managers and advisors must find material gaps in a compressed data-room timetable. The IC sponsor fears missed red flags, unsupported conclusions, confidentiality breach, and decision records that blur adviser judgment with AI. The practical alternative is spreadsheet + analyst, with data rooms and specialist advisers.

## 3. Positioning and wedge

First pilot: bounded data-room evidence → checklist coverage → gap/red-flag triage → cited IC draft → named adviser/IC review. Vantage does not replace the data room, provide legal/tax/accounting advice, send requests, or recommend/execute an investment.

## 4. Scope

| Horizon | Scope |
|---|---|
| V-now | `/vantage`, `/vantage/coverage`, `/vantage/red-flags`, `vantage_diligence_analysis`, and typed checklist library |
| V-pilot | NEW: deal object, checklist-run version, issue classification/reviewer judgment, controlled data-room ingest policy |
| V-launch+1 | NEW: approved IC export templates and workstream collaboration after proof |

## 5. Journeys

Readiness/Vantage landing → advisory/regulated lane → sponsor and reviewer → controlled data-room subset → coverage analysis → human distinguishes evidence gap/risk → cited handoff draft → adviser/IC review → shadow ROI → expand/stop. No sources yields coverage gaps, not a risk conclusion. No reviewer means no pilot-ready state. Reviewer rejection returns an annotated draft; a stopped engagement is recorded and is never automatically retained/deleted.

## 6. Data and governance

Core evidence, sensitivity, reviewer, workflow, approval, audit, and outcome records cover the V-now route. NEW: `deal`, `diligence_checklist_run`, `finding_classification`, and decision-usefulness review. Treat deal-room material as confidential/restricted. The IC/adviser owns materiality and all external evidence requests or investment decisions.

## 7. AI surfaces

The native Vantage analysis maps evidence to checklist coverage; narrative handoff uses the premium sponsor-facing recommendation/decision policy with configured fallback. AI may extract, compare, cite, classify provisionally, and draft caveated sections; it must not declare a red flag material, issue advice, or decide. Trusted output needs cited checklist coverage, explicit unknowns, and named adviser/IC review. Baseline unmeasured — Deal advisory owner, 2026-08-16.

## 8. Commercial model

Entry is a scoped diligence discovery. Pilot is one deal/workstream and fixed evidence window via SOW; expansion is additional workstreams or deal cycles after coverage/turnaround proof. Change core paperwork for deal confidentiality, reviewer/IC owner, source-window, permitted workstreams, and success metric. No checkout at launch.

## 9. Metrics

Shared funnel plus checklist coverage, critical unknowns resolved, citation coverage, reviewer turnaround, and analyst hours saved. Baselines unmeasured.

## 10. Risks and open decisions

Map vs territory: a code-backed coverage route exists; an operationally verified real deal-room result does not. Risks: privilege/confidentiality, false red-flag certainty, scope explosion, poor source quality, and adviser non-adoption. Mitigate with controlled source scope, provisional labels, one-workstream SOW, evidence gaps, and reviewer gate. OPEN: first design-partner workstream by 2026-08-16.

## 11. Release gates

Demo uses authorized synthetic evidence. Launch claims a governed coverage pilot only. Pilot signing requires named deal sponsor/reviewer, workstream, source scope, SOW, and scorecard.

## Immediate next steps

1. Select one workstream/design partner.
2. Define deal/checklist-run schema.
3. Run evidence-to-coverage signed-in smoke.
4. Validate handoff with an adviser.
5. Agree ROI denominator.

## Partner update

Vantage is a governed diligence coverage and review room. It helps teams see which checklist requirements have evidence and which do not, without treating missing material as a proven risk. Protected routes and a typed checklist exist; controlled signed-in proof is next. Vantage shares the NexusAI trust core and adds deal semantics only. An adviser and IC retain all materiality and investment authority. The first pilot is one workstream with a named reviewer and controlled evidence. Every handoff is cited and caveated. Launch includes no deal conclusion or autonomous action. Expansion follows measurable analyst-time and coverage proof.
