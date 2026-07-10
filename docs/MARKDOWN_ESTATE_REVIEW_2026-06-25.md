# NexusAI Markdown Estate Review

Status: Review pass for strategy, pivot, backlog, and documentation hygiene
Reviewed: 2026-06-25

## Scope

This review covers the 63 Markdown files currently in the repository. It focuses on whether each file is current, aligned with the readiness-first strategy, useful as historical reference, or in need of cleanup.

The current strategy spine is:

```text
readiness assessment -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof
```

The current execution spine is:

```text
v0.25.0 deploy/smoke -> strategy profile -> onboarding to first workflow -> pilot paperwork automation -> Knowledge Workspace follow-through -> connector expansion
```

## Review Method

- Inventory all Markdown files with `rg --files -g '*.md'`.
- Search headings, status blocks, version markers, stale/superseded language, and strategy/pivot terms.
- Open and inspect the high-impact groups: operating docs, strategy/pilot paperwork, production/security, architecture/product specs, UX/design, launch/demo, and LM Studio/runtime docs.
- Classify each file into an operating status rather than rewriting every document in one pass.

## Overall Findings

1. **The strategy spine is now strong.**
   `docs/USER_STRATEGY_AND_PIVOTS.md`, `TASKS.md`, `BACKLOG.md`, `HANDOVER.md`, `docs/ROADMAP.md`, and the pilot paperwork all point toward readiness -> buyer lane -> first workflow -> governed value proof.

2. **The v0.25.0 Knowledge Workspace paper trail is strong.**
   `/knowledge`, `docs/KNOWLEDGE_WORKSPACE.md`, Ask `noteRefs`, local vault sync, and the live/deploy caveats are represented in the main operating docs.

3. **Several older specification docs need status stamps.**
   Some specs still read as "scoped" or "build-ready" even though code has since shipped. They are not wrong as historical design notes, but their headers should say whether they are shipped, historical, or partially superseded.

4. **UX docs are useful but mixed-current.**
   `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` is useful active guidance. `UIUX_AUDIT.md` is partly stale and should remain historical unless each item is re-verified.

5. **Launch/demo docs lag the current buyer-lane strategy.**
   They still work as public-facing seed material, but should be refreshed after the product strategy is implemented in-app.

6. **Production docs are mostly current but overlapping.**
   `docs/PRODUCTION_HEALTH_CHECKLIST.md`, `docs/RENDER_DEPLOY.md`, `CUTOVER.md`, and `DEPLOY.md` should be consolidated or cross-linked so Render cutover instructions do not drift.

## Status Categories

| Status | Meaning |
|---|---|
| Current operating anchor | Use as source of truth today. |
| Current support doc | Current enough to use, but not the primary planning surface. |
| Historical/spec reference | Useful design history; do not treat as current execution checklist without checking `TASKS.md`/`BACKLOG.md`. |
| Needs status update | Content may be useful, but the header/status is stale or incomplete. |
| Needs strategy refresh | Should be updated to reflect buyer lanes, first workflow pilot, and governed value proof. |
| Test/demo fixture | Not a strategy doc; leave unless fixture behavior changes. |

## File Classification

