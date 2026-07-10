# NexusAI AI Operating Model

Status: V1 operating policy
Updated: 2026-05-30

## Purpose

NexusAI uses AI to speed up executive understanding, not to replace executive judgement. The system may detect, classify, summarize, reason, recommend, draft, monitor, route, and prepare actions, but consequential actions remain human-approved in V1.

## AI Modes

| Mode | Meaning | V1 examples |
|---|---|---|
| Detect | Identify patterns or categories from user input or evidence | Company sector detection, file department suggestion, stale evidence detection |
| Extract | Pull structured information from source material | Document text extraction, source metadata extraction |
| Classify | Assign labels and routing | Sensitivity, department, dashboard lens, document type |
| Summarize | Compress source-backed material | Evidence summaries, Slack-safe briefs, dashboard snippets |
| Reason | Compare evidence and infer implications | Risk synthesis, bottleneck analysis, decision context |
| Recommend | Propose action candidates | Recommendation drafts, risk mitigations, upload-pack suggestions |
| Draft | Prepare editable artifacts | Briefs, memos, review notes, approval narratives |
| Monitor | Watch for changes or thresholds | Stale data, low-confidence evidence, connector health |
| Route | Send work to the right surface or role | Dashboard recommendation, review queue, approval path |
| Act-with-Approval | Prepare an action that requires a human | Outbound packs, connector writebacks, high-impact recommendations |

## Trust Levels

| Level | Definition | Human role |
|---|---|---|
| Deterministic system action | Rule-based action with no LLM judgement | System may execute automatically |
| AI-assisted suggestion | AI proposes a label, role, route, or next question | User may accept or edit |
| AI-generated draft | AI creates editable text or analysis | User reviews before relying on it |
| Human-approved output | AI output has been reviewed and approved | May be used in executive workflow |
| Blocked/refused output | AI cannot safely answer or act | User receives reason and next step |

## Global Output Contract

Every user-visible AI output should include or be backed by:

- answer or draft text
- confidence
- evidence references when evidence is used
- freshness or source timestamp
- sensitivity class
- reasoning note or brief rationale
- suggested next action
- refusal reason when the system cannot answer safely

The UI may hide some fields for readability, but the API and audit trail should preserve them where practical.

## Autonomy Boundaries

AI may act autonomously only for low-risk, reversible internal tasks:

- company profile suggestions
- role and dashboard suggestions
- file department and sensitivity suggestions
- search expansion
- low-risk draft generation
- non-sensitive summaries
- stale or weak-evidence flags

AI must ask for approval before:

- promoting recommendations or memory to canonical status
- sending outbound executive packs
- posting externally
- applying connector writebacks
- completing agent tasks with operational impact
- summarizing restricted data outside Mission Control
- using sensitive evidence in Slack or other secondary surfaces

AI must never perform in V1:

- financial transactions
- HR actions
- legal commitments
- contract approvals
- system writebacks without explicit approval
- social posting
- external commitments on behalf of the company

## Model Routing Policy

The typed routing table lives in:

- `apps/mission-control/lib/config/model-routing.ts`

The policy is documented in:

- `docs/MODEL_ROUTING.md`

Routing principles:

- use economy models for internal, reversible, reviewable preprocessing
- use standard models for normal Ask and review-assist tasks
- use premium models for sponsor-facing executive synthesis
- use restricted-safe routes for policy/refusal and restricted-data handling
- never route restricted data or final sponsor-facing output to experimental providers in V1

## Cost and Latency Budgets

| Task type | Target tier | Budget principle |
|---|---|---|
| File triage and classification | Economy or deterministic | Optimize for volume and retry safety |
| Company profile detection | Standard | Fast onboarding, editable by user |
| Ask answer | Standard | Responsive answer with evidence refusal if weak |
| Dashboard synthesis | Premium | Trust beats token cost |
| Recommendation draft | Economy or standard | Cheap first pass is acceptable because approval follows |
| Recommendation final | Premium | High-impact output requires stronger synthesis |
| Refusal and policy text | Restricted-safe | Safety and consistency beat cost |

## Fallback Policy

When a provider fails:

