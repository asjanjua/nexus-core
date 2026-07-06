# Agent Skill Sourcing Review

Date: 2026-07-06

This note maps the current Nexus skill taxonomy to build/adopt decisions and GitHub-sourced candidates. The goal is not to install a large external bundle. The goal is to identify which skills should remain Nexus-native runtime capabilities, which public skills are good references, and which GitHub packages are worth testing as operator/developer aids.

## Selection Rules

- Prefer Nexus-native implementation when the skill touches tenant data, audit logs, evidence provenance, approvals, legal/regulatory judgment, or writeback.
- Prefer external skills as references when they encode a strong workflow pattern but assume a different runtime, connector model, or risk boundary.
- Prefer installable GitHub skills only when the scope is narrow, the repo is inspectable, the license is acceptable, and the skill does not need broad secrets or production write access.
- Do not bulk-install aggregator repos. Use them for discovery only.
- Any adopted skill must be reviewed for prompt injection risk, tool access, scripts, network calls, license, and maintenance status before it reaches project-local `.claude/skills`, `.github/skills`, `.agents/skills`, or Codex skill paths.

## Nexus-Native Build Decision

The runtime path is now first-party Nexus skills, not GitHub installs. External repositories remain useful as pattern references, but production behavior should live in typed Nexus registries and services.

Implemented native catalog:

- `apps/mission-control/lib/agents/nexus-native-skills.ts`
- `apps/mission-control/app/api/agents/native-skills/route.ts`
- Settings → Agent Governance → Nexus Native Skills
- `apps/mission-control/tests/agent-skills.test.ts`

Initial first-party skill pack:

| Native skill | Runtime status | Primary use |
| --- | --- | --- |
| `evidence_grid_review` | designed | Source-backed review grids, issue flags, missing evidence, and reviewer escalations. |
| `agent_governance_review` | designed | Passport, tool-right, approval, learning-signal, and audit readiness review. |
| `vantage_diligence_analysis` | planned | Vantage diligence coverage, red flags, model tie-outs, and IC memo sections. |
| `quorum_governance_review` | planned | Board-pack evidence, decision records, obligations, and approval boundaries. |
| `meridian_compliance_review` | planned | Requirement coverage, compliance gaps, reviewer packets, and filing caveats. |
| `document_integrity_review` | designed | PDF/DOCX/XLSX/export extraction quality, source spans, and tabular integrity. |
| `knowledge_workspace_synthesis` | planned | Source-backed workspace synthesis from notes, graph refs, memory, and evidence. |

The next runtime slice should be executable `evidence_grid_review`: input governed evidence records and source spans; output review grid rows, issue flags, missing-evidence notes, and reviewer escalations; emit audit events; require human approval before findings drive recommendations or actions.

## Best External Sources Found

| Source | Best use in Nexus | Notes |
| --- | --- | --- |
| `github/awesome-copilot@agent-governance` | Reference for agent passports, policy checks, audit trails, rate limits, and tool restrictions. | Strongest fit for our governance layer because it directly matches passports, action rights, tool denial, and auditability. |
| `anthropics/knowledge-work-plugins` legal skills | Reference for contract review, compliance check, NDA triage, and legal workflow boundaries. | Good for Quorum/Meridian patterns. Keep as reference unless license/runtime fit is confirmed. |
| `anthropics/financial-services` | Reference for Vantage diligence, IC memo, financial analysis, and private-equity workflow packaging. | Strong conceptual fit for Vantage, but outputs must remain draft work product for human sign-off. |
| `anthropics/skills` document skills | Reference for PDF/DOCX/XLSX/PPTX handling patterns. | Useful for ingestion and exports. Document skills may be source-available rather than open source, so do not vendor blindly. |
| `anthropics/claude-for-legal` tabular review | Reference for batch diligence grids with citations per cell. | Very strong for Vantage and Quorum document-grid workflows. |
| `kepano/obsidian-skills` | Optional operator aid for Knowledge Workspace and Obsidian-style vaults. | Good fit if Nexus keeps Markdown/JSON Canvas interoperability. |
| `adhikasp/mcp-git-ingest` | Optional tool candidate for GitHub repo ingestion/browse. | Useful for reading repository structure and selected files. Needs sandboxing and allowlists. |
| `browser-use/browser-use` | Optional research candidate for external browser automation. | Do not make core runtime dependency until sandboxing, account isolation, and audit controls are designed. |
| `vercel-labs/skills` / `npx skills` | Discovery and validation workflow. | Use to find candidates, not as an automatic install path. |

## Current Nexus Skills

### Ingest

