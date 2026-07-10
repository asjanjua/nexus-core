# NexusAI Workflow Twin Candidate Scorer

## Purpose
The workflow scorer helps a sponsor choose the first workflow to twin in NexusAI. It prevents the pilot from becoming a vague "AI transformation" effort by forcing a clear, defensible first target.

The best first workflow is not always the most painful workflow. It is the workflow with enough frequency, evidence, governance fit, and measurable value to prove NexusAI safely.

The scorer is the bridge in the user strategy documented in `docs/USER_STRATEGY_AND_PIVOTS.md`: readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof.

## When To Use It
- During pilot scoping
- During onboarding after company profile and role selection
- During a workshop with the sponsor and process owners
- Before any promise about ROI or automation impact

## Minimum Inputs
For each candidate workflow, capture:
- Workflow name
- Business owner
- Current manual process summary
- Frequency
- Average cycle time
- Main evidence sources
- Current pain level
- Decision or output produced
- Regulatory or customer risk
- Expected review owner

## Scoring Criteria
Score each criterion from 1 to 5.

| Criterion | Weight | 1 Means | 5 Means |
| --- | ---: | --- | --- |
| Frequency | 15% | Rare or one-off | Happens weekly/daily |
| Pain | 20% | Minor inconvenience | Clear executive pain or costly delay |
| Data readiness | 20% | Evidence scattered or missing | Evidence is available, current, and owned |
| Automation risk | 15% | High-risk output, external commitment, or legal/compliance exposure | Low-risk internal analysis or draft |
| Reusability | 10% | Unique edge case | Pattern repeats across teams or clients |
| Expected speed gain | 15% | Little cycle-time benefit | Clear reduction in wait time or rework |
| Sponsor readiness | 5% | No owner or reviewer | Named owner and reviewer are available |

Automation risk is reverse-scored in practice: a safer workflow receives a higher score.

## Weighted Score Formula
Use a 100-point scale:

```text
score =
  frequency * 3 +
  pain * 4 +
  data_readiness * 4 +
  automation_safety * 3 +
  reusability * 2 +
  expected_speed_gain * 3 +
  sponsor_readiness * 1
```

Maximum score: 100.

## Worksheet

| Workflow | Owner | Frequency | Pain | Data Readiness | Safety | Reusability | Speed Gain | Sponsor Ready | Score | Recommended? |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |
|  |  |  |  |  |  |  |  |  |  |  |

## Recommendation Rules
- Score 80-100: strong first workflow twin candidate.
- Score 65-79: viable candidate if governance is clear.
- Score 50-64: discovery candidate, not first pilot target.
- Below 50: defer until data or ownership improves.

Do not select a workflow as the first pilot target if:
- It requires autonomous external action.
- It requires NexusAI to submit filings, payments, HR decisions, or legal commitments.
- The evidence sources are unavailable.
- The sponsor cannot name a reviewer.
- The output would create regulatory exposure without human sign-off.

## AI Role
AI may:
- Suggest scoring rationale from the workflow description
- Identify missing evidence sources
- Flag governance risks
- Recommend clarifying questions for the sponsor
- Draft the "why this workflow first" explanation

AI must not:
- Select the workflow without sponsor confirmation
- Override a human risk rating
- Promise automation or headcount reduction
- Claim ROI before shadow-mode measurement

## Example First Pilot Candidates
- Weekly executive risk brief
- Board pack variance summary
- Proposal pipeline review
- Regulatory issue tracker summary
- Project delay and blocker report
- Supplier risk summary
- Marketing campaign performance digest

Buyer-lane fit:
- Evaluator / SME and SME self-serve: owner brief, cash/runway review, customer issue review, ops blocker report.
- Business / advisory: proposal pipeline review, project delay report, board-pack variance summary, executive risk brief.
- Regulated enterprise: regulatory issue tracker summary, supplier risk review, control evidence pack, board risk brief.

