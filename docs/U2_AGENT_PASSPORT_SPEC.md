# NexusAI U2 Agent Control Profile (Passport) Specification

## Status
Shipped/historical V1.1 specification.

U2 Agent Control Profiles are complete for the current V1.1 product surfaces: passport persistence, evidence filtering, output gates, hard stops, tool guards, suspend/resume, and Settings governance UI are built. Use this document as the product/security spec, not as the current task list. Use `TASKS.md`, `BACKLOG.md`, and `HANDOVER.md` for execution status.

This repository document is the versioned product spec for U2. It distills the detailed source specification from the local Downloads file into the core controls, implementation boundaries, and acceptance checks that should remain visible in the NexusAI repo.

## Purpose
An Agent Control Profile, or passport, is a first-class object attached to every agent. It defines:

- What the agent may see
- What tools or APIs it may use
- What action level it may take
- When it must escalate to a human
- What logs and oversight apply to it

The security principle is simple: every control is enforced server-side. Prompt-only restrictions do not count.

## V1 Action Rights Ladder

| Level | Right | Meaning |
| --- | --- | --- |
| 0 | `retrieve` | Search and read only |
| 1 | `summarize` | Read and condense |
| 2 | `draft` | Produce a draft, no recommendation |
| 3 | `recommend` | Draft plus a reasoned recommendation |
| 4 | `prepare_for_approval` | Assemble a ready-to-action item, still gated |

Autonomous send, commit, submit, payment, filing, source-system writeback, legal commitment, financial commitment, HR action, and external posting are not available in V1.

## Passport Fields

| Group | Fields |
| --- | --- |
| Identity | `id`, `workspaceId`, `agentKey`, `name`, `purpose`, `version`, `status` |
| Data controls | `allowedScopes`, `forbiddenScopes`, `maxSensitivity`, `crossEntityAccess` |
| Tool controls | `allowedTools`, `forbiddenTools`, `policyControlledApis` |
| Action controls | `actionRight`, `hardStops`, `escalationTriggers`, `approvalLevel` |
| Oversight | `riskRating`, `reviewCadence`, `watcherAgents`, `logLevel` |
| Audit | `createdBy`, `createdAt`, `updatedBy`, `updatedAt` |

## Status Values
- `draft`: created but not active
- `active`: usable by agent runtime
- `suspended`: cannot retrieve evidence, call tools, produce outputs, or appear as runnable

## Sensitivity Ladder
- `public`
- `internal`
- `confidential`
- `restricted`

Missing or unlabeled sensitivity defaults to `restricted`.

## Default Hard Stops
- `send_email`
- `submit_filing`
- `make_payment`
- `modify_contract`
- `contact_regulator`
- external posting
- source-system writeback
- HR action
- legal commitment
- financial commitment

## Default Escalation Triggers
- Legal interpretation
- Regulatory commitment
- Statement of compliance
- Pricing or fee commitment
- Data residency statement
- Data protection statement
- Cross-entity data access
- External communication
- Financial figure above configured threshold

## Evidence Retrieval Boundary
Evidence must be filtered before vector search, keyword search, reranking, summarization, or model context assembly.

```text
canReadEvidence(object, passport):
  deny if passport.status is not active
  deny if object.sensitivity is missing
  deny if object.scope is forbidden
  deny if object.scope is not allowed
  deny if object.sensitivity exceeds passport.maxSensitivity
  deny if cross-entity access is attempted and passport.crossEntityAccess is false
  allow otherwise
```

Every deny writes an audit event with workspace, agent, object, sensitivity, scope, and reason.

## Tool Invocation Boundary

```text
canUseTool(tool, passport, action):
  deny if passport.status is not active
  deny if tool is forbidden
  deny if tool is not explicitly allowed
  deny if requested action exceeds passport.actionRight
  deny if tool maps to a hard stop
  deny if policy-controlled API constraints fail
  allow otherwise
```

Tool enforcement must be independent of model prompt text.

## Output Gate
Before output leaves the server:

- Detect deterministic high-risk triggers first.
- Use model classification only as a secondary check.
- Route triggered outputs to human review.
- Block hard-stop actions.
- Log the decision and reason.

## Versioning Requirement
Passport changes never overwrite the previous profile. A change creates a new version row. The history must answer who changed what, when, and why.

## Minimum Database Shape
The `agent_control_profiles` table should include:

- `workspace_id`
- `agent_key`
- `name`
- `purpose`
- `version`
- `status`
- `allowed_scopes`
- `forbidden_scopes`
- `max_sensitivity`
- `cross_entity_access`
- `allowed_tools`
- `forbidden_tools`
- `policy_controlled_apis`
- `action_right`
- `hard_stops`
- `escalation_triggers`
- `approval_level`
- `risk_rating`
- `review_cadence`
- `watcher_agents`
- `log_level`
- `created_by`
- `created_at`
- `updated_by`
- `updated_at`

Required constraints:
- Unique `(workspace_id, agent_key, version)`
- Index `(workspace_id, agent_key, status)`

## Required Repository Methods
- List active profiles
- Get active profile by agent key
- Get profile history
- Create new version
- Suspend agent
- Resume agent by creating a new version
- Audit profile update

The in-memory fallback must mirror database behavior for local development.

## Demo Passports
Seed three demo profiles for regulated-sector demos:

| Agent | Purpose | Default Sensitivity | Action Right | Approval |
| --- | --- | --- | --- | --- |
| Regulatory Response Agent | Draft evidence-backed responses to regulator questions | `confidential` | `prepare_for_approval` | partner/client |
| Legal Redline Agent | Summarize clauses and draft redline notes | `confidential` | `draft` | partner |
| Proposal Partner Agent | Draft proposal sections from approved source material | `internal` | `recommend` | owner |

## Acceptance Tests
- An agent denied a forbidden scope receives no content and the attempt is logged.
- An agent denied above its sensitivity ceiling receives no content and the attempt is logged.
- Unlabeled evidence is treated as restricted and denied unless explicitly allowed.
- Vector search cannot leak forbidden content because filters run before search.
- A hard-stop action is blocked and logged.
- Regulatory interpretation routes to human review regardless of action right.
- Editing a passport creates a new version and retains the old version.
- A suspended agent cannot retrieve, call tools, or generate outputs.
- Prompt injection cannot alter passport limits because enforcement is outside the prompt.

## Build Order
1. Add contracts and enums.
2. Add database migration and in-memory fallback.
3. Seed default passports from the agent library.
4. Enforce evidence retrieval boundaries.
5. Enforce tool invocation boundaries.
6. Add output gate and escalation.
7. Build Settings -> Agent Governance reviewer UI.
8. Add tests for deny, escalation, versioning, and suspension.