| Nexus skill | Best path | GitHub candidates / references | Decision |
| --- | --- | --- | --- |
| `ingest sources` | Nexus-native. | `adhikasp/mcp-git-ingest` for GitHub repo reads; OpenAI Agents hosted tools/MCP patterns as architecture reference. | Build. External tools can feed the ingestion pipeline only through governed connector policy. |
| `read documents` | Hybrid. | `anthropics/skills` PDF/DOCX/PPTX; `tfriedel/claude-office-skills` as older office-skill package. | Use as reference. Keep extraction/provenance inside Nexus. |
| `read spreadsheets` | Hybrid. | `anthropics/skills` XLSX; Skills CLI hits: `apetta/agent-xlsx`, `gmickel/sheets-cli`, `paulrberg/agent-skills@spreadsheets`. | Test one spreadsheet aid separately; runtime stays Nexus-native. |
| `read contracts` | Reference-led build. | `anthropics/knowledge-work-plugins@review-contract`, `claude-office-skills/skills@contract-review`, `anthropics/claude-for-legal`. | Build Nexus-native contract evidence model; adapt playbook structure and human-review language. |

### Browse

| Nexus skill | Best path | GitHub candidates / references | Decision |
| --- | --- | --- | --- |
| `browse sources` | Nexus-native with optional MCP/browser tools. | `browser-use/browser-use`, MCP reference servers, OpenAI Agents web/file/hosted MCP tools. | Build guarded source browsing. Browser automation stays experimental. |
| `search evidence` | Nexus-native. | OpenAI File Search / vector-store patterns are useful references. | Build/keep in `retrieval.ts` and embeddings. |
| `search memory` | Nexus-native with vault interoperability. | `kepano/obsidian-skills`. | Build around Knowledge Workspace; use Obsidian skills for local operator workflows. |
| `search audit` | Nexus-native. | `github/awesome-copilot@agent-governance`. | Build; external source is pattern reference only. |

### Review

| Nexus skill | Best path | GitHub candidates / references | Decision |
| --- | --- | --- | --- |
| `review evidence` | Nexus-native. | `github/awesome-copilot@agent-governance`; `anthropics/knowledge-work-plugins`. | Build. This is central to provenance and tenant trust. |
| `review approvals` | Nexus-native. | `github/awesome-copilot@agent-governance`. | Build. Approval logic must match passports/action rights. |
| `review compliance` | Reference-led build. | Skills CLI hit: `anthropics/knowledge-work-plugins@compliance-check`; `prowler-cloud/prowler@prowler-compliance-review` for cloud compliance. | Build domain-specific Meridian/Quorum compliance review; do not rely on generic compliance skill for legal conclusions. |

### Analyze

| Nexus skill | Best path | GitHub candidates / references | Decision |
| --- | --- | --- | --- |
| `summarize` | Nexus-native. | Generic skills add little value. | Build. |
| `analyze evidence` | Nexus-native. | Agent governance and financial-services examples as workflow references. | Build. |
| `summarize variance` | Hybrid. | `anthropics/financial-services` financial-analysis and model/update patterns. | Build Nexus finance agent; adapt financial-services patterns. |
| `summarize feedback` | Nexus-native. | None compelling from this pass. | Build. |
| `summarize social exports` | Nexus-native. | None compelling from this pass. | Build around current connector/export source types. |
| `summarize exports` | Nexus-native. | Spreadsheet skills can help operator-side analysis. | Build. |
| `extract action items` | Nexus-native. | Generic PM/risk skills exist but are not core. | Build. |
| `extract risks` | Reference-led build. | `anthropics/financial-services`, `anthropics/knowledge-work-plugins`, risk-register skills. | Build. Use references for output shape. |
| `extract obligations` | Reference-led build. | `review-contract`, `compliance-check`, `claude-for-legal` tabular review. | Build for Meridian/Quorum. Human legal review required. |
| `extract metadata` | Hybrid. | Document/spreadsheet skills. | Build extraction in Nexus; external skills help implementation recipes. |
| `extract themes` | Nexus-native. | Knowledge-work examples. | Build. |
| `extract blockers` | Nexus-native. | PM skills are reference only. | Build. |
| `compare documents` | Reference-led build. | `claude-for-legal@tabular-review`, `review-contract`. | Build comparison workflow with cited cells/claims. |
| `compare decisions` | Nexus-native. | None needed. | Build from `decisions`, `actions`, `agent_outputs`. |
| `compare spreadsheets` | Hybrid. | `anthropics/skills` XLSX, `apetta/agent-xlsx`, `gmickel/sheets-cli`. | Test external operator skill; runtime remains governed. |
| `compare campaigns` | Nexus-native. | No strong GitHub hit in this pass. | Build on source-type contracts. |
| `compare plans` | Nexus-native. | Workflow/PM skills can inspire templates. | Build. |
| `compare roadmap` | Nexus-native. | Product planning skills can inspire templates. | Build. |

### Act