1. retry once for transient network or rate-limit errors
2. fall back to the next allowed provider/tier for the task
3. use deterministic fallback when available, such as filename classification or sector defaults
4. route to human review when confidence is low or evidence is insufficient
5. never silently downgrade final or restricted outputs to an experimental route

## Audit Events

AI-related events should be append-only and tenant/workspace scoped. V1 events should include:

- event type
- workspace ID
- actor or surface
- model route or prompt name when available
- input class, not raw sensitive input unless explicitly allowed
- evidence IDs used
- output status: generated, refused, downgraded, approved, rejected, or failed
- confidence
- timestamp

The existing `audit_events` table is the V1 sink. A dedicated AI-generation table can be added later if token-level cost tracking becomes necessary.

For long-running or autonomous AI work, apply `docs/ENGINEERING_GUARDRAILS.md`: return visible job/run IDs for async effects, write append-only run events, model runner states as discriminated unions, and distinguish proof failure from timeout, OOM, permission denial, policy denial, and provider outage.

## Evaluation Harness

The V1 golden prompt set should cover:

- top risks from approved evidence
- decisions about a named topic
- recommendation generation with evidence coverage
- sector/company profile classification
- file department/sensitivity classification
- source-grounding refusal
- restricted-data refusal on Slack
- stale evidence warning

Passing criteria:

- no invented evidence references
- no restricted evidence in Slack-safe summaries
- no recommendation promotion without approval
- clear refusal reason when evidence is missing or weak

## Prompt Registry

Every durable prompt should have:

- name
- owner
- surface
- mode
- version
- allowed data classes
- expected output schema
- changelog note

Current prompt-like behavior starts in services such as `company-detection.ts`, `retrieval.ts`, and dashboard synthesis. Formal registry extraction is a follow-on implementation step.

## Hallucination Controls

Mandatory controls:

- cite evidence when using source material
- refuse weak or missing evidence instead of guessing
- show confidence and freshness
- never invent source IDs, owners, or dates
- separate user-provided context from system inference
- quarantine low-confidence extraction before executive synthesis

## Red-Team Checks

Red-team coverage should test:

- sensitive data leakage
- unsupported executive claims
- unsafe recommendations
- role-inappropriate output
- prompt injection inside uploaded documents
- Slack/Teams redaction boundaries
- connector writeback attempts without approval
- social posting attempts

## Workspace-Level AI Policy Settings

V1 policy settings should include:

- allowed providers
- local-only mode for restricted data
- sensitivity thresholds
- quarantine threshold
- approval requirements
- Slack/secondary-surface restrictions
- permitted connectors and writeback modes

## Per-Phase AI Responsibility Map

| Phase | AI detects | AI drafts | AI routes | Human approves |
|---|---|---|---|---|
| Phase 2 Trust Model | Unsafe patterns, missing evidence, restricted data | Policy/refusal language | Review vs refusal | Policy changes |
| Phase 5 Company Context | Sector, roles, KPIs, risks, document starter pack | Profile rationale | Dashboard and upload-pack suggestions | Confirmed workspace profile |
| Phase 6 Evidence Governance | Department, sensitivity, weak extraction, stale records | Review notes | Quarantine, pending approval, processed | Evidence approval and overrides |
| Phase 7 Pilot Packaging | Brief themes, risks, decisions, recommendation coverage | Briefs and registers | Sponsor-ready artifact queue | Final external pack |
| Phase 8 Team Members | Suggested member lens and access defaults | Invite rationale | Role/lens suggestions | Permissions and invitations |
| Phase 9 Connectors | Source type, sync issues, anomalies | Connector summaries | Read-only vs approval-required flows | Writebacks and sensitive sync |
| Phase 10 Social Signals | Brand risk, campaign signals, sentiment | Social recommendations | Read-only analytics surfaces | Any post or external response |
| Phase 11 Company Memory | Candidate entities, links, contradictions | Entity summaries | Memory promotion queue | Canonical memory |
| Phase 12 Hybrid Local | Local-only data, restricted files | Redacted summaries | Cloud vs local processing | Sync policy and release |
| Phase 13 Agents | Agent tasks, blockers, learning signals | Work packets and memos | Escalation and handoff | High-impact task completion |
| Phase 14 Obsidian Experience | Graph links and clusters | Narrative paths | Canvas/map suggestions | Visible/canonical graph state |
