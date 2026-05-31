# NexusAI Agent Rooms

Status: Product direction
Updated: 2026-05-30

## Position

NexusAI should not be positioned as dashboards for executives. NexusAI should be positioned as a company intelligence room staffed by evidence-backed specialist agents.

The dashboards remain useful as navigation surfaces, but the user-facing product language should shift from corporate-title dashboards to specialist agent outputs.

Core message:

> Nexus gives every company a team of evidence-backed AI analysts, each focused on a business function, with human approval built in.

## Why This Matters

CEO, COO, CTO, and CBO labels sound familiar but corporate. They describe who looks at the output, not what the system does.

Specialist agents describe the work being performed:

- finding risks
- spotting blockers
- tracking decisions
- reading financial signals
- watching technology health
- summarizing people and operating signals
- preparing source-backed recommendations

That is easier to sell because buyers understand the leverage immediately: Nexus is not another dashboard; it is an analyst layer.

## Lightweight V1 Implementation

Do not rebuild the backend first.

The first version should be a presentation and orchestration layer over the existing evidence, dashboard, Ask, recommendation, approval, and audit systems.

Initial agent definition:

```ts
type NexusAgent = {
  id: string;
  name: string;
  room: string;
  mandate: string;
  evidenceScope: string[];
  outputType: "brief" | "risk" | "decision" | "recommendation" | "status";
  approvalPolicy: "read_only" | "draft_only" | "approval_required";
  skillHints: string[];
};
```

Each current dashboard card can become an Agent Brief:

- agent name
- mandate
- brief text
- confidence
- freshness
- evidence references
- last run time
- suggested next action

## Rooms

### Executive Command Room

- Strategy Agent: what matters most
- Risk Agent: what can go wrong
- Decision Agent: what needs a call
- Finance/Capital Agent: what affects runway, margin, budget, cash, or ROI
- Reputation Agent: what external or stakeholder risk is emerging

### Operating Room

- Execution Agent: what is blocked
- Process Agent: where workflow is breaking
- Owner Agent: who needs to act
- Project Agent: what slipped or is at risk
- Vendor/Supply Agent: which third parties matter

### Growth Room

- Market Agent: what market signals matter
- Pipeline Agent: what is moving or stuck
- Partnership Agent: which relationships need attention
- Proposal Agent: what proposals need action
- Customer Signal Agent: what customers are saying
- Competitive Agent: what competitor signals matter

### Technology and Data Room

- Technology Health Agent: system reliability, tech debt, platform risks
- Data Quality Agent: data completeness, lineage, confidence, freshness
- Security Agent: security, compliance, and access risks
- AI Governance Agent: model usage, restricted data, evidence quality, policy risk
- Architecture Agent: system structure and future scaling concerns

### Finance Room

- Budget Agent
- Margin Agent
- Cash Agent
- Forecast Agent
- Revenue Quality Agent

### People Room

- People Risk Agent
- Hiring Agent
- Org Design Agent
- Culture Signal Agent
- Capacity Agent

### Risk Room

- Compliance Agent
- Operational Risk Agent
- Vendor Risk Agent
- Regulatory Agent
- Incident Agent

## Hermes and OpenClaw Relationship

Hermes and OpenClaw should influence the agent runtime design, but Nexus should not blindly copy or vendor code before a licensing and architecture review.

This belongs in the later contextual-agent phase, not the first Agent Rooms UI phase. The near-term goal is to make specialist agents visible as evidence-backed briefs. The later goal is to study Hermes and OpenClaw deeply and design Nexus-native agent workflows with comparable power but stronger enterprise governance.

Research targets:

- Hermes agent loop, tool routing, workflow execution, memory model, skill loading, sandbox controls, and failure recovery
- OpenClaw gateway/session model, channel routing, skill invocation, permissions, sandbox mode, audit/logging, and Slack/WhatsApp/Discord patterns
- Differences between personal-agent workflows and enterprise-agent workflows
- Where Nexus needs stricter workspace scoping, sensitivity handling, approval checkpoints, and audit events

Future Nexus workflow primitives:

- trigger
- context pack
- plan
- tool call
- approval checkpoint
- memory write
- audit event
- handoff
- refusal or escalation

The output of that research should be a Nexus agent-workflow architecture memo before any runtime adapter or copied code is introduced.

Useful skill patterns:

- read documents
- summarize
- search memory
- draft memo
- create task
- send Slack update
- prepare approval packet
- compare documents
- extract action items

Nexus must own:

- workspace permissions
- evidence scope
- sensitivity policy
- audit trail
- approval requirements
- connector writeback boundaries
- refusal behavior

## Later Agent Souls

Agent souls are not needed for the first presentation layer, but the data model should leave room for them.

Future fields:

- voice
- working style
- priorities
- escalation threshold
- memory scope
- preferred output format
- behavioral constraints
- company-specific context

This is where Nexus can feel alive without becoming unsafe.

## Design Rule

Agents may monitor, classify, synthesize, draft, and prepare work packets.

High-impact recommendations, external messages, connector writebacks, social posts, HR actions, financial actions, legal commitments, and canonical memory promotion require human approval.