| Nexus skill | Best path | GitHub candidates / references | Decision |
| --- | --- | --- | --- |
| `draft memo` | Nexus-native templates, reference-led. | `anthropics/financial-services` IC memo patterns; legal/contract memo patterns. | Build product-specific memo templates. |
| `draft recommendation` | Nexus-native. | Financial/legal workflow examples. | Build with approval gates. |
| `prepare approval packet` | Nexus-native. | Agent governance and legal plugins. | Build as a core governed artifact. |
| `create task` | Nexus-native with connector adapters later. | Jira/GitHub MCP or connector-specific skills can help later. | Build internal action records first; source-system writeback requires explicit approval. |
| `send Slack update` | Nexus-native with Slack connector policy. | Skills CLI hits: `404kidwiz/claude-supercode-skills@slack-expert`, `cowork-os/cowork-os@slack`, `michaelliv/dotskills@slack-cli`. | Build draft/send boundary in Nexus; do not install a broad Slack skill into runtime. |

## Shortlist To Test First

1. `github/awesome-copilot@agent-governance`
   - Why: directly maps to passports, tool rights, output gates, audit trails, and policy checks.
   - Use: reference and possibly project-local developer skill.

2. `anthropics/knowledge-work-plugins@review-contract` and `anthropics/knowledge-work-plugins@compliance-check`
   - Why: best match for Quorum/Meridian review and compliance patterns.
   - Use: reference for playbook structure, escalation language, and review artifacts.

3. `anthropics/financial-services` private-equity skills, especially `dd-checklist`
   - Why: strongest match for Vantage diligence and IC handoff.
   - Use: reference for diligence-workstream structure and source-backed memo flow.

4. `anthropics/claude-for-legal@tabular-review`
   - Why: excellent pattern for batch document review with citations per cell.
   - Use: adapt for Vantage data-room grids and Quorum/Meridian evidence matrices.

5. `anthropics/skills` document skills
   - Why: practical PDF/DOCX/XLSX/PPTX patterns.
   - Use: implementation reference for document parsing/export, not automatic vendoring.

6. `kepano/obsidian-skills`
   - Why: direct fit for Knowledge Workspace, Markdown vaults, and JSON Canvas style workflows.
   - Use: optional operator aid if we want a Nexus-to-Obsidian bridge.

7. `adhikasp/mcp-git-ingest`
   - Why: clean fit for GitHub repository structure and important-file reads.
   - Use: optional MCP candidate for GitHub evidence ingestion after sandbox review.

## Fine-Tooth Ranking

| Rank | Candidate | Best Nexus use | Verdict |
| --- | --- | --- | --- |
| 1 | `anthropics/claude-for-legal@tabular-review` | Evidence grids for Vantage data rooms, Quorum evidence matrices, and Meridian compliance review. | Highest implementation priority. Rebuild pattern inside Nexus; do not install repo. |
| 2 | `github/awesome-copilot@agent-governance` | Policy composition, pre-flight intent checks, tool gates, audit events. | Strongest governance reference. Adapt patterns into passports/dispatcher. |
| 3 | `anthropics/financial-services` private-equity skills | Vantage diligence coverage, red flags, sector overlays, IC memo scaffolding. | Strong Vantage blueprint. Reference only until deal packs/model checks exist. |
| 4 | `anthropics/knowledge-work-plugins` legal skills | Quorum/Meridian playbooks, contract review, compliance packets, escalation language. | Strong workflow reference. Needs jurisdiction packs and reviewer gates. |
| 5 | `anthropics/skills` document skills | PDF/DOCX/XLSX quality bars for extraction, exports, and spreadsheet integrity. | Reference only because document skills are source-available/proprietary. |
| 6 | `kepano/obsidian-skills` | Knowledge Workspace and local vault/operator workflows. | Plausible local operator aid, not Nexus runtime. |
| 7 | `adhikasp/mcp-git-ingest` | Read-only GitHub repository ingestion. | Tool candidate, not skill. Needs sandbox/allowlists. |
| 8 | `browser-use/browser-use` | Future governed web research or browser smoke support. | Experimental tool candidate. Needs isolated browser policy. |

No reviewed candidate should be installed into Nexus runtime as-is. The next product step is a typed registry that makes these distinctions visible: `reference_only`, `operator_skill`, `tool_candidate`, and eventually `runtime_candidate` after sandbox, license, evidence, and approval checks.

## Shortlist Test Harness

The shortlist is now represented in `apps/mission-control/lib/agents/external-skill-candidates.ts` and tested in `apps/mission-control/tests/agent-skills.test.ts`.

The first tests assert:

- every candidate maps only to known Nexus skills and known workflow IDs
- ranking stays fixed unless intentionally changed
- no GitHub candidate is marked `runtime_candidate`
- source-available/proprietary document skills remain non-installable
- tool candidates stay sandbox-gated
- every candidate carries explicit runtime blockers

## Fine-Tooth Candidate Reviews

### 1. `github/awesome-copilot@agent-governance`

Source: `https://github.com/github/awesome-copilot/blob/main/skills/agent-governance/SKILL.md`

License: MIT (`https://github.com/github/awesome-copilot/blob/main/LICENSE`)

Package shape: one `SKILL.md` in `skills/agent-governance`, 569 lines on the GitHub page at review time. No scripts or bundled assets were found in the skill folder during this pass.

