# Nexus Room Portfolio and Activation

Status: design and implementation plan

Last updated: 2026-07-29

Figma source: `29 Nexus Room Portfolio / 2026-07-29`, page `212:2`.

## Product decision

Every workspace sees the complete Nexus room portfolio from day one. Visibility
helps the buyer understand the operating model; it does not activate a room or
give it authority. An administrator activates a room only after confirming the
accountable owner, evidence scope, default agent pack, and human authority
boundary.

The Executive Room remains mandatory and is always available. Other rooms may
be active, dual-hat, staged, available, needs-setup, or custom. A room is not
an autonomous actor: it inherits the shared evidence, provenance, audit,
approval, tenant, and agent-control systems.

## Portfolio model

| Room type | Day-one visibility | Activation owner | Current code basis |
| --- | --- | --- | --- |
| Executive Command | Active and locked | Workspace administrator | `ceo` role, `/dashboard/ceo` |
| Finance, Operations, Growth, Technology, People, Risk | Visible as curated leadership lenses | Workspace administrator | role registry, agent rooms, role suggestions |
| Staged role | Visible with its trigger | Workspace administrator | `roleStates.staged` |
| Dual-hat role | Visible with shared owner | Workspace administrator | `roleStates.dual_hat` |
| Custom room | Visible after being added from a governed template | Workspace administrator | onboarding custom role state; durable room configuration is planned |
| Product room | Visible as a separate vertical workflow | Workspace administrator plus product workflow owner | Quorum, Meridian, Vantage, Nucleus registries and hubs |

## Activation contract

1. Select a curated template: Finance, Operations, Risk and Compliance, Growth,
   Technology and Data, or People. A custom name starts from one of these
   governed templates; it is not an empty dashboard.
2. Name the accountable owner and record an explicit empty-state reason when
   relevant evidence has not yet been connected.
3. Select or reuse the room evidence scope.
4. Confirm the default agent pack and its draft-only / approval policy.
5. Review the human authority boundary and activate. Activation emits an audit
   event and makes the room available in the portfolio and navigation.

No activation may grant authority to approve, sign, file, certify, pay, post to
an accounting system, send externally, or make a buyer decision. Those actions
remain with a named authorized human and the relevant workflow controls.

## Product-room boundary

Quorum, Meridian, Vantage, and Nucleus are visible in the Room Portfolio so a
workspace can see the whole operating model. They do not become generic
C-suite dashboards. Each retains its domain workflow, buyer, terminology,
input requirements, and explicit refusal boundary:

- Quorum: setup -> meeting -> record; board participants retain governance and
  signing authority.
- Meridian: scope -> evidence -> gap -> filing pack; it never files, submits,
  certifies, or legally signs.
- Vantage: dealroom -> coverage -> red flags -> memo; it never approves,
  rejects, or labels an investment decision.
- Nucleus: profile -> brief -> review -> handoff; the local engagement brand
  cannot override the fixed trust and reviewer contract.

## Implementation sequence

1. Extract the current onboarding role-selection, staged-role, dual-hat, and
   custom-role controls into shared room-domain primitives.
2. Add durable room configuration beyond `WorkspaceProfile.roleStates`: room
   template, display name, owner, evidence scope, agent selection, state,
   boundary acknowledgement, activation metadata, and audit references.
3. Build the protected `/rooms` portfolio route and the Add Room activation
   flow.
4. Derive specialist navigation from active room configuration while preserving
   a compact top-level navigation cap.
5. Add audited events for activation, deactivation, owner change, scope change,
   dual-hat designation, custom naming, and product-room activation handoff.
6. Add product activation adapters that hand off into each vertical registry
   rather than duplicating vertical workflow rules inside NexusAI.

## Acceptance criteria

- Every new workspace sees the complete curated room portfolio immediately.
- CEO is present and cannot be removed.
- An administrator can activate, stage, assign a dual-hat, and add a
  custom-named room from a curated template.
- A room cannot become active without a named owner, scope or empty-state
  reason, agent boundary, and audit record.
- Product rooms are discoverable, but retain their separate vertical workflow
  and authority boundaries.
- Navigation reflects active rooms without exposing a permanently hardcoded
  specialist-room list.
- The implementation passes keyboard, mobile, authorization, audit-event, and
  route smoke checks before being represented as live.

## Figma screen set

| Frame | Purpose |
| --- | --- |
| `213:2` | Populated Room Portfolio |
| `213:61` | First-run, day-one portfolio |
| `214:2` | Add Room template selection |
| `214:59` | Configure Finance Room |
| `214:114` | Review and activate |
| `215:2` | Active Finance Room detail |
| `215:49` | Product Room Portfolio |
| `218:2` | Executive Command Room detail |
| `218:49` | Operating Room detail |
| `218:96` | Growth Room detail |
| `218:143` | Technology and Data Room detail |
| `218:190` | Risk Room detail |
| `218:237` | People Room detail |
| `218:284` | Quorum Board Room detail |
| `218:331` | Meridian Submission Room detail |
| `218:378` | Vantage Deal Room detail |
| `218:425` | Nucleus Engagement Room detail |
| `218:472` | Staged and dual-hat management |
| `218:527` | Custom room configuration |
| `216:2` | Pinavia Tree cross-cut activation branch |
