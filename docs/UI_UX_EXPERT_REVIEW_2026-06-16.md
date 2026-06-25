# NexusAI UI/UX Expert Review

Date: 2026-06-16
Scope: Figma v1 board, page `02 Nexus v1 Consulting Screens`
Figma file: https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun

## Executive Read

The current Figma direction is strong. It feels closer to an executive operating system than a SaaS marketing dashboard, which is the right product posture for NexusAI. The dark navigation, white work surfaces, evidence/confidence language, and approval-gated autonomy are all pointed in the right direction.

The next UX improvement is not more decoration. The next improvement is sharper interaction clarity: make every screen answer what changed, what needs action, why it is safe to trust, and what happens after the user clicks.

## What Is Working

- The product reads as serious and governance-first.
- The top consulting palette is restrained enough for executive buyers.
- The core trust objects are visible: confidence, evidence, approvals, passports, gates, audit trail.
- The screen set now tells a coherent story from command center to mission, evidence, and approval.
- The left navigation gives the product a durable operating-system frame.
- The workflow twin and agent passport concepts are differentiated and defensible.

## Priority UX Findings

### P1 - Primary action hierarchy is not yet strong enough

Several screens show important states but do not make the next best action obvious enough. For example, Command Center shows signals, Mission Run Detail shows gates, and Evidence Room shows controls, but the user's primary next move should be visually dominant.

Recommendation:
- Each screen should have exactly one primary action.
- Secondary actions should be visually quieter.
- Destructive or irreversible actions should never share the same visual weight as safe actions.

Examples:
- Command Center: `Review 4 blockers`
- Mission Creation: `Launch guarded run`
- Mission Run Detail: `Review open gates`
- Evidence Room: `Approve evidence for this claim`
- Approval Inbox: `Review now`

### P1 - Trust evidence should be one click closer

Evidence appears throughout the design, but the path from a claim to the proof should be more explicit. Expert users will ask: where did this come from, how fresh is it, who approved it, and can I export the trace?

Recommendation:
- Add a consistent `Why this is trusted` pattern to agent outputs, mission cards, approvals, and workflow gates.
- Include evidence count, freshness, confidence, sensitivity, and last human review.
- Make the evidence spine a standard drawer or detail panel across all screens.

Mini feature:
- `Trust Drawer`: a slide-over panel that opens from any confidence badge or evidence count.

### P1 - Approval UX needs consequence framing

Approval Inbox is the most important trust surface. It currently shows review items, but the approval detail should make consequences more explicit before the user clicks approve.

Recommendation:
- Add a small consequence section:
  - `If approved`
  - `If rejected`
  - `If changes requested`
- Show what system state changes after approval.
- Show whether the action leaves Nexus or stays internal.

Mini feature:
- `Approval Consequence Preview`: before approving, show the exact downstream step that unlocks.

### P2 - Workflow status needs clearer time orientation

The Workflow Twin Run and Mission Run Detail screens show steps and readiness, but the user should instantly understand what already happened, what is happening now, what is blocked, and what is next.

Recommendation:
- Use consistent labels for workflow steps:
  - Done
  - Running
  - Needs approval
  - Blocked
  - Queued
- Add timestamps or age where relevant.
- Use the same colors and icons for these states everywhere.

Mini feature:
- `Now / Next strip`: a compact persistent bar showing current step, next gate, owner, and ETA.

### P2 - Navigation should reflect counts and urgency

The left navigation establishes the product well, but it does not yet communicate operating urgency.

Recommendation:
- Add count badges to key nav items:
  - Approvals: `4`
  - Risk and Audit: `3`
  - Evidence Room: `2 pending`
  - Workflow Twins: `1 blocked`
- Use neutral badges for counts and warning/critical only for urgent states.

Mini feature:
- `Nav health badges`: tiny, consistent status counters in the sidebar.

### P2 - Agent passports need version and owner visibility

The Agent Control Profile already communicates permissions, but governance buyers will expect change control and accountability.

Recommendation:
- Add passport version, last reviewed date, owner, and next review date to the profile header.
- Show whether the passport was changed since the current mission started.

Mini feature:
- `Passport Drift Warning`: flags when an agent's passport changed during an active mission.

### P2 - Empty and loading states should be designed early