Status: reviewed as `reference_only`.

Install decision: do not install into Nexus runtime. Consider later as a project-local operator/developer skill only after a local skill-path review. The patterns are useful, but the examples are generic Python and should be adapted into Nexus TypeScript instead of vendored.

Mapped Nexus skills:

- `search audit`
- `review approvals`
- `review evidence`
- `review compliance`
- `prepare approval packet`
- `analyze evidence`

Mapped Nexus workflows:

- `agent_governance`
- `recommendation_approval`
- `evidence_review`
- `workflow_twin_shadow`
- `agent_room_briefs`

What fits Nexus:

- Policy-as-configuration aligns with `AgentControlProfile`, `allowedTools`, `forbiddenTools`, `hardStops`, escalation triggers, and pivot-specific agent passports.
- Most-restrictive-wins policy composition matches Nexus' direction for org, workspace, room, agent, and job-level controls.
- Pre-flight intent classification fills a real gap: Nexus already has output gates, but tool requests and user instructions should be classified before dispatch and before connector writeback.
- Tool-level governance maps cleanly to future guarded wrappers around retrieval, connector reads, task creation, Slack draft/send, and any source-system writeback.
- Append-only audit trail guidance matches Nexus' existing audit-first posture and should shape any future agent-governance event schema.

Gaps and risks:

- Runtime examples are Python; Nexus implementation should stay in TypeScript/Next.js and use the existing agent passport and dispatcher modules.
- Regex examples are illustrative only. They are not enough for financial, legal, regulatory, or tenant-data production controls.
- The external skill's `allowed_tools`, `blocked_tools`, and `require_human_approval` model does not map one-to-one to Nexus `allowedTools`, `forbiddenTools`, `hardStops`, `escalationTriggers`, and `actionRight`.
- The rate-limit example is in-memory. Nexus needs persisted workspace, agent, tool, and connector counters if this becomes runtime behavior.
- Trust scoring is useful as a signal, but must not weaken the human approval boundary for legal, financial, HR, filing, regulator, source-system writeback, or external communication actions.

Adoption verdict:

- Adopt the pattern, not the code.
- Treat as the strongest governance reference in this pass.
- Promote to `operator_skill` only if we want a local developer aid for reviewing future governance changes.
- Do not promote to `runtime_candidate` until Nexus has a typed external-skill registry, install review checklist, and tool-permission manifest.

Implementation deltas to consider:

1. Add pre-flight intent classification before Ask, dispatch, and tool invocation.
2. Add a policy-composition helper for org, workspace, room, agent, and job controls.
3. Add per-tool human-review mappings for `send Slack update`, `create task`, and future writebacks.
4. Add persisted per-agent and per-tool rate limits.
5. Add audit events for intent classification, policy denials, human-review holds, and tool-governance decisions.

### 2. `anthropics/knowledge-work-plugins` legal skills

Sources:

- `https://github.com/anthropics/knowledge-work-plugins/blob/main/legal/README.md`
- `https://github.com/anthropics/knowledge-work-plugins/blob/main/legal/skills/review-contract/SKILL.md`
- `https://github.com/anthropics/knowledge-work-plugins/blob/main/legal/skills/compliance-check/SKILL.md`

License: Apache-2.0 (`https://github.com/anthropics/knowledge-work-plugins/blob/main/LICENSE`)

Package shape: full legal productivity plugin with multiple skills and connector assumptions. The reviewed files were `review-contract` (358 lines on GitHub at review time) and `compliance-check` (274 lines). The legal README describes the plugin as primarily for in-house legal teams, designed for Cowork while also working in Claude Code, with playbook customization through local configuration.

Status: reviewed as `reference_only`.

Install decision: do not install into Nexus runtime. Consider a project-local operator/developer copy only if we create a legal-skill sandbox that cannot access tenant production data or write to external systems. These are strong playbooks, but Nexus should translate the patterns into jurisdiction-aware Quorum, Meridian, and Vantage workflows.

Mapped Nexus skills:

- `read contracts`
- `review compliance`
- `extract obligations`
- `extract risks`
- `compare documents`
- `draft recommendation`
- `prepare approval packet`
- `draft memo`

Mapped Nexus workflows:

- `evidence_review`
- `recommendation_approval`
- `pivot_delivery`
- `executive_synthesis`
- `agent_room_briefs`

What fits Nexus:

- Contract review starts by gathering side, deadline, focus areas, and deal context. That maps well to Nexus workflow intake before an agent reviews evidence.
- The playbook model is a strong pattern for vertical packs: standard positions, acceptable ranges, and escalation triggers can become Quorum governance packs, Meridian jurisdiction packs, and Vantage deal-review packs.
- Clause-by-clause review is a clean fit for `compare documents`, `extract obligations`, and `extract risks`.
- GREEN/YELLOW/RED deviation routing is useful for evidence matrices, approval packets, and human escalation queues.
- Compliance-check output already separates applicable rules, requirements, risk areas, recommended actions, approvals, and further review. That is close to the shape Nexus needs for governed recommendation packets.
- DPA and privacy checklist structure is useful for Meridian regulatory workflows and Quorum board risk packs.