| File | Classification | Notes |
|---|---|---|
| `README.md` | Current operating anchor | Points to strategy, backlog, and finish-line visual. |
| `TASKS.md` | Current operating anchor | Detailed execution checklist; now includes Strategy Operating Plan. |
| `BACKLOG.md` | Current operating anchor | Cross-document backlog; includes release, strategy, paperwork, Knowledge, connector, UX, and stale-note sections. |
| `HANDOVER.md` | Current operating anchor | Relay state; update after Render commit confirmation and authenticated smoke. |
| `CHANGELOG.md` | Current operating anchor | Release/history trail; long but important. |
| `docs/ROADMAP.md` | Current operating anchor | Product narrative and sequencing. |
| `docs/USER_STRATEGY_AND_PIVOTS.md` | Current operating anchor | Canonical strategy/pivot doc. |
| `docs/DEVELOPMENT_FINISH_LINE_VISUAL.md` | Current operating anchor | Visual path to paid-pilot readiness. |
| `docs/KNOWLEDGE_WORKSPACE.md` | Current operating anchor | v0.25.0 Knowledge Workspace spec. |
| `docs/ARCHITECTURE.md` | Current support doc | Current enough, but header date should be bumped after this audit if edited again. |
| `docs/USER_FLOWS.md` | Current support doc | Strong flow coverage; should be refreshed when strategy profile is implemented. |
| `docs/WORKFLOW_TWIN_SCORER.md` | Current support doc | Main bridge from readiness to first workflow pilot. |
| `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` | Current support doc | Strategy-aligned workflow framing. |
| `docs/AI_NATIVE_READINESS_ASSESSMENT.md` | Current support doc | Good top-of-funnel strategy and buyer-lane routing. |
| `docs/ONE_PAGER.md` | Current support doc | Buyer-lane language present; refresh after next product implementation. |
| `docs/GOVERN_ASSURE_MESSAGING.md` | Current support doc | Trust language is aligned with human approval. |
| `docs/PILOT_SOW_TEMPLATE.md` | Current support doc | Pilot paperwork aligned to first workflow/sponsor/reviewer. |
| `docs/PILOT_ONBOARDING_CHECKLIST.md` | Current support doc | Short, useful, strategy-aligned. |
| `docs/PILOT_SUCCESS_SCORECARD.md` | Current support doc | Strategy-aligned scorecard. |
| `docs/PILOT_BILLING_TRIGGERS.md` | Current support doc | Strategy-aligned billing trigger doc. |
| `docs/SHADOW_MODE_ROI_PLAYBOOK.md` | Current support doc | Important for value proof; should be referenced by pilot workflow automation. |
| `docs/PRODUCTION_HEALTH_CHECKLIST.md` | Current operating anchor | Most actionable production gate. |
| `docs/RENDER_DEPLOY.md` | Current support doc | Render-specific deploy notes; overlaps with `DEPLOY.md` and `CUTOVER.md`. |
| `docs/PRODUCTION_READINESS.md` | Current support doc | Good verdict doc; short and intentionally high-level. |
| `docs/SECURITY_REVIEW.md` | Current support doc | Required pre-pilot security checklist. |
| `docs/SECURITY_DATA_HANDLING.md` | Current support doc | Knowledge Workspace and MCP boundaries included. |
| `CUTOVER.md` | Current support doc | Useful release-day runbook; now includes v0.25.0 smoke steps. |
| `DEPLOY.md` | Current support doc | Useful but overlaps Render deploy docs; needs consolidation note. |
| `docs/INFRA_DECISION_MEMO.md` | Current support doc | V1 hosting direction. |
| `docs/DR_RUNBOOK.md` | Current support doc | Disaster recovery runbook; should be included in paid-pilot readiness. |
| `docs/AI_OPERATING_MODEL.md` | Current support doc | V1 AI policy remains aligned with human approval. |
| `docs/MODEL_ROUTING.md` | Current support doc | V1 routing policy; should be revisited if provider fallback changes. |
| `docs/DISPATCHER_SPEC.md` | Historical/spec reference | Header says shipped; build plan remains as historical implementation detail. |
| `docs/EXECUTIVE_SYNTHESIS_SPEC.md` | Historical/spec reference | Header says shipped; useful as feature spec. |
| `docs/SCHEDULED_SYNTHESIS_SPEC.md` | Historical/spec reference | Status updated: scheduled synthesis core shipped in v0.19.0; email/Slack delivery remains future work. |
| `docs/BILLING_TIERS_SPEC.md` | Historical/spec reference | Status updated: billing tiers shipped in v0.20.0 and Stripe integration in v0.21.0. |
| `docs/U2_AGENT_PASSPORT_SPEC.md` | Historical/spec reference | Status updated: U2 is complete for current V1.1 surfaces. |
| `docs/AGENT_ROOMS.md` | Historical/spec reference | Status updated: agent rooms shipped in v0.10.3; later agent expansion remains future work. |
| `docs/V1_1_UPGRADE_PLAN.md` | Historical/spec reference | Already says superseded for execution by TASKS/HANDOVER. |
| `docs/UI_UX_FLOW_PLAN.md` | Current support doc | Design plan is current enough; batch status should be refreshed after next Figma/UI work. |
| `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` | Current support doc | Useful active UX review and mini-feature list. |
| `UIUX_AUDIT.md` | Historical/spec reference | Partly stale; BACKLOG already warns not to treat all items as active without re-verification. |
| `docs/SECTOR_GAPS.md` | Current support doc | Refreshed with buyer-lane tie-in and first-workflow strategy. |
| `docs/EXECUTIVE_PACK_TEMPLATE.md` | Current support doc | Refreshed as a first-workflow value proof pack. |
| `AGENTS.md` | Current support doc | Useful Codex/onboarding instructions; no strategy issue. |
| `CLAUDE.md` | Current support doc | Useful parallel agent instructions; may need same links as AGENTS if heavily used. |
| `CONTRIBUTING.md` | Current support doc | Lightweight contribution guide. |
| `LICENSE.md` | Current support doc | License text. |
| `demo/README.md` | Current support doc | Refreshed with readiness/buyer-lane/first workflow story. |
| `demo/sample-executive-brief.md` | Test/demo fixture | Keep unless demo pack changes. |
| `demo/sample-install-and-output.md` | Current support doc | Refreshed with current route and Knowledge Workspace. |
| `launch/README.md` | Current support doc | Refreshed with readiness-first pilot path. |
| `launch/landing-page.md` | Current support doc | Refreshed with readiness-first pilot path and Knowledge Workspace. |
| `launch/launch-post-template.md` | Current support doc | Refreshed with governed workflow pilot and Knowledge Workspace language. |
| `docs/lmstudio/README.md` | Historical/spec reference | Local LLM benchmark kit; separate from NexusAI strategy. |
| `docs/lmstudio/LM_STUDIO_MOE_OPTIMIZATION.md` | Historical/spec reference | Hardware/runtime optimization note; keep separate. |
| `docs/lmstudio/results/baseline-benchmark.md` | Historical/spec reference | Benchmark result. |
| `docs/lmstudio/results/capability-lock.md` | Historical/spec reference | Runtime facts snapshot. |
| `docs/lmstudio/results/crash-analysis-2026-05-19.md` | Historical/spec reference | Incident note. |
| `docs/Agent_Runtime_Diagram_2026-05-01.md` | Historical/spec reference | Status updated as historical; superseded by current architecture docs. |
| `test-data/ingestion/operational-kpis-may-2026.md` | Test/demo fixture | Ingestion fixture, not planning docs. |
| `launch/assets/README.md` | Test/demo fixture | Asset folder note. |

