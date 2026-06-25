# NexusAI Govern and Assure Messaging

## Purpose
This document gives client-facing language for NexusAI's governance layer. It should be used in product briefs, pilot proposals, security reviews, and regulated-sector demos.

The goal is to describe oversight clearly without overclaiming autonomy.

The broader buyer-lane strategy is documented in `docs/USER_STRATEGY_AND_PIVOTS.md`. This document supplies the trust language for each lane while preserving the human-approval boundary.

## Core Message
NexusAI is designed as an evidence-backed executive intelligence layer with human accountability built in. Agents can retrieve, summarize, draft, and recommend, but consequential actions remain behind approval gates. Every output should be traceable to source evidence, policy controls, and review history.

## Short Product-Brief Copy
NexusAI includes a Govern and Assure layer: evidence provenance, sensitivity labels, human approval queues, agent control profiles, searchable logs, and rollback-ready output history. This lets leadership adopt AI assistants without giving them uncontrolled access to sensitive data or critical business actions.

## What To Say
- "NexusAI keeps source systems as the systems of record."
- "Recommendations are evidence-backed and approval-gated."
- "Agent permissions are defined through control profiles, not just prompt instructions."
- "Restricted or unprovenanced content is blocked from outbound summaries."
- "Every consequential output should be reviewable, explainable, and reversible."
- "The pilot runs in decision-support mode before any production automation is considered."

## What Not To Say
- Do not say agents are autonomous executives.
- Do not promise regulatory certification.
- Do not claim headcount reduction.
- Do not say NexusAI replaces ERP, CRM, HRIS, core banking, or legal review.
- Do not promise ROI without shadow-mode measurement.
- Do not call internal engine components OpenClaw in client-facing material.

## Buyer-Specific Framing

### CEO / Managing Director
NexusAI gives leaders a faster view of risks, decisions, blockers, and recommendations without losing accountability. The system is designed to accelerate understanding, not remove judgment.

### COO / Transformation Sponsor
NexusAI helps identify where work is blocked and where evidence is stale. The governance model makes it safe to start with a narrow workflow and expand only when the pilot proves value.

### CTO / CDO / CISO
NexusAI's controls are designed around least privilege, evidence provenance, sensitivity labels, audit trails, and agent-specific permissions. The critical security promise is that forbidden evidence should not enter model context.

### Risk / Compliance / Legal
NexusAI does not make binding compliance, legal, or regulatory commitments. It can prepare evidence-backed drafts and route high-risk outputs to the right human reviewer.

### Consulting Sponsor
NexusAI creates a repeatable transformation on-ramp: readiness assessment, workflow scoring, pilot scope, shadow-mode measurement, and governance hardening.

## Buyer-Lane Messaging

### Evaluator / SME
Use simple confidence and source language. Say: "NexusAI shows what it used, how confident it is, and what needs your review." Avoid enterprise governance jargon unless the user asks.

### SME Self-Serve
Lead with plain-language operating clarity. Say: "Start with one owner workflow, upload the sources you already use, and get a weekly brief with evidence links and human review."

### Business / Advisory
Lead with repeatable pilot structure. Say: "NexusAI helps turn a readiness result into a scored workflow pilot with a named sponsor, reviewer, evidence bundle, and measurable shadow ROI."

### Regulated Enterprise
Lead with controls before intelligence. Say: "NexusAI runs in decision-support mode with agent passports, approval gates, sensitivity controls, audit logs, and no autonomous source-system writeback."

## Security Review Language
For V1.1, NexusAI's governance hardening centers on Agent Control Profiles, searchable per-agent logs, rollback-ready output history, and learning-signal capture. These controls are designed so a reviewer can answer four questions for each agent:

- What is this agent for?
- What evidence can it see?
- What tools or APIs can it use?
- When must it escalate to a human?

## Pilot Proposal Paragraph
The pilot will run under a human-in-the-loop governance model. NexusAI will ingest approved evidence, generate role-aware intelligence outputs, and route recommendations through review queues. No autonomous source-system writeback, external communication, payment, filing, HR action, or legal/financial commitment is permitted in V1. The pilot will measure value through shadow-mode comparisons and reviewer decisions.

## One-Slide Version

```text
Govern and Assure

1. Evidence provenance: every claim links back to source material.
2. Sensitivity controls: restricted and unprovenanced data are blocked from unsafe surfaces.
3. Agent passports: each agent has explicit limits on data, tools, and actions.
4. Human approval: high-impact recommendations require review.
5. Audit and rollback: outputs are logged, searchable, and designed for versioned rollback.
```

## Acceptance Checklist
- Product materials say "decision support" before "automation."
- Client-facing language uses NexusAI, not internal engine names.
- Governance claims map to actual product controls or marked roadmap items.
- Regulated-sector proposals include human approval and no-autonomous-writeback language.
- ROI claims are tied to measured shadow-mode data.