The current screens are ideal populated states. For a real pilot, users will hit empty, loading, partial-ingestion, blocked-connector, and insufficient-evidence states.

Recommendation:
- Design empty states for:
  - no missions yet
  - no evidence connected
  - no approvals
  - connector disconnected
  - evidence below confidence threshold
- Avoid generic empty copy. Each empty state should offer a useful next action.

Mini feature:
- `Evidence Readiness Checklist`: shown before the first mission can run.

### P3 - Tables and dense panels need scan affordances

The screens use tables well, but scanability can improve through visual grouping and stronger row actions.

Recommendation:
- Add row hover/selected state in Figma.
- Add compact row actions where needed: inspect, assign, approve, pause.
- Keep numeric columns right-aligned where values are comparable.

Mini feature:
- `Quick Inspect`: hover or row action opens a small detail preview without leaving the screen.

### P3 - Accessibility pass is needed before implementation

The palette is restrained, but some small labels, muted text, and badge text may be too low contrast at production scale.

Recommendation:
- Check all small text at 12px and below.
- Avoid relying on color alone for risk/status.
- Add icons or state words for critical statuses.
- Ensure all click targets are at least 40px high in implementation.

Mini feature:
- `Status Icon System`: consistent small icons for live, blocked, approval, evidence, and AI-generated states.

## Recommended Mini Features

### 1. Command Palette

Keyboard-first action launcher for executive users:

```text
Open mission
Review blockers
Ask about this workflow
Create approval
Export audit pack
Pause agent
```

Why it matters: power users and consultants can move fast without hunting through screens.

### 2. Trust Drawer

Reusable drawer opened from confidence badges, evidence counts, and approval items.

Contents:
- evidence sources
- freshness
- sensitivity
- confidence calculation
- last human review
- audit events
- export trace

Why it matters: makes trust inspectable without forcing full page navigation.

### 3. Approval Consequence Preview

Before approval, show the exact thing that will happen next.

Example:

```text
Approving this will unlock:
1. Legal review step marked complete
2. Proposal package moves to CEO approval
3. Audit event recorded
4. No external send occurs
```

Why it matters: reduces fear around autonomous workflows.

### 4. Mission Health Score

Single operating summary for each mission:

```text
82% ready
2 gates open
1 high-risk issue
31 evidence items
18h expected time returned
```

Why it matters: lets executives compare missions quickly.

### 5. Source Coverage Map

Shows whether a mission has enough coverage across required source types.

Example:
- RFP uploaded
- prior SOW found
- pricing policy found
- legal memo pending
- delivery capacity missing

Why it matters: prevents weak-evidence outputs before they happen.

### 6. Agent Pause With Reason

Pause an agent and require a reason:

```text
Evidence issue
Policy change
Client sensitivity
Wrong output
Awaiting human review
```

Why it matters: turns interventions into learning and audit data.

### 7. Explain Status

Small tooltip or drawer explaining labels like `AI guarded`, `blocked`, `restricted`, `confidence`, and `readiness`.

Why it matters: makes expert terminology learnable without cluttering the screen.

### 8. Audit Pack Preview

Before export, show what will be included:
- mission summary
- decisions
- approvals
- evidence references
- agent outputs
- policy gates
- timestamps

Why it matters: makes export feel controlled and professional.

## Prototype Fix List

1. Add primary action buttons to every screen.
2. Add nav count/status badges.
3. Add Trust Drawer pattern to Evidence Room and Approval Inbox.
4. Add consequence preview to Approval Detail.
5. Add `Now / Next` strip to Mission Run Detail and Workflow Twin Run.
6. Add passport version, owner, and review cadence to Agent Control Profile.
7. Add empty/loading/error states as separate mini frames.
8. Add accessibility/state icon pass before implementation.

## Implementation Watchouts

- Do not let CTA routes become visually convincing but behaviorally unclear. Public CTAs should have deterministic routes and obvious post-click states.
- Avoid building screens that only work in the happy path. The trust model depends on partial, blocked, and denied states being visible.
- The live app should preserve the Figma direction, but production components must include real focus states, disabled states, loading states, and error recovery.

## Verdict

The v1 design direction is correct. The product already has a credible executive/governance feel. The next design pass should focus on interaction confidence: primary actions, trust inspection, approval consequences, workflow status, and operational edge states.