Gaps and risks:

- The plugin explicitly frames outputs as legal workflow assistance, not legal advice. Nexus must preserve that boundary everywhere this pattern is adapted.
- The README notes default examples reflect U.S. legal positions and specific jurisdictions. Nexus cannot reuse those defaults for UAE, EU, UK, Pakistan, or other target markets without jurisdiction packs.
- Compliance law changes frequently. Any runtime Meridian workflow needs current authoritative-source verification, not static plugin text.
- The source assumes broad connectors such as Slack, Box, Egnyte, Jira, and Microsoft 365. Nexus connector access must stay behind workspace permission manifests and audit logs.
- The skills do not emit Nexus-native evidence IDs, confidence model, provenance records, or approval event IDs.
- Redline generation is helpful, but production redlines or external negotiation language must remain attorney-reviewed and approval-gated.

Adoption verdict:

- Adopt the workflow shapes, not the installed plugin.
- Treat `review-contract` as the best reference for `read contracts`, `compare documents`, `extract obligations`, and `prepare approval packet`.
- Treat `compliance-check` as a strong reference for Meridian compliance review and Quorum board risk review, with jurisdiction-specific replacement content.
- Do not promote to `runtime_candidate` until Nexus has domain packs, source citation requirements, attorney/reviewer gates, and a connector permission manifest.

Implementation deltas to consider:

1. Add a `legalPlaybookPack` or broader `domainReviewPack` concept with standard positions, acceptable ranges, escalation triggers, and jurisdiction metadata.
2. Add contract/evidence review output that requires clause references, evidence IDs, severity, business impact, and reviewer-required flags.
3. Add Meridian compliance packet sections for applicable requirements, unknowns, approval owners, further review, and authoritative-source verification.
4. Add Quorum board risk packet sections for director-facing summary, material issues, decision needed, and counsel/reviewer escalation.
5. Keep all legal/compliance recommendations in draft state until a qualified human reviewer approves them.

### 3. `anthropics/financial-services` private-equity skills

Sources:

- `https://github.com/anthropics/financial-services`
- `https://github.com/anthropics/financial-services/blob/main/plugins/vertical-plugins/private-equity/skills/dd-checklist/SKILL.md`
- `https://github.com/anthropics/financial-services/blob/main/plugins/vertical-plugins/private-equity/skills/ic-memo/SKILL.md`

License: Apache-2.0 (`https://github.com/anthropics/financial-services/blob/main/LICENSE`)

Package shape: large financial-services reference repo with named agents, vertical plugins, MCP connectors, managed-agent cookbooks, and scripts. The private-equity vertical includes skills for sourcing, screening, diligence checklists, meeting prep, unit economics, returns analysis, IC memos, portfolio monitoring, value creation, and AI readiness. The reviewed `dd-checklist` file was 117 lines and `ic-memo` was 88 lines on GitHub at review time.

Status: reviewed as `reference_only`, with `operator_skill` potential for Vantage demos after sandbox review.

Install decision: do not install into Nexus runtime. The repo is too broad and connector-heavy for direct runtime adoption, but the private-equity skill structures are highly relevant to Vantage's dealroom, diligence, red-flag, and IC memo surfaces.

Mapped Nexus skills:

- `read documents`
- `read spreadsheets`
- `review evidence`
- `summarize variance`
- `extract risks`
- `compare spreadsheets`
- `compare documents`
- `draft memo`
- `draft recommendation`
- `prepare approval packet`

Mapped Nexus workflows:

- `onboarding_evidence_intake`
- `evidence_review`
- `executive_synthesis`
- `recommendation_approval`
- `workflow_twin_shadow`
- `pivot_delivery`

What fits Nexus:

- The repo's own boundary language matches Nexus: work product is drafted for qualified professional review, with no investment recommendation, transaction execution, ledger posting, or onboarding approval.
- `dd-checklist` maps directly to Vantage's data-room coverage model: workstreams, request lists, status tracking, priority, owner, notes, and red-flag escalation.
- The diligence workstreams cover financial, commercial, legal, operational, HR/people, technology, and ESG areas, which gives Vantage a practical default coverage map.
- The status ladder (`Not Started`, `Requested`, `Received`, `In Review`, `Complete`, `Red Flag`) is a good candidate for Vantage evidence coverage state.
- Sector-specific diligence additions are useful for Vantage market/sector packs.
- `ic-memo` gives a compact IC memo structure: executive summary, company overview, market, financial analysis, investment thesis, deal terms, returns, risks, and recommendation.
- The IC memo notes emphasize balanced bull/bear presentation, tied financial tables, and asking for missing inputs rather than inventing terms. That is exactly the posture Nexus needs.

Gaps and risks:

- The full repo includes many agents, scripts, connectors, managed-agent deployment paths, and financial-data MCP assumptions. Nexus should not absorb that surface area.
- Financial work product cannot become investment advice. Vantage must keep memos as draft recommendation packets requiring human approval.
- The default PE checklist is useful but generic; Vantage needs market, sector, geography, and deal-stage packs before buyer-facing claims.
- `dd-checklist` does not require Nexus-native evidence IDs, page/section references, source freshness, sensitivity labels, or confidence scoring.
- `ic-memo` is too compact for a production IC pack unless linked to audited assumptions, model tie-outs, and source-backed risk registers.
- Financial connectors such as PitchBook, FactSet, LSEG, Morningstar, and Box/Egnyte require separate customer subscriptions, credentials, and workspace permission manifests.

Adoption verdict:

- Adopt the Vantage workflow skeletons, not the repo or runtime plugins.
- Treat `dd-checklist` as the best reference for Vantage dealroom coverage, request tracking, and red-flag escalation.
- Treat `ic-memo` as a useful first memo scaffold, but require Nexus evidence links, assumption provenance, and human approval before anything is export-ready.
- Do not promote to `runtime_candidate` until Vantage has typed deal packs, model tie-out checks, source citation requirements, and connector permission manifests.

Implementation deltas to consider:

1. Add a Vantage diligence coverage model with workstream, item, priority, status, owner, evidence refs, red-flag severity, and valuation/deal-term impact.
2. Add sector-pack overlays for SaaS, healthcare, industrials, financial services, and consumer diligence.
3. Add an IC memo packet schema that requires source-backed risks, returns assumptions, recommendation status, reviewer, and approval state.
4. Add spreadsheet/model review checks before Vantage can summarize variance, returns, IRR/MOIC, or QoE adjustments.
5. Add connector gating for premium financial-data providers and document stores before any live-data Vantage workflow is enabled.

### 4. `anthropics/claude-for-legal@tabular-review`

Sources:

- `https://github.com/anthropics/claude-for-legal`
- `https://github.com/anthropics/claude-for-legal/blob/main/corporate-legal/skills/tabular-review/SKILL.md`

License: Apache-2.0 (`https://github.com/anthropics/claude-for-legal/blob/main/LICENSE`)

Package shape: large legal reference repo with practice-area plugins, named agents, managed-agent cookbooks, MCP connectors, references, and scripts. The reviewed `corporate-legal/skills/tabular-review/SKILL.md` file was 235 lines on GitHub at review time.

Status: reviewed as `reference_only`, with the strongest `runtime_pattern` value in this pass.

Install decision: do not install into Nexus runtime. The specific `tabular-review` pattern should be reimplemented in Nexus because it matches the product's evidence-grid and approval model better than any other external candidate reviewed so far.

Mapped Nexus skills:

- `read documents`
- `read contracts`
- `review evidence`
- `extract metadata`
- `extract obligations`
- `extract risks`
- `compare documents`
- `prepare approval packet`

Mapped Nexus workflows:

- `evidence_review`
- `ask_retrieval`
- `knowledge_workspace`
- `recommendation_approval`
- `pivot_delivery`

What fits Nexus:

- One row per document and one column per data point is the right shape for Vantage data-room review, Quorum evidence matrices, and Meridian compliance evidence coverage.
- The typed column schema is reusable and auditable. It maps well to future Nexus review templates and vertical packs.
- The sample-run-before-fanout rule prevents wasting a full review on a bad schema and fits Nexus' shadow-mode workflow discipline.
- The required cell shape (`value`, `state`, `quote`, `location`) is a strong match for Nexus provenance, confidence, and human-verification needs.
- The explicit states (`answered`, `not_present`, `unclear`, `needs_review`) are more useful than numeric confidence for legal/compliance review.
- The normalization pass addresses a real batch-review failure mode: inconsistent interpretation across documents.
- The Excel/Sheets output pattern with hidden source columns, comments/notes, `_schema`, and reviewer `Verified` columns is highly reusable for export packets.

Gaps and risks:

- The repo is broad and legal-practice oriented; direct installation would bring far more surface area than Nexus needs.
- The skill assumes sub-agent fanout and document access paths that Nexus must map to its own evidence store, retrieval, and job queue.
- Verbatim quote verification is difficult when OCR, PDFs, and spreadsheets are imperfect. Nexus needs renderer-level or parser-level source spans before promising exact quote matching.
- The work-product and privilege assumptions are legal-specific and must be adapted to Nexus tenant confidentiality and pivot-specific sensitivity labels.
- The pattern is table-first and not issue-first. Nexus still needs separate issue extraction, escalation, and recommendation packet generation.

Adoption verdict:

- Adopt this pattern aggressively into Nexus design, but do not vendor the skill.
- Treat it as the reference standard for evidence matrices and data-room comparison.
- Prioritize this above generic document-summary skills because it produces auditable structured work, not just prose.
- Use it to shape the typed `externalSkillCandidates` registry as a `reference_only` candidate with high implementation priority.

