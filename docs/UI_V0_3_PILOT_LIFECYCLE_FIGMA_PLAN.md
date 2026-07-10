# UI V0.3 Pilot Lifecycle Spine — Figma Plan (2026-07-07)

Status: Approved direction from unknowns-first interview. Option D (pilot lifecycle spine on the dashboard) first, then Option B (regulated demo board) reusing the regulated lane variant.

Decisions locked in interview:

1. Full spine, labeled states. All stages readiness through expand/stop are shown; stages without runtime data get an explicit `Candidate — not yet live` treatment. No frame may imply an unbuilt route or data object is live.
2. Spine lives on the dashboard as the primary panel, evolving the existing pilot-status card in `apps/mission-control/components/dashboard-panel.tsx`.
3. All four buyer lanes get a variant frame: evaluator/SME, SME self-serve, business/advisory, regulated enterprise.
4. Design system: `nexus-design-system` skill is the locked source of tokens, type ramp, spacing, violet AI rule, one-primary-action rule, evidence-first patterns. `UI V0.1 baseline` preserved untouched; new work goes on a new `UI V0.3 Pilot Lifecycle` page in file `NcQ8F5a0hczwGwZua2gfun`.

## Decisions likely to be tweaked (review these first)

- Stage list of the spine (currently 9): Readiness result -> Lane inherited -> Sponsor/Reviewer -> Evidence gate -> Scorer recommendation -> Workflow selected -> First governed brief -> Reviewer approval loop -> Shadow ROI / expand-stop. First brief onward are Candidate stages.
- Reviewer rendering: named text field today, with a visually distinct "future reviewer seat" affordance in the regulated variant only.
- Provisional signal treatment: weak/none scorer signal shown as a trust cue with a concrete evidence next action, never as an error state.
- Density: spine as horizontal stepper with one expanded active stage; alternative is a vertical checklist. Stepper is the default.

## User journey

Login -> dashboard spine shows current stage highlighted -> each blocked stage names its owner and unlock action -> completed stages show the evidence that cleared them -> Candidate stages visible but visually recessed with label.

## Screen inventory

Frames 1–4: Dashboard spine, one per lane. Same skeleton, differences:

| Lane | Reviewer cue | Trust cues | Tone |
|---|---|---|---|
| Evaluator/SME | Optional, deferred to pilot gate | Scorer confidence, evidence count | Exploratory |
| SME self-serve | Single owner may hold sponsor+reviewer with disclosure note | Light | Momentum |
| Business/advisory | Named reviewer required at pilot gate | Evidence + approval trail | Advisory |
| Regulated enterprise | Reviewer gate prominent, future-seat affordance, audit trail link, explicit "no autonomous writeback" statement | Full: sensitivity, model route, human approval boundary | Governed |

Frames 5–8: States for the regulated variant (the hardest case): empty (pre-readiness claim), loading, gated (sponsor/reviewer/evidence blocked with unlock actions), success (pilot-ready, workflow selected, Candidate stages ahead).

Frame 9: Provisional-signal state — strong recommendation blocked by open gates, weak-signal copy with evidence-gathering next action.

Frame 10 (Option B): Regulated demo storyboard strip reusing frames 4–8 in sequence: Readiness -> Onboarding lane inheritance -> Spine gated -> Gate clearing -> Pilot-ready -> Selection -> Candidate afterlife clearly labeled. Demo reviewers must be able to see which surfaces are live vs candidate at a glance.

## Per-screen contract (applies to every frame)

- Screen name, route candidate (`/dashboard` for spine; Candidate stages carry no route claim)
- User goal, required inputs, one primary action, one secondary action
- Evidence/trust cue and human-control guardrail text
- Implementation dependency (data object or API that must exist)
- Open unknown noted on-frame in the annotation layer

## Implementation dependencies (map-vs-territory ledger)

Live today: readiness claim, lane inheritance, sponsor/reviewer names, scorer snapshot + `pilotReady` gate (`app/api/strategy-profile/route.ts`), pilot-status card fields.
Candidate (needs future data model): pilot lifecycle record — first brief status, reviewer approval events, Shadow ROI runs, expand/stop decision. Do not build these routes yet; design them recessed.

## Blockers

- Figma MCP connector requires re-authorization before frames can be created.

## Open unknowns carried forward

- Whether the reviewer future-seat affordance implies Clerk organizations sooner than planned.
- Whether SME self-serve single-owner mode is acceptable to the governance story.
- Whether the demo storyboard (frame 10) replaces or supplements the existing 87:3 vertical board narrative.
