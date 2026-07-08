# UI/UX Unknowns-First Review — 2026-07-07

Status: Phase 1 review note. Use this to choose the next Figma pass before implementation.

## Scope

This review covers the readiness-first Nexus journey from public readiness through Mission Control, workflow pilot selection, and pivot-specific workflow entry.

Primary evidence checked:

- `docs/USER_STRATEGY_AND_PIVOTS.md`
- `docs/WORKFLOW_TWIN_SCORER.md`
- `docs/UI_BASELINE_VERSIONING.md`
- `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md`
- `docs/MERIDIAN_REGULATORY_WORKFLOW.md`
- `docs/VANTAGE_DD_WORKFLOW.md`
- `BACKLOG.md`, `TASKS.md`, `HANDOVER.md`
- `apps/mission-control/app/readiness`
- `apps/mission-control/app/onboarding`
- `apps/mission-control/app/workflows`
- `apps/mission-control/components/dashboard-panel.tsx`
- Figma file `NcQ8F5a0hczwGwZua2gfun`, especially node `87:3`

## Current Map

The canonical product journey is:

```text
Readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof
```

This is not just a positioning line. The repo now implements material parts of it:

- Public `/readiness` produces a readiness result and claim path.
- Onboarding claims readiness context and loads the strategy profile.
- Onboarding captures sponsor and reviewer names.
- The workflow scorer reports a recommendation, bridgeable gates, hard gates, and signal confidence.
- `/api/strategy-profile` blocks new `selectedWorkflow` commits when the scorer-owned `pilotReady` snapshot is false.
- Mission Control shows a pilot-status card with buyer lane, selected workflow, sponsor, reviewer, gate state, and signal-confidence copy.
- `/workflows` includes pilot recommendation, backcasting, and Shadow ROI entry points.

## Current Territory

The Figma artifact at node `87:3` is a strong vertical screen inventory: 33 editable desktop frames covering Quorum, Meridian, and Vantage. Each frame has route candidate, current gate, user inputs, action points, Ask behavior, and guardrail space.

It is less strong as a readiness-to-pilot journey artifact. The frames are arranged by vertical workflow stage, not by the user path that starts at readiness and ends in a governed pilot proof loop.

Route territory differs by product:

- Quorum has a live `/board` route and deeper planned board-governance screens.
- Meridian has code registries and Figma screens, but no `/meridian/*` routes in `apps/mission-control/app`.
- Vantage has code registries and Figma screens, but no `/vantage/*` routes in `apps/mission-control/app`.
- Nucleus remains a product/domain concept without a comparable workflow registry or Figma route arc in this pass.

## Known Knowns

- Nexus should preserve readiness-first flow and avoid a generic SaaS dashboard start.
- Buyer lanes are evaluator/SME, SME self-serve, business/advisory, and regulated enterprise.
- Regulated enterprise must keep human approval, auditability, sensitivity control, and no autonomous writeback visible.
- The workflow scorer is the bridge from onboarding into a first workflow pilot.
- Recommendation strength, hard unsuitability, and bridgeable readiness gates are separate states.
- Sponsor, reviewer, and evidence are bridgeable pilot gates.
- The scorer signal can be `none`, `weak`, `moderate`, or `strong`; weak/none recommendations should be labeled provisional but not hidden.
- Existing Figma baselines are versioned and should not be overwritten casually.
- The vertical Figma board should remain tied to code-level screen guidance arrays.

## Known Unknowns

- Whether the next Figma pass should optimize for the regulated-buyer demo, public self-serve launch, or first paid pilot signing.
- How reviewer identity should be represented in Figma before the Clerk organization/reviewer-seat build exists.
- Whether the product should show one unified pilot lifecycle panel before deepening Quorum/Meridian/Vantage route screens.
- How much of the Shadow ROI/backcast workflow should be surfaced as a first-class post-selection journey rather than remaining inside `/workflows`.
- Whether Meridian and Vantage should be shown as planned vertical route arcs, demo-only surfaces, or deferred until their runtime routes exist.
- How to show a selected workflow that is strong but still not pilot-ready because bridgeable gates remain open.

## Unknown Knowns

These are assumptions the product appears to depend on but does not always make explicit in the UI:

- "Reviewer" currently means a declared accountability field, not necessarily a second authenticated seat.
- A workflow can be recommended but still not eligible to enter pilot scope.
- Provisional signal is a trust feature, not an apology.
- Evidence readiness is not equivalent to evidence quantity; the user needs to know what evidence unlocks the next gate.
- "No autonomous writeback" applies across verticals, but each vertical needs its own more concrete wording.
- The pivot subdomains are framing and entry layers, not proof that each pivot workflow is live.
- Mission Control is the main product surface, but the Figma vertical board can make it feel like the pivots are separate products unless the shared readiness-to-pilot spine is visible.

## Unknown Unknowns To Test In Figma

- A regulated buyer may assume "Confirm as first pilot" means Nexus has authority to execute work, not just enter a governed scope.
- An evaluator may not understand why they are being asked for sponsor/reviewer before they see value.
- A public self-serve user may need a lighter owner/reviewer model than a regulated buyer.
- A demo reviewer may miss that Meridian and Vantage screens are candidate surfaces, not shipped routes.
- A user may not know what to do after `selectedWorkflow` is confirmed because lifecycle, evidence, first brief, review loop, Shadow ROI, and expand/stop are distributed across surfaces.
- A weak-signal scorer recommendation may look like low confidence in Nexus unless paired with a clear evidence-gathering next action.

## Design Direction Options

### Option A — Cheapest Useful Improvement

Create a small Figma addendum board that overlays the current journey states onto existing V0.2 and workflow screens:

- readiness result
- lane inherited
- sponsor/reviewer missing
- evidence missing
- provisional recommendation
- pilot-ready recommendation
- selected workflow
- Shadow ROI started

Unknown resolved: whether the current screens already explain the state machine well enough.

Best for: quick review and copy clarity.

### Option B — Best Demo-Hardening Improvement

Create a regulated-buyer demo board showing one coherent path:

```text
Readiness -> Onboarding inherited lane -> Mission Control pilot status -> Workflow scorer -> Gate clearing -> First governed brief -> Reviewer approval -> Shadow ROI proof
```

Unknown resolved: whether a regulated buyer can understand trust boundaries and pilot proof in one walkthrough.

Best for: the near-term regulated demo.

### Option C — Best Strategy/Docs Alignment Improvement

Create a journey architecture board that maps every strategy milestone to:

- live route
- Figma frame
- data object
- gate
- human decision
- open implementation gap

Unknown resolved: where the canonical strategy and actual product surface still diverge.

Best for: product planning and avoiding overclaiming.

### Option D — Best Mission Control UX Improvement

Create a Mission Control pilot lifecycle panel concept that unifies:

- buyer lane
- readiness band
- selected workflow
- sponsor/reviewer
- evidence gate
- scorer signal
- first brief status
- review loop
- Shadow ROI
- expand/stop decision

Unknown resolved: whether the app needs a visible pilot lifecycle spine before more vertical route expansion.

Best for: making the product feel readiness-first after login.

### Option E — Most Ambitious High-Leverage Improvement

Create a `UI V0.3 Readiness-to-Pilot` Figma board that combines:

- base Nexus readiness-to-pilot journey
- regulated buyer lane variant
- SME self-serve lighter variant
- Quorum as the live pivot example
- Meridian/Vantage as planned route examples with clear "candidate route" labeling
- reviewer-seat future state
- pilot lifecycle after selected workflow

Unknown resolved: whether Nexus can present one coherent product narrative across buyer lanes and pivots without implying unfinished routes are live.

Best for: full product review before implementation.

## Conservative Recommendation

Choose Option D if the goal is app improvement, because the strongest map-vs-territory gap is no longer missing individual workflow screens. It is the missing unifying pilot lifecycle spine that shows where readiness, lane, scorer, reviewer, evidence, first brief, review, Shadow ROI, and expand/stop fit together.

Choose Option B if the immediate priority is the regulated-buyer demo.

Choose Option E only if there is enough time to produce a bigger Figma board and review it before code work.

## One Decision Needed

Which target should the next Figma pass optimize for?

1. Regulated-buyer demo in the next week.
2. Mission Control product clarity after login.
3. Full `UI V0.3 Readiness-to-Pilot` review board across lanes and pivots.