Implementation deltas to consider:

1. Add a reusable `reviewGridSchema` type with column id, label, type, prompt, options, and required source behavior.
2. Add a `reviewGridCell` type with `value`, `state`, `quote`, `location`, `evidenceRef`, `verifiedBy`, and `verifiedAt`.
3. Add sample-run and normalization stages to Vantage/Quorum/Meridian batch review workflows.
4. Add export support for review grids with source columns, reviewer verification columns, and schema sheets.
5. Add quote/source verification checks before a cell can move from `needs_review` to `verified`.

### 5. `anthropics/skills` document skills

Sources:

- `https://github.com/anthropics/skills`
- `https://github.com/anthropics/skills/blob/main/skills/pdf/SKILL.md`
- `https://github.com/anthropics/skills/blob/main/skills/docx/SKILL.md`
- `https://github.com/anthropics/skills/blob/main/skills/xlsx/SKILL.md`

License: mixed. The repo README says many example skills are Apache-2.0, but the document skills (`docx`, `pdf`, `pptx`, `xlsx`) are source-available, not open source. Their local `LICENSE.txt` files mark them proprietary and governed by Anthropic service terms.

Package shape: public Agent Skills reference repo. The document skill folders include a `SKILL.md`, a proprietary `LICENSE.txt`, and supporting scripts/references. Reviewed files: `pdf` (314 lines), `docx` (590 lines), and `xlsx` (292 lines) on GitHub at review time.

Status: reviewed as `reference_only`.

Install decision: do not install, vendor, or copy into Nexus. Use only as implementation inspiration for document-processing guardrails because the document skills are not open-source.

Mapped Nexus skills:

- `read documents`
- `read spreadsheets`
- `extract metadata`
- `compare documents`
- `compare spreadsheets`
- `summarize exports`
- `draft memo`

Mapped Nexus workflows:

- `onboarding_evidence_intake`
- `connector_ingestion`
- `evidence_review`
- `executive_synthesis`
- `pivot_delivery`

What fits Nexus:

- The PDF skill's explicit coverage of extraction, table handling, forms, OCR, splitting/merging, watermarking, and encryption maps well to ingestion and export tooling.
- The DOCX skill's guidance around raw XML, tracked changes, validation, and layout-specific document generation is useful for approval packets and memo exports.
- The XLSX skill's zero-formula-error requirement, template preservation rule, financial-model formatting conventions, source comments for hardcodes, and formula consistency checks are very relevant to Vantage and finance-model review.
- The repo README gives a useful skill-package shape: self-contained folders with `SKILL.md`, scripts, and resources.

Gaps and risks:

- The document skills are proprietary/source-available, so Nexus cannot copy, modify, redistribute, or build derivative local skills from them.
- They are tool-usage recipes, not Nexus evidence-model definitions. They do not solve provenance, tenant access, audit events, or approval gates.
- They assume local file access and scripting. Nexus needs sandboxed processing, file-size limits, malware scanning posture, source spans, and tenant-safe storage.
- PDF and DOCX parsing can lose layout fidelity; Nexus should retain rendered-page references for high-stakes review.
- Spreadsheet review requires formula lineage and workbook integrity checks beyond generic extraction.

Adoption verdict:

- Use as a no-copy reference for document and spreadsheet handling quality bars.
- Do not install as an operator skill in this repo unless licensing is separately cleared.
- Keep Nexus-native parsers, provenance, and evidence records as the runtime source of truth.
- Prioritize the XLSX quality bars for Vantage model review and the PDF/DOCX visual/source-span bars for Quorum/Meridian evidence review.

Implementation deltas to consider:

1. Add document-ingestion quality gates for extracted text, table extraction, OCR status, page references, and unsupported/encrypted documents.
2. Add DOCX export validation for approval packets and memos before download.
3. Add XLSX model review checks for formula errors, hardcodes, inconsistent formulas, circular references, external links, and source comments.
4. Add rendered-page snapshots or source-span metadata for high-stakes PDF/DOCX evidence.
5. Keep a license guard in the external-skill registry so source-available/proprietary skills cannot be marked installable.

### 6. `kepano/obsidian-skills`

Sources:

- `https://github.com/kepano/obsidian-skills`
- `https://github.com/kepano/obsidian-skills/blob/main/LICENSE`

License: MIT.

Package shape: small Agent Skills repo with skills for Obsidian Markdown, Obsidian Bases, JSON Canvas, Obsidian CLI, and Defuddle web-to-Markdown extraction. The README explicitly lists Codex compatibility and manual install into `~/.codex/skills`.

Status: reviewed as `operator_skill`, not runtime candidate.

Install decision: safe to consider for local operator use after a local path/tool review. Do not wire it into Nexus runtime because it is a vault/editor workflow, not a tenant evidence service.

Mapped Nexus skills:

- `search memory`
- `search evidence`
- `extract metadata`
- `extract themes`
- `summarize`