## Recommended Cleanup Backlog

### P0: Keep Current Paper Trail Stable

- [x] Keep `README.md`, `TASKS.md`, `BACKLOG.md`, `HANDOVER.md`, `CHANGELOG.md`, `docs/ROADMAP.md`, and `docs/USER_STRATEGY_AND_PIVOTS.md` aligned.
- [x] Add and link `docs/DEVELOPMENT_FINISH_LINE_VISUAL.md`.
- [x] Add this Markdown estate review.
- [ ] Update `HANDOVER.md` again after Render commit confirmation and authenticated smoke.

### P1: Fix Stale Status Headers

- [x] Update `docs/BILLING_TIERS_SPEC.md` from scoped/not-yet-built to shipped/historical reference.
- [x] Update `docs/SCHEDULED_SYNTHESIS_SPEC.md` to reflect shipped scheduled synthesis core and remaining email/Slack delivery gaps.
- [x] Update `docs/U2_AGENT_PASSPORT_SPEC.md` to mark U2 complete for current V1.1 surfaces.
- [x] Update `docs/AGENT_ROOMS.md` to mark agent rooms shipped and preserve future "agent souls" as later work.
- [x] Add a superseded/historical note to `docs/Agent_Runtime_Diagram_2026-05-01.md`.

### P2: Refresh Public/Demo/Launch Copy

- [x] Refresh `launch/landing-page.md` around readiness-first buyer lanes and governed workflow pilot.
- [x] Refresh `launch/launch-post-template.md` around the v0.25.0 story and Knowledge Workspace.
- [x] Refresh `demo/README.md` and `demo/sample-install-and-output.md` so they match the current product path.
- [x] Refresh `docs/EXECUTIVE_PACK_TEMPLATE.md` into a value proof pack tied to first workflow and shadow ROI.
- [x] Refresh `docs/SECTOR_GAPS.md` to align sectors with buyer lanes and pilot workflows.

### P3: Consolidate Operational Runbooks

- [x] Decide whether `DEPLOY.md`, `CUTOVER.md`, and `docs/RENDER_DEPLOY.md` should remain separate.
- [x] If separate, add "use this for..." notes at the top of each.
- [x] Ensure all production runbooks include v0.25.0 smoke checks for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask `noteRefs`.

### P4: UX Documentation Hygiene

- [x] Keep `UIUX_AUDIT.md` as historical unless every item is re-verified.
- [x] Convert still-valid UX review items from `docs/UI_UX_EXPERT_REVIEW_2026-06-16.md` into backlog tickets.
- [ ] Refresh `docs/UI_UX_FLOW_PLAN.md` after the next Figma/UI build batch.

## Bottom Line

The repo now has a coherent strategy spine and a strong v0.25.0 paper trail. The next documentation work is not another broad rewrite; it is targeted status hygiene for older specs, launch/demo copy refresh, and runbook consolidation.
