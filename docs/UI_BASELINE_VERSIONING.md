# UI Baseline Versioning

Status: Active operating note.
Last updated: 2026-07-06.

Use this when we need to preserve the first Nexus UI that originally came from the Vercel-built prototype while continuing forward on the Render-hosted app and new architecture.

Vercel is not the current deployment direction. It is historical provenance for the first UI baseline. Render remains the current runtime path for the hosted Mission Control app.

## Operating Principle

Do not preserve the old UI by keeping a parallel Vercel product alive.

Preserve it as a named baseline:

- in Figma, as a design option
- in git, as a tag or commit reference
- in Render, as a known deployed commit when applicable
- in docs, as a clear `V0.1` reference

Then the newer architecture and UI can move forward as `V0.2`, `V0.3`, and so on without losing the ability to compare back to the original experience.

## Naming Rules

Use these names consistently:

| Name | Meaning | Current role |
|---|---|---|
| `UI V0.1 baseline` | The first room-based UI originally built in Vercel and then carried into Render/new architecture | Reference design and comparison point |
| `Render production` | The current hosted Nexus Mission Control app | Runtime source of truth |
| `UI V0.2 proposal` | The newer proposed experience built on the current architecture | Review candidate |
| `UI V0.3+` | Later iterations after colleague feedback | Future design/product iterations |

Do not say "Vercel version" unless discussing historical origin. Say `UI V0.1 baseline` instead.

## Baseline Ledger

Keep this table updated when a baseline is created, moved, or superseded.

| Version | Date | Source/origin | Git ref | Render URL or deploy ref | Figma ref | Status | Notes |
|---|---|---|---|---|---|---|---|
| UI V0.1 baseline | 2026-07-05 | Original Vercel-built room-based UI, now represented in Render/new architecture | `c513eee` current repo ref at registry time; confirm exact Render deploy before demo | `https://nexus-mission-control.onrender.com/dashboard/ceo` for live room-based CEO route; Render deploy id pending confirmation | `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=40-3` | protected baseline | Full desktop-browser V0.1 prototype: 30-screen Render-aligned room-and-tool journey. |
| UI V0.2 proposal | 2026-07-05 | Current proposed guided-routing UI on the same product surface arc | `c513eee` current repo ref at registry time; implementation parity still to confirm screen-by-screen | `https://nexus-mission-control.onrender.com/dashboard/ceo` remains current Render comparison route until V0.2 is deployed or feature-flagged | `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=44-3` | candidate | Full desktop-browser V0.2 prototype: same 30-screen arc with guided next action, owner, trust, approval consequence, and audit-readiness cues. |
| Quorum UI V0.1 build | 2026-07-06 | Quorum pivot UI/UX expansion from the live `/board` Board Room surface | `9872037` current repo ref at registry time; exact Render deploy id still pending confirmation | `https://nexus-mission-control.onrender.com/board` for the live Quorum route; authenticated smoke still pending | `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=78-3` | candidate | Six-screen desktop-browser Quorum concept flow: baseline setup, delta review, Director Q&A, evidence drilldown, decision handoff, and board export pack. `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md` now defines the deeper board-governance screens required before Quorum is build-ready. |
| Quorum Governance Workflow V0.2 | 2026-07-06 | Expanded Quorum board-governance workflow from `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md` and `lib/board-governance-workflow.ts` | Working tree code plan at registry time; commit pending | `https://nexus-mission-control.onrender.com/board` remains current runtime route; it now includes a compact code-backed governance roadmap locally | `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=80-3` | candidate | 17-screen desktop-browser Figma board covering setup wizard, board register, committee register, TOR/policy library, meeting calendar, agenda builder, board pack builder, director pre-read, attendance/quorum, conflicts, committee recommendation, decision/vote capture, circular resolution, minutes drafting, minutes review/sign-off, action register, and governance audit pack. |
| Vertical workflow exploration V0.1 | 2026-07-06 | Figma exploration for Meridian, Vantage, Nucleus, and Connector Ops; architecture corrected into dedicated Meridian/Vantage registries | Working tree code plan at registry time; commit pending | Runtime routes are candidates only except `/settings/connectors`; live implementation still pending | `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=82-3` | candidate | 16-screen desktop-browser Figma board. Treat as visual exploration only, not a shared workflow architecture. Code source of truth is now domain-owned: `lib/meridian-regulatory-workflow.ts`, `lib/vantage-dd-workflow.ts`, and Quorum's existing `lib/board-governance-workflow.ts`. |
| Vertical Input Action Screens V0.2 | 2026-07-06 | Guidance-backed Figma review board from Quorum, Meridian, and Vantage workflow registries | Working tree code plan at registry time; commit pending | Runtime routes are candidates except live `/board`; implementation still follows the registry docs before route build-out | `https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun?node-id=87-3` | candidate | 33 editable desktop-browser frames: Quorum 17, Meridian 8, Vantage 8. Each frame exposes required user inputs, action points, Ask prompt behavior, route candidate, current gate, and human-control guardrail. Source copy lives in `quorumScreenGuidance`, `meridianScreenGuidance`, and `vantageScreenGuidance`. |

