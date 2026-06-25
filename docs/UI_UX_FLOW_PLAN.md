# NexusAI UI/UX Flow Plan

Updated: 2026-06-15  
Design status: Figma v1 started  
Figma file: https://www.figma.com/design/NcQ8F5a0hczwGwZua2gfun
Expert review: UI_UX_EXPERT_REVIEW_2026-06-16.md

## Product Experience Thesis

NexusAI should feel like a consulting-grade operating system for governed autonomous work. The first impression should be executive, restrained, evidence-led, and operationally useful. The product is not a marketing dashboard and not a generic chatbot. It is the control layer where leaders inspect autonomous work, approve high-impact steps, and trust the evidence trail.

## Visual Direction

The first Figma iteration uses a top-consulting-firm-inspired palette:

| Token | Hex | Usage |
| --- | --- | --- |
| Ink | `#0B1020` | Sidebar, high-trust dark surfaces |
| Slate | `#243044` | Secondary navigation, dense text surfaces |
| Mist | `#F5F7FA` | App background |
| White | `#FFFFFF` | Main panels |
| Signal | `#147B58` | Live, verified, success, safe-to-continue |
| Lime | `#86BC25` | Small activation accent |
| Violet | `#7A3FF2` | AI-generated, autonomy, model action |
| Data Blue | `#1D5FD1` | Evidence, metrics, source-backed signals |
| Warning | `#C98200` | Approval, manual gate, human review |
| Critical | `#B42318` | High risk, blocked, escalation |

Design rules:
- Use restrained consulting-style contrast: mostly neutral surfaces with precise status color.
- Treat evidence and governance as first-class UI, not secondary metadata.
- Avoid decorative dashboards. Every panel should answer a real operating question.
- Keep actions explicit: approve, request changes, pause, publish, export, inspect evidence.
- Show confidence, source count, status, and owner wherever an autonomous action is proposed.

## First Figma Pass

Created in the Figma file on page `02 Nexus v1 Consulting Screens`:

1. `Executive Command Center`
2. `Agent Control Profile`
3. `Workflow Twin Run`

These establish the core visual system: dark navigation, light operating panels, confidence/status metrics, agent passports, evidence spine, workflow gates, and human approval language.

## Core Product Flows

### 1. Executive Command Flow

Purpose: Give a leader a fast operating view of autonomous work, risk, evidence quality, and decisions needing attention.

Flow:
1. User opens Command Center.
2. System shows active missions, evidence confidence, open decisions, risk escalations, and hours returned.
3. User selects a mission, agent, risk, or decision.
4. User drills into evidence, approvals, or workflow status.
5. User approves, pauses, redirects, or exports the current operating view.

Primary screens:
- Executive Command Center
- Mission Run Detail
- Evidence Room
- Approval Inbox

### 2. Mission Creation Flow

Purpose: Turn a business outcome into a governed AI workstream.

Flow:
1. User clicks New Mission.
2. User chooses or describes an outcome.
3. User connects relevant sources and selects evidence scope.
4. System recommends agents and workflow steps.
5. User reviews guardrails, approval gates, and data boundaries.
6. User previews the run plan.
7. User launches the mission.

Primary screens:
- New Mission
- Mission Template Selector
- Source Scope
- Guardrail Review
- Run Plan Preview

### 3. Agent Control Flow

Purpose: Make each agent legible as an accountable worker with explicit permissions.

Flow:
1. User opens an Agent Control Profile.
2. User reviews purpose, action rights, sensitivity ceiling, tools, evidence scopes, and hard stops.
3. User inspects recent outputs and evidence spine.
4. User changes approval rights or pauses the agent.
5. System versions the passport and records an audit event.

Primary screens:
- Agent Control Profile
- Agent Output Log
- Passport Version History
- Evidence Spine

### 4. Workflow Twin Flow

Purpose: Simulate, inspect, and approve repeatable business workflows before automation is published.

Flow:
1. User opens a workflow twin.
2. System shows the workflow map, gates, owners, confidence, and risk points.
3. User runs a forecast or simulation.
4. System flags weak evidence, high-risk steps, manual approvals, and expected time saved.
5. User approves, requests changes, publishes, or exports the plan.

Primary screens:
- Workflow Twin Builder
- Workflow Twin Run
- Simulation Result
- Publish Review

### 5. Evidence Room Flow

Purpose: Make every output inspectable and source-backed.

