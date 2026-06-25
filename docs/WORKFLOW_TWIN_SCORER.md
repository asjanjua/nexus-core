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