Status values:

- `protected baseline`
- `candidate`
- `preferred`
- `superseded`
- `archived`

## How To Preserve V0.1

1. Identify the git commit that best represents the V0.1 room-based UI on the current architecture.
2. Add it to the Baseline Ledger above.
3. Tag the commit if it is stable:

```bash
git tag nexus-ui-v0.1-baseline <commit-sha>
git push origin nexus-ui-v0.1-baseline
```

4. Capture the Render deployment URL or deploy ID if that commit reached Render.
5. Capture the matching Figma page/frame link.
6. Do not keep a separate Vercel deployment alive just for preservation unless a demo explicitly requires it.

## How To Move To V0.2

1. Keep V0.1 tagged and documented first.
2. Build V0.2 on the current Render/new architecture path.
3. Smoke V0.2 in Render or a Render preview/staging path before showing it externally.
4. Show colleagues both references:
   - `UI V0.1 baseline`: familiar room-based experience
   - `UI V0.2 proposal`: newer guided architecture
5. Record which option is preferred and why.
6. If V0.2 becomes preferred, mark V0.1 as `protected baseline`, not deleted.

## Recursive UI Improvement Loop

Use this loop for every UI iteration after the baseline is captured.

### 1. Capture The Current App

Start from the real Render/new-architecture app, not an imagined screen list.

1. Confirm the current Render route or local route for each product surface.
2. Capture the current behavior and edge states that matter: empty, loading, error, gated, no-data, and success states where applicable.
3. Update the Route Mapping section if a route has moved or a new route exists.
4. Add the current git ref and Render deploy/ref to the Baseline Ledger when the version is stable enough to compare.

Output:

- live route list
- screenshots or notes for any meaningful state
- ledger row for the current version

### 2. Recreate Or Update Screens In Figma

Figma is the editable design surface for visual and UX comparison.

1. Create a new Figma page or board named with the next version, for example `07 UI V0.3 Desktop Proposal`.
2. Copy the previous version's full screen arc so the comparison stays like-for-like.
3. Update only the screens touched by the iteration unless the navigation model changes.
4. Keep the same route names and product-surface names as the live app wherever possible.
5. Record the Figma page/frame link in the Baseline Ledger.

Output:

- editable Figma frames
- one row in the ledger for the candidate version
- short notes on what changed and why

### 3. Improve The Design

Each candidate version should have a clear reason to exist.

1. Pick the improvement theme: clarity, trust, speed, onboarding, connectors, Ask, ingestion, executive rooms, or mobile later.
2. Mark changed screens in Figma with concise version notes.
3. Check the candidate against the design rules: clear primary action, no clutter, readable text, consistent help icons, real CTAs, and visible trust/provenance.
4. Compare against the previous baseline before implementation.

Output:

- preferred direction or rejected candidate
- design notes that explain the decision
- updated status in the Baseline Ledger

