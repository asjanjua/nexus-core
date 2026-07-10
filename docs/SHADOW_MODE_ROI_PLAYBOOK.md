# NexusAI Shadow-Mode ROI Playbook

## Purpose
Shadow mode proves NexusAI value by running the AI-assisted output beside the current manual process. It measures the difference instead of asserting productivity gains.

The principle is copy, not move. NexusAI observes and produces a parallel output while the existing workflow remains the system of record.

## When To Use It
- After the first workflow twin candidate is selected
- During a 6-8 week paid pilot
- Before promising production automation
- Before presenting ROI to a sponsor, board, or regulated buyer

## Shadow-Mode Process
1. Select one workflow using the Workflow Twin Candidate Scorer.
2. Capture the current manual process baseline.
3. Run the existing manual workflow as normal.
4. Run NexusAI in parallel using the same evidence.
5. Compare outputs with the same reviewer.
6. Record cycle time, evidence coverage, rework, quality notes, and decision impact.
7. Review results at Day 7, Day 14, Day 30, and final pilot closeout.

## Measurement Record

| Field | Description |
| --- | --- |
| `workspace_id` | Client workspace |
| `workflow_id` | Workflow being measured |
| `manual_owner` | Person/team producing current output |
| `manual_output_ref` | Link or description of manual output |
| `manual_cycle_time_minutes` | Time from request to usable output |
| `manual_rework_count` | Number of corrections or follow-ups |
| `nexus_output_ref` | NexusAI output reference |
| `nexus_cycle_time_minutes` | Time from evidence availability to usable draft |
| `evidence_coverage_percent` | Share of output claims with source references |
| `reviewer_decision` | Accepted, edited, rejected, or deferred |
| `reviewer_reason` | Short reason for decision |
| `restricted_data_flag` | Whether restricted data appeared or was blocked |
| `quality_notes` | Reviewer observations |
| `decision_impact` | Whether the output changed, accelerated, or clarified a decision |

## ROI Formulas

```text
time_saved_minutes = manual_cycle_time_minutes - nexus_cycle_time_minutes
time_saved_percent = time_saved_minutes / manual_cycle_time_minutes
rework_reduction = manual_rework_count - nexus_rework_count
evidence_coverage = sourced_claims / total_claims
acceptance_rate = accepted_outputs / reviewed_outputs
```

Use measured values only. If a value is estimated, label it estimated.

## Review Cadence

### Day 7
- Confirm evidence sources are available.
- Confirm the manual baseline is realistic.
- Identify blocked files, missing owners, or sensitivity issues.

### Day 14
- Compare first outputs.
- Record reviewer edits and reasons.
- Adjust prompts, evidence mapping, or role lens if needed.

### Day 30
- Present measured time saved, rework reduction, evidence coverage, and accepted outputs.
- Decide whether to continue, expand, narrow, or stop the pilot workflow.

### Final Pilot Closeout
- Summarize measured value.
- Identify production hardening gaps.
- Recommend next workflow only if the first one has a credible result.

## Sponsor-Facing Summary Format

```text
Workflow measured:
Manual baseline:
NexusAI parallel output:
Measured time saved:
Evidence coverage:
Reviewer outcome:
Main quality improvement:
Main remaining risk:
Recommended next step:
```

## AI Role
AI may:
- Draft NexusAI parallel outputs from approved evidence
- Summarize reviewer feedback
- Calculate measurement summaries
- Suggest where rework came from

AI must not:
- Claim ROI without measured data
- Replace the manual process during shadow mode
- Auto-send, auto-submit, or auto-commit outputs
- Hide rejected or edited outputs from the measurement set

## Acceptance Checklist
- One workflow has a signed-off baseline.
- At least three manual vs NexusAI comparisons are captured.
- Every NexusAI output has evidence coverage recorded.
- Reviewer decisions are captured with optional reasons.
- Final pilot review includes measured deltas, not only self-reported value.
