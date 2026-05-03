# NexusAI Model Routing Configuration

Prepared: 2026-05-03
Status: V1 operating policy

## Purpose

This document defines how Nexus should route model usage across surfaces, task types, and risk levels.

The goal is not "always use the cheapest model" or "always use the strongest model." The goal is:

- use lower-cost models where the output is internal, reversible, or draft-only
- use premium models where the output is sponsor-facing, high-impact, or tied to governance
- keep restricted data away from experimental routes
- ensure model choice supports trust, not just token savings

## Current Reality

The current Mission Control runtime executes through Anthropic today.

That means:

- `anthropic` is the only provider fully enabled now
- `openai` and `azure_openai` are present in workspace settings but not yet generalized in the shared runtime path
- very low-cost external models, including Chinese models routed via a gateway, are policy-defined but disabled by default in V1

This routing configuration is therefore both:

- an immediate operating policy
- a future-ready contract for the manager/orchestrator layer

## Core Rule

Nexus optimizes for **cost per trusted executive output**, not cost per million tokens.

That means:

- premium for final executive outputs
- standard for most governed retrieval and dashboard use
- economy for high-volume internal drafting and preprocessing
- no experimental low-cost route for restricted data or final sponsor-facing artifacts

## Route Matrix

| Surface | Mode | Default tier | Why |
|---|---|---|---|
| Web Ask | `ask` | `standard` | Fast evidence-backed answers with escalation path to premium |
| Slack Ask / brief reply | `ask` | `standard` / `restricted_safe` | Secondary summary surface with stronger safety posture |
| Dashboard cards | `think` | `premium` | Sponsor-visible synthesis from shared evidence base |
| Recommendation draft | `make` | `economy` | Internal draft stage is the right place to save cost |
| Recommendation final | `make` | `premium` | Approval-bound and often sponsor-visible |
| Decision memo | `run` | `premium` | High-trust artifact |
| Daily executive brief | `make` | `premium` | Exported leadership deliverable |
| Ingestion triage assist | `make` | `economy` | Internal preprocessing candidate |
| Review queue assist | `think` | `standard` | Internal operator help with governance context |
| Audit refusal / policy text | `run` | `restricted_safe` | Must prioritize safe, controlled refusal language |

## Model Tier Policy

### Economy

Use for:

- internal draft recommendations
- ingestion triage assistance
- classification and summarization that will be reviewed by a human or stronger model

Do not use for:

- sponsor-facing outputs
- final recommendations
- decision memos
- restricted evidence handling

### Standard

Use for:

- default Ask responses
- Slack summary answers
- review-queue explanations
- mid-risk governed synthesis

### Premium

Use for:

- dashboard cards
- final recommendations
- decision memos
- executive brief exports
- any task where factual framing quality directly affects sponsor trust

### Restricted Safe

Use when:

- restricted evidence is in play
- policy refusal behavior matters
- the route should stay on a high-trust model even if the task is short

## Chinese LLM Policy in Nexus

Cheap Chinese models can be attractive for volume-heavy workloads, especially for:

- internal classification
- first-pass chunk summarization
- non-final draft recommendation generation

But in Nexus V1 they should be treated as **experimental gateway models**, not as default production models.

### Allowed Future Uses

- non-restricted internal preprocessing
- draft-only tasks where a stronger model or human reviews the result
- large-volume low-risk batch workflows

### Disallowed V1 Uses

- restricted or confidential sponsor-facing summaries
- final dashboard synthesis
- final recommendations
- decision memos
- approval narratives
- refusal and policy-block explanations

The reason is straightforward: Nexus wins on trust. Anything that can weaken sponsor confidence or create uncomfortable policy questions should stay on the premium governed path until there is real evaluation data proving otherwise.

## Fallback Policy

Every route must define a fallback chain.

V1 default pattern:

1. try the route's default tier
2. if the task is high-impact or confidence is low, escalate upward
3. if the task is internal and draft-only, it may start lower and refine upward
4. never silently downgrade sponsor-facing artifacts to experimental low-cost models

## Governance Rules

The following rules are mandatory:

1. No experimental low-cost model may be the final pass for sponsor-facing output.
2. No restricted-data route may use the experimental model pool.
3. Recommendation and decision outputs must use premium finalization before approval.
4. Slack outputs remain shorter and safer than Mission Control outputs, even when based on the same evidence.
5. If evidence confidence is low, the answer should refuse or escalate rather than route to a cheaper model and guess.

## Where the Config Lives

The typed routing config lives in:

- [model-routing.ts](/Users/alijanjua/Documents/Playground/nexus-core/apps/mission-control/lib/config/model-routing.ts)

The test coverage for the config lives in:

- [model-routing.test.ts](/Users/alijanjua/Documents/Playground/nexus-core/apps/mission-control/tests/model-routing.test.ts)

## Recommended Next Step

The next implementation step is to connect the shared LLM execution path to this routing table so that:

- route selection is explicit
- premium escalation is deterministic
- future provider support can be added without rewriting route policy