### 4. Implement In The App

Implementation happens in the repo, not in Figma.

1. Create a scoped branch using the version name, for example `codex/ui-v0.3`.
2. Map each Figma change to real files, routes, and components.
3. Reuse existing primitives and design tokens before adding new components.
4. Keep feature behavior, data contracts, and auth boundaries tied to the current architecture.
5. Update help-copy, connector-copy, route, and baseline docs in the same pass when visible UI changes affect them.

Output:

- code changes in React/Next.js
- docs updated alongside the UI
- candidate git ref ready for verification

### 5. Verify Before Deploy

Do not promote a UI version because it looks good in Figma only.

1. Run focused syntax/type checks for touched TS/TSX files.
2. Run tests/build where the local runner or CI allows it.
3. Smoke the affected routes locally or in a preview/staging path.
4. Check the major demo path: onboarding, dashboard, Ask, ingestion, approvals, recommendations, connectors, and export/paperwork where touched.
5. Record any test gaps honestly in `HANDOVER.md`.

Output:

- verification notes
- known gaps
- go/no-go decision for Render deploy

### 6. Deploy On Render

Render is the current hosted app path.

1. Merge or push the verified branch according to the active deploy process.
2. Trigger or confirm the Render deploy.
3. Record the Render deploy/ref in the Baseline Ledger.
4. Run live smoke on the deployed route.
5. If it fails, use the Render rollback path in `DEPLOY.md` and keep the failed version as `superseded` or `archived`, not erased.

Output:

- Render deployed ref
- live smoke result
- updated ledger status

### 7. Commit The Version Record

Every iteration should leave an audit trail.

1. Update `docs/UI_BASELINE_VERSIONING.md`.
2. Update `CHANGELOG.md`, `TASKS.md`, `BACKLOG.md`, and `HANDOVER.md` for meaningful UI/version changes.
3. Tag major accepted UI baselines:

```bash
git tag nexus-ui-v0.3 <commit-sha>
git push origin nexus-ui-v0.3
```

4. Keep rejected candidates documented if they influenced the chosen direction.

Output:

- versioned git commit
- optional git tag for accepted baselines
- docs that explain what changed

### 8. Repeat

The next cycle starts from the latest accepted Render app, not from an old Figma assumption.

For each new cycle:

1. Treat the accepted version as the new baseline.
2. Create the next Figma proposal from that baseline.
3. Implement only the chosen improvements.
4. Redeploy through Render.
5. Update the ledger again.

## Version Gates

| Gate | Question | Pass condition |
|---|---|---|
| Design source | Do we have editable Figma frames? | Figma link is in the ledger. |
| Runtime source | Do we know what is live? | Render URL/deploy ref is in the ledger or explicitly pending. |
| Code source | Can we recover the code? | Git ref or tag is in the ledger. |
| Review source | Can colleagues compare options? | Previous baseline and candidate both have screen sets. |
| Verification source | Did the app run? | Smoke/test notes are recorded before deploy or caveated. |
| Decision source | Do we know why it changed? | Changelog/handover explains the accepted or rejected direction. |

## Screen Source Formats

| Artifact | Format | Purpose | Source of truth |
|---|---|---|---|
| Editable screen designs | Figma frames | Colleague review, UX comparison, design iteration | Yes, for visual design intent |
| Live app screens | React / Next.js TSX routes | Working product behavior on Render/new architecture | Yes, for runtime behavior |
| Screen/version record | Markdown | Baseline ledger, decision notes, implementation mapping | Yes, for governance and handover |
| Review exports | PNG or PDF | Sharing snapshots in email, decks, or async review | No, export only |

## Current Screen Sets

Both V0.1 and V0.2 use the same desktop-browser screen arc so reviewers compare the experience, not a different surface inventory.