## Acceptance Checklist
- At least five workflows can be scored.
- The selected workflow has a named owner and reviewer.
- The selected workflow has evidence sources available at kickoff.
- The recommendation includes the score, top reason, and main risk.
- Sponsor signs off before the workflow enters pilot scope.

## Implemented Engine (as built)

The worksheet above is the manual/workshop model. The in-product scorer
(`lib/services/workflow-twins.ts`, run via the `workflow_scorer` twin) implements
the same intent with an activity-driven engine, not sponsor-entered 1-5 scores.
This section is canonical for what the code does; tune here and in that file
together.

### Scoring

Each candidate is scored 0-100 from workspace signal (open decisions, open
actions, blockers, recommendation volume, evidence coverage) combined with fixed
per-workflow weights: data readiness 22%, pain 18%, frequency 13%, senior
judgment 11%, inverse risk 10%, reusability 10%, monetization 8%, speed benefit
8%. Two additive boosts apply: a sector-fit boost from the workspace profile and
a lane-fit boost (+10) from the buyer lane set by the readiness pipeline
(`docs/LANE_ASSIGNMENT_SPEC.md`). Lane-fit map: evaluator and SME self-serve
favour decision/action and ops review; business/advisory favours proposal, risk,
and decision workflows; regulated enterprise favours risk and ops review and
never the autonomous regulatory-response workflow.

### Gating — two distinct failure modes

**Hard gates (workflow unsuitability).** Some workflows are never a safe FIRST
pilot because they imply autonomous external action, a legal commitment, or
regulatory exposure without human sign-off. These keep their score but are
marked `not_first_pilot` and can never be the recommendation, regardless of
rank. Currently: regulatory-response and agreement-review.

**Bridgeable gates (workspace readiness).** The run reports `pilotGates`: a named
sponsor, a named reviewer, and at least one evidence source. The recommendation
still renders so the user sees the path, but `pilotReady` stays false until all
gates clear. These are completion problems, not suitability problems.

### Selection and enforcement

The recommendation is the highest-scoring non-hard-gated candidate. Committing it
as the first pilot writes `selectedWorkflow` to the strategy profile. The scorer
persists the latest `pilotReady` / `pilotGates` snapshot on the strategy profile
after each scorer run. `PATCH /api/strategy-profile` enforces that server-owned
snapshot: setting a new `selectedWorkflow` while `pilotReady !== true` is
rejected with `pilot_gates_unmet` (400). This covers sponsor, reviewer, and
evidence gates without letting clients forge readiness. The scorer never
auto-selects; a human confirms.

### Signal confidence (cold-start honesty)

The engine scores from workspace activity, which is near zero for a user who
just arrived through readiness -> signup. Rather than hide that, each scorer run
computes a signal-strength label (`computeSignalStrength` in
`lib/services/workflow-twins.ts`; thresholds canonical here and there together):

| Strength | Rule |
| --- | --- |
| `none` | 0 evidence items and 0 open decisions/actions |
| `weak` | fewer than 3 evidence items |
| `moderate` | 3-9 evidence items |
| `strong` | 10+ evidence items, or 3+ evidence with 5+ open decisions/actions |

`none` and `weak` runs render a "Provisional recommendation" line on
`/workflows` and append "Provisional" to the run summary. The label NEVER
blocks confirmation — the human still decides, consistent with the scorer never
auto-selecting. It is persisted inside the `pilotGates` JSON as an informational
entry (`key: signal_strength`, `blocked: false`) so Mission Control's
pilot-status card can show it without a schema migration; the run payload's
`pilotGates` stays pure gates and carries `signal` separately.

### Deployment note

Database deployments must apply migrations `0033` and `0034` before deploying
the lane-aware scorer. `0033` adds readiness submissions and lane lifecycle
fields. `0034` persists the workflow scorer readiness snapshot (`pilot_ready`,
`pilot_gates`). No-database demos now use an in-memory strategy-profile fallback
for the same process, but that fallback is ephemeral and should not be treated as
production storage.