Flow:
1. User opens evidence from a brief, workflow step, decision, or agent output.
2. System shows source documents, snippets, freshness, confidence, sensitivity, and linked entities.
3. User checks whether the evidence supports the claim.
4. User approves, rejects, quarantines, or exports the evidence trail.

Primary screens:
- Evidence Room
- Evidence Detail
- Source Comparison
- Audit Export

### 6. Risk and Audit Flow

Purpose: Give admins and executives a single view of exceptions, policy violations, and approvals.

Flow:
1. User opens Risk and Audit.
2. System groups issues by severity, owner, agent, workflow, and due date.
3. User opens an issue and sees impact, evidence, policy trigger, and proposed mitigation.
4. User assigns owner, resolves, escalates, or exports the audit record.

Primary screens:
- Risk and Audit Dashboard
- Risk Detail
- Audit Log
- Policy Trigger Detail

### 7. Human Approval Flow

Purpose: Keep high-impact autonomy fast but accountable.

Flow:
1. Agent or workflow hits an approval gate.
2. User receives an approval item with context, evidence, confidence, and consequences.
3. User approves, requests changes, rejects, or routes to another owner.
4. Agent resumes or stops based on the decision.
5. System logs the approval trail.

Primary screens:
- Approval Inbox
- Approval Detail
- Request Changes
- Approval History

### 8. Integrations Flow

Purpose: Connect systems without making users feel they are granting broad uncontrolled access.

Flow:
1. User opens Integration Hub.
2. User chooses an app such as Google Drive, Slack, SharePoint, Outlook, Gmail, GitHub, CRM, or finance.
3. User authenticates.
4. User maps source scope, sensitivity defaults, sync cadence, and approval rules.
5. User tests connection and starts ingestion.

Primary screens:
- Integration Hub
- Integration Detail
- Permission Scope
- Sync Status

### 9. Governance Settings Flow

Purpose: Define the operating boundary for agents, evidence, roles, and model providers.

Flow:
1. Admin opens Governance Settings.
2. Admin configures roles, agent passports, sensitivity defaults, AI policy, providers, budgets, and audit retention.
3. Admin saves policy changes.
4. System versions the changes and records the audit event.

Primary screens:
- Governance Settings
- Roles and Permissions
- AI Policy
- Agent Passport Settings
- Audit Retention

### 10. Onboarding Flow

Purpose: Get a first workspace to a credible mission quickly.

Flow:
1. User creates company workspace.
2. User confirms company profile and sector.
3. User connects or uploads first evidence bundle.
4. User chooses first mission template.
5. User reviews guardrails.
6. User launches demo mission or enters Command Center.

Primary screens:
- Company Setup
- Source Setup
- First Mission Template
- Guardrail Review
- First Command Center

## V1 Prototype Narrative

The first clickable prototype should tell one end-to-end story:

1. Executive opens NexusAI Command Center.
2. They see the enterprise proposal workflow needs attention.
3. They drill into the Workflow Twin Run.
4. They inspect the Regulatory Response Agent passport.
5. They open the evidence spine for the proposed response.
6. They approve a legal escalation.
7. The workflow completes and produces an audit-ready package.

This narrative demonstrates the product's moat: autonomy, control, evidence, and governance in one operating loop.

## Screen Build Order

### Batch 1 - already started
1. Executive Command Center
2. Agent Control Profile
3. Workflow Twin Run

### Batch 2 - completed 2026-06-15
4. Mission Creation
5. Mission Run Detail
6. Evidence Room
7. Approval Inbox

### Batch 3
8. Risk and Audit Dashboard
9. Integration Hub
10. Integration Detail
11. Governance Settings

### Batch 4
12. User and Role Management
13. Onboarding - Company Setup
14. Onboarding - First Mission Template
15. Audit Export / Executive Pack

## Build Notes for Implementation

- Existing product concepts map cleanly to the UI plan:
  - Agent Control Profile = Agent Passport.
  - Workflow Twin Run = governed workflow simulation and execution surface.
  - Evidence Room = source, confidence, sensitivity, and audit inspection.
  - Approval Inbox = human gate before external or high-impact action.
- The live app should move toward the Figma command-center pattern, but the first priority is product clarity and prototype coverage.
- Figma is the current design source of truth for visual iteration. Penpot remains a possible later option if MCP/plugin compatibility improves.