| Set | Figma frame | Format | Scope | Live reference |
|---|---|---|---|---|
| UI V0.1 baseline | `05 V0.1 Full Desktop Prototype`, board `40:3` | Editable Figma frames | Public entry, product brief, readiness, onboarding, executive room, Ask, ingestion, sources, review, approvals, evidence detail, recommendations, decisions, workflow twins, company memory, entity detail, knowledge, exports, connectors, settings, AI policy, weekly brief, one-pager, pilot paperwork | Current Render room experience, starting at `/dashboard/ceo` |
| UI V0.2 proposal | `06 V0.2 Full Desktop Prototype`, board `44:3` | Editable Figma frames | Same 30-screen arc, redesigned around guided routing, next action, trust drawer, approval consequence, source coverage, and audit cues | Candidate design; implementation/deploy reference to be filled when built or feature-flagged |
| Quorum UI V0.1 build | `08 Quorum UI UX Build`, board `78:3` | Editable Figma frames | Six focused Quorum screens: baseline setup, between-meetings delta review, Director Q&A, evidence drilldown, decision handoff, and board export pack | Current live route starts at `/board`; expanded handoff/export screens are design candidates |
| Vertical workflow exploration V0.1 | `10 Pivot Workflow Builds V0.1`, board `82:3` | Editable Figma frames | Sixteen exploratory screens for Meridian, Vantage, Nucleus, and Connector Ops. Do not treat the common four-column board as product architecture. | Runtime route work pending; `/settings/connectors` is the only currently live route in this set |

## Route Mapping For Review

Use these routes when checking the live Render implementation against the Figma baseline.

| Product surface | Primary route |
|---|---|
| Quorum Board Room | `/board` |
| Meridian regulatory submissions | `/meridian/scope`, `/meridian/license-profile`, `/meridian/requirements`, `/meridian/evidence-coverage`, `/meridian/gaps`, `/meridian/caveats`, `/meridian/submission-memo`, `/meridian/filing-pack` |
| Vantage DD Copilot | `/vantage/dealroom`, `/vantage/data-room`, `/vantage/coverage`, `/vantage/evidence-depth`, `/vantage/red-flags`, `/vantage/judgment-log`, `/vantage/ic-memo`, `/vantage/decision-handoff` |
| Nucleus methodology packs | `/nucleus/setup`, `/nucleus/packs/builder`, `/nucleus/packs/preview`, `/nucleus/packs/publish` |
| Connector settings and ingestion ops | `/settings/connectors`, `/settings/connectors/sources`, `/settings/connectors/sync`, `/settings/connectors/audit` |
| Public entry | `/` |
| Product brief | `/product-brief` |
| Readiness | `/readiness` |
| Onboarding | `/onboarding` |
| Executive room | `/dashboard/ceo` |
| Ask | `/ask` |
| Ingestion | `/ingestion` |
| Sources | `/sources` |
| Review | `/review` |
| Approvals | `/approvals` |
| Evidence detail | `/evidence/[id]` |
| Recommendations | `/recommendations` |
| Decisions | `/decisions` |
| Workflow twins | `/workflows` |
| Company memory | `/entities` |
| Entity detail | `/entities/[id]` |
| Knowledge workspace | `/knowledge` |
| Export hub | `/export` |
| Connectors | `/settings/connectors` |
| Workspace settings | `/settings/workspace` |
| AI policy | `/settings/policies` |
| Weekly brief | `/export/weekly-brief` |
| One-pager | `/export/one-pager` |
| Pilot paperwork | `/pilot/paperwork` |

## What Not To Do

- Do not treat Vercel as an active deployment lane for Nexus unless we intentionally reopen that decision.
- Do not maintain duplicate production infrastructure just to preserve a UI reference.
- Do not move forward with "latest UI" language; record the version number and baseline.
- Do not delete or overwrite Figma frames that represent V0.1 before colleague review.
- Do not mix infrastructure rollback with UI comparison. Render rollback is operational; UI baseline comparison is product/design governance.

## Current Infrastructure Interpretation

- Render is the hosted app path.
- The new Nexus architecture is the app architecture path.
- Vercel is historical context for the original UI build, not a deployment target.
- Figma and docs are the preferred places to compare `V0.1` and `V0.2`.