Mapped Nexus workflows:

- `knowledge_workspace`
- `ask_retrieval`
- `executive_synthesis`
- `agent_room_briefs`

What fits Nexus:

- Obsidian Markdown, Bases, and JSON Canvas overlap with Knowledge Workspace, local vault sync, and graph-style operating memory.
- The JSON Canvas skill is a useful reference for future visual workflow maps and evidence relationship boards.
- Defuddle-style clean Markdown extraction is useful as an operator-side research helper.
- MIT licensing and Codex-oriented install notes make this the most plausible actual operator-skill install among the reviewed candidates.

Gaps and risks:

- It operates on local vault files, not Nexus tenancy, auth, audit, or source permissions.
- If pointed at the wrong vault, it could mix personal notes with workspace evidence. Any use must stay explicitly local and user-controlled.
- It should not become a backend dependency for Knowledge Workspace because Nexus already has its own note/evidence model and sync constraints.

Adoption verdict:

- Good optional operator aid for Ali/local workflows.
- Good reference for Markdown, Bases, and JSON Canvas interoperability.
- Not a runtime candidate for Nexus tenant workflows.

Implementation deltas to consider:

1. Add an optional Knowledge Workspace export/import spec for Obsidian Markdown and JSON Canvas.
2. Add a local-operator-only skill bucket in the external registry so this does not look like production runtime access.
3. Keep vault-path and tenant-data boundaries explicit if any local workflow uses these skills.

### 7. Tool candidates: `adhikasp/mcp-git-ingest` and `browser-use/browser-use`

Sources:

- `https://github.com/adhikasp/mcp-git-ingest`
- `https://github.com/browser-use/browser-use`

Licenses: MIT for both projects based on their GitHub repository license metadata/pages at review time.

Package shape: these are tools/frameworks, not skill playbooks. `mcp-git-ingest` is a Python MCP server with tools to read GitHub repository structure and selected important files. `browser-use` is a large Python browser automation framework with CLI/cloud options and examples for AI agents.

Status: reviewed as `tool_candidate`, not `operator_skill` or `runtime_candidate`.

Install decision: do not install or connect to Nexus runtime in this pass. Keep them as future tooling candidates that require sandbox, allowlist, auth, audit, and data-boundary design.

Mapped Nexus skills:

- `browse sources`
- `ingest sources`
- `search evidence`
- `search audit`

Mapped Nexus workflows:

- `connector_ingestion`
- `onboarding_evidence_intake`
- `evidence_review`
- `agent_governance`

What fits Nexus:

- `mcp-git-ingest` could help ingest public GitHub repositories by first reading structure, then selected files, instead of cloning everything blindly.
- `browser-use` could support governed web research and authenticated browser smoke testing if isolated from user accounts and tenant data.
- Both fit future connector/tool governance better than the skill taxonomy itself.

Gaps and risks:

- Repository ingestion and browser automation are high-risk tool surfaces: they touch network, credentials, remote content, and untrusted input.
- `mcp-git-ingest` clones/reads repositories and must be restricted by domain, repo allowlist, size limit, file allowlist, timeout, and secret-scan rules.
- `browser-use` can interact with live websites and logged-in sessions. Nexus must not use it for production tenant workflows without account isolation, audit trails, allowed domains, and human approval for write actions.
- Neither tool emits Nexus evidence records, source permissions, or approval events on its own.

Adoption verdict:

- Keep as future research/tool candidates.
- Do not treat them as skills assigned to Nexus agents.
- `mcp-git-ingest` is the narrower and more plausible first experiment for read-only public repo ingestion.
- `browser-use` remains experimental until Nexus has an explicit browser-sandbox design.

Implementation deltas to consider:

1. Add a separate `externalToolCandidates` category, distinct from `externalSkillCandidates`.
2. Define a read-only GitHub ingestion policy: allowed repos, max files, max bytes, ignored paths, secret scan, and evidence attribution.
3. Define a browser automation policy: isolated profile, allowed domains, no credential reuse, no write actions, screenshots/logs retained, and human approval gates.
4. Only surface these in Settings as disabled research candidates until the policy and audit paths exist.

## Not Recommended For Bulk Install

- `VoltAgent/awesome-agent-skills`
- `heilcheng/awesome-agent-skills`
- `alirezarezvani/claude-skills`
- other large community mega-packs

They are useful indexes, but not safe as wholesale dependencies. Install only a specific skill after code/license/security review.

## Proposed Next Step

Create a small `externalSkillCandidates` registry next to `workflow-skill-analysis.ts` with:

- `sourceRepo`
- `sourceSkill`
- `candidateType`: `reference_only | operator_skill | runtime_candidate`
- `mappedNexusSkills`
- `mappedWorkflows`
- `riskLevel`
- `license`
- `reviewStatus`

Then show that registry in Settings -> Agent Governance below the Workflow Skill Analysis matrix. This keeps discovery visible without silently granting runtime access.
