# TASKS.md — NexusAI Roadmap and Checklist

> Master task list for the NexusAI relay team. Do not delete tasks; mark them complete with `[x]`.
> For the cross-document backlog map and prioritization view, see `BACKLOG.md`.
> For the visual finish-line map, see `docs/DEVELOPMENT_FINISH_LINE_VISUAL.md`.
> For the markdown estate review, see `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md`.
> For typed runtime/state/effect safety rules, see `docs/ENGINEERING_GUARDRAILS.md`.
> Last reviewed and tightened: 2026-07-06.

---

## Project Overview

**Project name:** NexusAI Mission Control
**Goal:** Executive intelligence command layer for paid enterprise pilots.
**Target:** CEOs, COOs, CTO/CDOs, strategy leaders, transformation sponsors, business owners, and
C-suite teams across fintech, professional services, technology, physical businesses, and
digital-native companies in GCC, Pakistan, and emerging markets.
**Stack:** Next.js 15, TypeScript, Clerk, Postgres/Drizzle/pgvector, R2, Render, LLM provider routing.

---

## Current Status (re-checked 2026-07-04) -- v0.25.x

**Last fully verified release:** v0.23.0 on 2026-06-13 -- 28 test files / 179 tests, build clean, 24 DB migrations.
**Current verification:** v0.25.0 Knowledge Workspace passed TypeScript, 29 test files / 187 tests, production build, and production dependency audit. In-app/unauthenticated browser smoke is blocked by Clerk-hosted sign-in for protected routes; verify `/knowledge`, `/workflows`, and Ask note citations in the logged-in Chrome/Render session after deploy.

**Phases 1-6: Complete.**
**Pre-7A Technical Prep: Complete.** (v0.9.1)
**Phase 7A: Complete.** (v0.10.0-v0.10.2) -- 20-role registry, 5 archetypes, stage-aware roles.
**Phase 7B: Complete.** (v0.10.3) -- Agent rooms, named specialist agents.
**Phase 7C: Code complete.** (v0.11.0) -- external services (Sentry, Stripe, uptime) still to wire.
**Phase 8: Complete.** (v0.12.0) -- export artifacts, demo tools, pilot kit.
**Phase 9D: Complete.** (v0.13.0) -- product brief, SOW templates, demo scripts, ROI calculator.
**Phase 7D / V1.1 Tier 1: Complete.** (v0.15.0) -- U1, U2, U3, U4 all shipped.
**Phase 8A Decision & Action Twin: Shipped.** (v0.16.0-v0.16.1) -- full CRUD, interactive page, audit trail, and AI proposal extraction from agent outputs with human acceptance.
**Persistent Ask Conversation Memory: Shipped.** (v0.16.2) -- DB-backed conversation history, recent-turn prompt context, history load and clear.
**Entity Extraction Pipeline: Shipped.** (v0.16.3) -- deterministic entity extraction on processed evidence, `evidence_entity_links`, and `GET /api/entities`.
**Phase 2 AI Trust Layer: Shipped.** (v0.17.0) -- eval harness, red-team checks, prompt registry, and workspace AI policy settings.
**Executive Synthesis Layer: Shipped.** (v0.18.0) -- on-demand dispatcher/synthesis service, role question sets, API, collapsible UI reframe.
**Executive Synthesis Traceability: Shipped.** (v0.18.1) -- source pills and entity chips attached to synthesis answers.
**Executive Synthesis Refresh/History: Shipped.** (v0.18.2) -- manual refresh route/button with history saved to `agent_outputs`.
**Scheduled Synthesis Refresh Core: Shipped.** (v0.19.0) -- schedule table, Settings tab, protected cron endpoint, runner script, in-app delivery through `agent_outputs`.
**Workflow Twin Primitives: Shipped.** (v0.19.1) -- `workflow_twins`, `workflow_twin_runs`, run APIs, action-items alias, deterministic first run payloads.
**Billing Tiers Session 1: Shipped.** (v0.20.0) -- plan-gated token budgets, feature flags, `ask()` budget gate, cron reset, Plan & Usage settings tab.
**Billing Tiers Session 2: Shipped.** (v0.21.0) -- Stripe Checkout, webhook lifecycle (5 events), Billing Portal, trial-to-free cron conversion, Settings upgrade CTAs.
**Orchestration Dispatcher: Shipped.** (v0.22.0) -- `dispatch_jobs` table, atomic claim with `FOR UPDATE SKIP LOCKED`, priority queue, retry/backoff, fan-out, 4 job type handlers, dispatch API, cron runner.
**Entity Pages and Backlinks: Shipped.** (v0.23.0) -- Company Memory index/detail pages, entity backlinks, timeline, and `GET /api/entities/:id`.
**Slack Connector Data Flow: Shipped.** (v0.23.0) -- allowlisted Slack channel messages ingest as governed evidence with provenance, sensitivity, confidence, and audit events.
**Production Hardening: Shipped.** (v0.23.1) -- Stripe webhook idempotency, cron/webhook rate limits, Clerk CSP domain handling, dispatch input typing, and demo navigation/auth shell fixes.
**Workflow Pilot Productization: Shipped.** (v0.24.0) -- Connector Settings policy UX, Workflow Twin Scorer product page, U6 backcasting API/UI, and U7 shadow ROI instrumentation. Committed and pushed to `origin/main`; Render deploy/authenticated smoke should be confirmed.
**Knowledge Workspace and Live Vault Sync: Shipped locally.** (v0.25.0) -- `/knowledge`, markdown editor, wikilinks, backlinks, graph, import/export, optional live local folder sync, MCP memory wrapper, and Ask `noteRefs`. Migrations 0025-0026 applied; Render deployed-commit confirmation and authenticated smoke remain pending.
**User Strategy and Pivot Docs: Documentation complete.** (updated 2026-06-25) -- `docs/USER_STRATEGY_AND_PIVOTS.md` is the canonical strategy. Paperwork now aligns around readiness -> buyer lane -> signup/onboarding -> first workflow pilot -> governed value proof, with `BACKLOG.md` as the operating backlog and `TASKS.md` as the execution checklist.
**Demo packs: Audited and rewritten.** (v0.15.1) -- All 3 sector packs CEO-grade with pre-tuned Ask questions.
**Production DB: Migrations 0001-0026 applied. `db:check` returned `ok=true` against `neondb` on 2026-06-25.**

**The product is demo-ready and pilot-design-ready for GCC fintech, professional services, and SaaS buyers. First paid pilot production readiness still requires the open operations, monitoring, backup, support, and authenticated-smoke items below.**

**Priority order (updated 2026-07-04):**
1. [x] Finish and verify v0.23.1 hardening -- local auth/CTA behavior, TypeScript, tests, and build pass. Commit/deploy next.
2. [x] Connector Settings UX -- Slack channel allowlist, sync status, source sensitivity, last ingest, and policy audit trail.
3. [x] Workflow Twin Scorer product path -- UI/API scoring flow from company profile, data readiness, risk, pain, and speed benefit.
4. [x] U6 Backcasting onboarding/workflow scoping -- guided pilot scope anchored to the chosen workflow.
5. [x] U7 Shadow ROI instrumentation -- measured manual-vs-Nexus comparison for the chosen workflow.
6. [x] Build Knowledge Workspace v0.25.0 -- markdown editor, backlinks, graph, import/export, live local vault sync, MCP wrapper, and Ask `noteRefs`.
7. [x] Align user strategy and paperwork docs -- readiness-first buyer lanes, workflow scorer bridge, sponsor/reviewer requirements, and governed value proof.
8. [ ] Confirm Render deploy for the latest pushed `origin/main` commit, then run authenticated smoke tests in the logged-in browser session. Production `/api/health` and public domain smoke are green as of 2026-07-04; authenticated browser smoke remains the real demo gate.
9. [x] Add cron job entries to `render.yaml` -- dispatch runner, billing reset, and trial-to-free conversion. Three cron services added 2026-06-25: dispatch every 2 min, billing daily at midnight, synthesis daily at 1am. All auth via `NEXUS_CRON_SECRET`. Verify in Render dashboard after deploy.
10. [x] Wire LLM routing table into execution path -- CLOSED 2026-06-25 (Task #36). `callLLM()` now executes the `model-routing.ts` policy via `callLLMWithRouting()`, wired into all 8 real call sites. Found and fixed a real bug as a byproduct: DeepSeek retires `deepseek-chat`/`deepseek-reasoner` 2026-07-24 15:59 UTC, so `DEFAULT_MODEL` and `estimateCostMicro()` now use `deepseek-v4-flash`/`deepseek-v4-pro` with correct split pricing.
11. [x] Add workspace-level provider allow-list setting — Settings > AI Policy page now shows multi-select of 6 providers with jurisdiction flags, local-only mode toggle, and live save via existing `PATCH /api/settings/workspace`. `isProviderAllowed()` enforcement already existed; now the UI is wired.
12. [x] Add Resend email delivery for synthesis briefs — `lib/email/resend.ts` pure-fetch client, `sendSynthesisEmails()` wired into synthesis cron runner, HTML template + unsubscribe, `GET /api/email/unsubscribe`, env vars in `render.yaml`. Ships silently (no-op until `NEXUS_RESEND_API_KEY` is set).
13. [ ] Configure production email boundary — keep Clerk responsible for signup/signin verification, password reset, and future org invitation email; configure Nexus product email through managed delivery (`NEXUS_RESEND_API_KEY`, `NEXUS_FROM_EMAIL`, authenticated `pinavia.io` sender) and run one scheduled synthesis email test. Do not build custom auth confirmation or self-hosted mail for V1 demos.
14. [x] Add reusable contextual help icons/dialogs — `components/ui/help-dialog.tsx` provides `HelpDialog` and `HelpLabel`; wired across dashboard metrics, Ask, ingestion, synthesis, approvals, recommendations, workflows, settings, and connectors with plain-language explanations, OK/Escape/outside-click close behavior, focus return, and screen-reader labels. Copy registry created at `docs/CONTEXTUAL_HELP_COPY.md`.
15. [x] Add connector setup guide and real connector CTAs — `docs/CONNECTOR_SETUP_GUIDE.md` lists every connector, setup/docs links, redirect URI, env vars, scopes/access, status, and notes; Settings > Connectors now renders that catalogue and exposes provider setup/docs CTAs instead of dead future-install links.
16. [x] Capture `UI V0.1 baseline` before choosing the newer UI direction — `docs/UI_BASELINE_VERSIONING.md` now records that Vercel is historical origin only, while Render/new architecture is the current app path. Ledger now includes V0.1/V0.2 Figma refs, current git ref at registry time, Render comparison route, source formats, screen sets, and route mapping. Exact Render deploy ID still belongs to the existing deploy-confirmation task.
17. [x] Install selected BuilderOS workflow skills — added `.claude/skills/design-better/SKILL.md` and `.claude/skills/build-loop-codex/SKILL.md` only, with `.claude/skills/BUILDEROS_LICENSE.txt`. Full BuilderOS bundle intentionally not installed; these are agent workflow aids for UI craft review and build/review/test discipline, not runtime app dependencies.
18. [x] Add Sentry error tracking -- CLOSED 2026-06-25 (Task #32, hardened in Task #37). Wired via `instrumentation.ts`'s `onRequestError` hook (covers all ~36 API routes automatically), plus `app/global-error.tsx`, `app/error.tsx`, and manual-capture helpers in `lib/observability/sentry.ts` for swallowed catch-and-continue paths (Stripe webhook, LLM fallback exhaustion). Code ships disabled (no-op) until `SENTRY_DSN` is set in Render -- still need to: run `npm install` on a machine with registry access (sandbox npm returns 403), create a Sentry project, set the 5 Sentry env vars in Render (now listed in `CUTOVER.md`), and confirm a test error lands in the dashboard.
19. [x] Add Mode Indicator React context/provider — `lib/mode-context.tsx` with 4 AuthMode states (clerk_cloud, local_license, offline_local, hybrid_sync_pending). `ModeProvider` wraps authenticated layout, `ModeIndicator` badge visible in top bar. Detects mode from `NEXT_PUBLIC_NEXUS_DEPLOY_MODE` env var.
20. [x] Implement user strategy in product — Migration 0027 `strategy_profiles`, Drizzle schema, contracts (buyer lane, governance posture, full profile), repository (`getStrategyProfile`, `upsertStrategyProfile`), API (`GET/PATCH /api/strategy-profile`). Closure note (2026-07-06, session #53): readiness page integration and onboarding routing now implemented — server-side lane assignment (`lib/services/lane-assignment.ts`), single-use claim codes (`readiness_submissions`, migration 0033), `POST /api/readiness/claim`, wizard inheritance with server-enforced lane-reclassification checkpoint, enriched lane-change audit payloads, lane lifecycle fields (`initialLane`, `laneChangeReason`, `laneConfidence`, `laneChangedBy`, `laneChangedAt`), and strategy-profile authz fix (workspaceId override removed). Hardened 2026-07-07: claim-link product email via Resend boundary, protected readiness-prune cron, and Mission Control pilot-status card. Spec: `docs/LANE_ASSIGNMENT_SPEC.md`. Production pending: run migrations 0033-0034 + authenticated smoke of readiness -> signup -> onboarding -> dashboard/workflows.
21. [x] Wire strategy paperwork into the pilot path — `GET /api/pilot/paperwork` pre-fills SOW, onboarding checklist, success scorecard (7 outcomes, buyer-lane weighting), billing trigger checklist, and value proof pack from strategy profile data. Onboarding Step 7 routes to workflow selection.
22. [x] Add Knowledge Workspace follow-through — Note-to-entity linking UI (entity picker in sidebar), note embeddings via pgvector (migration 0028, vector search in `/api/knowledge/search`). Graph filters, duplicate audit, and daily brief automation remain open.
23. [x] Add additional connector data flows beyond Slack: Google Drive OAuth 2.0 connector — `lib/connectors/google-drive.ts` (pure fetch client), 4 API routes (install, callback, files, ingest), Settings UI integration, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `render.yaml`. Closure note (2026-06-25, Task #40): Microsoft SharePoint/Teams connector added on the same pattern — `lib/connectors/sharepoint.ts` (Microsoft identity platform OAuth + Graph API), 4 API routes under `app/api/connectors/sharepoint/`, Settings UI catalogue entry flipped to `available: true`, `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID` added to `render.yaml` and `CUTOVER.md`. Committed and pushed by Ali on 2026-06-25 as commit `2ff4c26` (bundled with the prior session's uncommitted batch). Code-complete; still pending real-OAuth-app verification (Azure AD app registration + end-to-end install flow test) and the npm install/tsc/test/build cycle.
24. [x] Apply engineering guardrails before autonomous/local runner work -- typed state machines, append-only events, visible async effects, auth-mode contracts, and verifier error taxonomy. CLOSED 2026-06-25 — contract layer landed in `lib/guardrails.ts` (`RunnerState`, `AuthMode`, `EffectResult<T>`, `VerifierOutcome`, `RunnerEvent`, `assertNever`) with `tests/guardrails.test.ts`. tsc clean; 16 runtime assertions verified via tsx. Runners adopt these primitives when built.
25. [x] Build Quorum-branded board UI screen — `/board` now renders a director-facing Board Room on top of `POST /api/board/delta`, with stable board identifier, baseline/delta states, status chips, Director Q&A cards, evidence/entity links, governance boundary copy, and side-nav entry. Verified 2026-07-05 with `tsc`, full mission-control tests, and production build.
26. [x] Build Quorum UI/UX Figma V0.1 — Figma page `08 Quorum UI UX Build`, board `78:3`, now contains six editable desktop-browser screens for baseline setup, between-meetings delta review, Director Q&A, evidence drilldown, decision handoff, and board export pack. Registered in `docs/UI_BASELINE_VERSIONING.md`.
27. [x] Plan Quorum full board governance workflow in code and Figma — `docs/QUORUM_BOARD_GOVERNANCE_WORKFLOW.md` defines the Pakistan-first / jurisdiction-pack-ready model; `lib/board-governance-workflow.ts` codifies the source pack, 17 planned screens, 10 workflow stages, and three arcs; `/board` renders the compact roadmap; `tests/board-governance-workflow.test.ts` pins the registry; Figma page `09 Quorum Governance Workflow V0.2` (`80:3`) contains the 17-screen desktop flow. Next step is implementation, not planning.
28. [x] Add product subdomain detection for the Pinavia house-of-brands — `lib/product-detection.ts`, middleware `x-nexus-product`, product CORS origins, public/auth shell product lockup, and route-safe sign-in redirects. `quorum.pinavia.io` can land on `/board`; `meridian`, `vantage`, and `nucleus` fall back to `/dashboard/ceo` until their routes ship. Pushed as `c55417e`.
29. [ ] Configure product subdomains operationally — Cloudflare DNS records for `app`, `nexus`, `quorum`, `meridian`, `vantage`, `nucleus`; Render custom domains on the current service; Clerk allowed origins and redirect URLs for each product; authenticated smoke per domain after deploy.

## Active Product Queue (updated 2026-07-06)

These are the pivot/product items that were explicitly reviewed after the DD checklist and board-delta backend work. Keep this queue current so implementation order stays visible.

1. [x] Correct vertical workflow boundary — deleted the shared `lib/pivot-workflows.ts` template and replaced it with domain-owned Meridian and Vantage registries/docs. Nexus-core remains the shared engine; verticals own their workflows.
2. [x] Harden vertical registries for global use — Quorum now has formal boundaries and jurisdiction-pack requirements; Meridian has jurisdiction-pack requirements; Vantage has market/sector-pack requirements; all three registries now expose strict integrity validators and route-safe screen resolvers.
3. [x] Build vertical input/action Figma screens — Figma board `11 Vertical Input Action Screens V0.2` (`87:3`) now contains 33 editable desktop-browser frames across Quorum, Meridian, and Vantage. Each vertical registry has guidance arrays and tests for user inputs, action points, and guardrail copy.
4. [x] Agent skill sourcing review — `docs/AGENT_SKILL_SOURCING_REVIEW.md` maps each current Nexus skill to build/adopt decisions and GitHub-sourced candidates. Runtime skills remain Nexus-native unless a candidate passes code/license/security review.
5. [x] Fine-tooth external skill reviews — `docs/AGENT_SKILL_SOURCING_REVIEW.md` now reviews governance, legal/compliance, private-equity, evidence-grid, document-skill, Obsidian, GitHub-ingest, and browser-automation candidates. Runtime verdict: reference-only/tool-candidate until registry, sandbox, license, evidence, and approval gates exist.
6. [x] External skill candidate test harness — `lib/agents/external-skill-candidates.ts` and `tests/agent-skills.test.ts` now test candidate ranking, mappings, license guardrails, runtime blockers, and sandbox gates.
7. [x] Nexus-native skill catalog/API/UI — `lib/agents/nexus-native-skills.ts`, `GET /api/agents/native-skills`, Settings → Agent Governance, and `tests/agent-skills.test.ts` now define and verify the first first-party skill pack across workflows, pivots, approval gates, and audit events.
8. [x] Implement executable `evidence_grid_review` — `lib/agents/evidence-grid-review.ts` (pure engine) + `lib/services/evidence-grid-review-runner.ts` (governed-pool loader, passport gate, audit events) turn governed evidence into cited review grids, issue flags, missing-evidence notes, and reviewer escalations. Skill promoted to `runtime_ready`; verified by `tests/evidence-grid-review.test.ts`.
   - [x] Executor endpoint + Settings action — `POST /api/agents/native-skills/evidence-grid-review` runs the engine against governed evidence; Settings → Agent Governance has a "Run evidence grid review" button rendering cited rows, escalations, and gaps.
   - [x] Executable `document_integrity_review` — `lib/agents/document-integrity-review.ts` (per-document parse-quality engine reusing `extractSourceSpan`) + `lib/services/document-integrity-review-runner.ts`. Flags parse/provenance/governance/tabular issues and emits repair recommendations; promoted to `runtime_ready`; verified by `tests/document-integrity-review.test.ts`.
   - [x] Executor endpoint + Settings action for `document_integrity_review` — `POST /api/agents/native-skills/document-integrity-review` + "Run document integrity review" button rendering per-document findings, parse-quality score, and repair recommendations.
   - [x] Executable `vantage_diligence_analysis` — `lib/agents/vantage-diligence-analysis.ts` composes the DD checklist library with the grid citation model to produce diligence coverage, red flags, model tie-outs, and IC memo sections; `lib/services/vantage-diligence-analysis-runner.ts` + `POST /api/agents/native-skills/vantage-diligence-analysis` + "Run diligence analysis" Settings button. Promoted to `runtime_ready`; verified by `tests/vantage-diligence-analysis.test.ts`.
   - [x] Executable `quorum_governance_review` — `lib/agents/quorum-governance-review.ts` reviews board evidence + decisions + actions against a board-pack checklist and the Quorum governance boundaries, producing governance findings, decision gaps, approval packet, and board-pack caveats; `lib/services/quorum-governance-review-runner.ts` + `POST /api/agents/native-skills/quorum-governance-review` + "Run governance review" Settings button. Promoted to `runtime_ready`; verified by `tests/quorum-governance-review.test.ts`.
   - [x] Executable `meridian_compliance_review` — `lib/agents/meridian-compliance-review.ts` maps regulator license-type requirements (`lib/domain/regulatory-requirement-library.ts`) to governed evidence, producing requirement coverage, compliance gaps, a qualified-reviewer packet, and filing caveats; `lib/services/meridian-compliance-review-runner.ts` + `POST /api/agents/native-skills/meridian-compliance-review` + "Run compliance review" Settings button. Promoted to `runtime_ready`; verified by `tests/meridian-compliance-review.test.ts`.
   - [ ] Next: `knowledge_workspace_synthesis` — the last `planned` native skill; then every pivot suite has a real executable runtime.
9. [ ] External skill candidate UI/API surface — optional only if we still want Settings visibility for reference candidates; do not let it imply install/runtime access.
10. [ ] Vantage DD Copilot route — use `lib/domain/dd-checklist-library.ts` and `lib/vantage-dd-workflow.ts` to build a deal workspace route with dealroom setup, checklist coverage, red flags, and IC memo sections.
11. [ ] Connectors beyond skeletons — Drive and Gmail have real OAuth plus ingestion; Slack has delivery and inbound channel-message ingestion but no broader scheduled ingestion surface; Teams remains thin compared with SharePoint/Graph. Next step: choose one connector path to make end-to-end demoable with install, source selection, ingest, sync status, and retry/error visibility.
12. [ ] Meridian regulatory route — use `lib/domain/regulatory-requirement-library.ts` and `lib/meridian-regulatory-workflow.ts` to build scope, requirement evidence coverage, gap triage, and filing-pack readiness. Needs domain-reviewed requirements before real customer claims.
13. [ ] Nucleus methodology-pack authoring tool — let consulting partners encode proprietary frameworks into governed agent/methodology packs without per-firm engineering. Needs its own domain registry, authoring UI, schema, validation, versioning, preview, and white-label fit.
14. [x] Quorum-branded board UI screen — shipped `/board` Board Room UI. Backend board synthesis and between-meetings delta were already present; this adds the user-facing Quorum surface.
15. [x] Quorum UI/UX Figma build — shipped Figma board `08 Quorum UI UX Build` (`78:3`) with six desktop screens for the broader Quorum review flow.
16. [x] Quorum board governance workflow plan — expanded beyond the current six concept screens into a code-backed and Figma-backed board operating model: jurisdiction/entity setup, directors, committees, TORs, agenda, quorum, conflicts, decision capture, minutes, signatures, action register, and audit pack.
17. [ ] Quorum governance implementation slice — choose and build the first data-model/UI slice from the planned workflow. Recommended sequence: board profile/registers first, then meeting/agenda, then minutes/action register.
18. [x] Product subdomain code layer — shared Render app can now detect product hostnames and adjust public-shell branding/redirects without separate deployments.
19. [ ] Product subdomain infrastructure — DNS, Render custom domains, Clerk allowed origins/redirects, and product-domain smoke tests remain external setup work.

## Strategy Operating Plan (updated 2026-06-25)

The current strategy is not "get users to sign up." It is readiness -> buyer lane -> onboarding -> first workflow pilot -> governed value proof.

- [x] Strategy profile: persist readiness result, buyer lane, role, sector, company size, priority, sponsor, reviewer, governance posture, and selected first workflow. (migration 0027)\n- [x] Onboarding route: carry the strategy profile into workspace setup and workflow scorer/backcasting instead of sending every user to a generic dashboard. (Step 7 workflow pilot card)\n- [x] Pilot paperwork generation: use buyer lane plus selected workflow to prefill the SOW, onboarding checklist, scorecard, billing trigger checklist, and value proof pack. (`GET /api/pilot/paperwork`)\n- [x] Knowledge memory loop: use `/knowledge` for workflow briefs, entity notes, pilot learnings, and reusable institutional context; keep Ask `noteRefs` separate from governed `evidenceRefs`.\n- [x] Show Knowledge Workspace visual map at the bottom of Agent Rooms using the existing knowledge graph service data.\n- [x] Backlog hygiene: whenever a strategy or release status changes, update `CHANGELOG.md`, `TASKS.md`, `HANDOVER.md`, `BACKLOG.md`, and `docs/ROADMAP.md` in the same pass.\n- [x] Markdown estate review: classify all repo markdown files and save the cleanup backlog in `docs/MARKDOWN_ESTATE_REVIEW_2026-06-25.md`.\n- [x] Docs cleanup: fix stale spec status headers, refresh launch/demo copy, clarify deploy/cutover doc roles, and convert valid UX review items into implementation tickets.\n- [x] Docs cleanup follow-through: ensure all production runbooks include v0.25.0 smoke checks for `/knowledge`, `/workflows`, `/settings/connectors`, and Ask `noteRefs`.\n- [x] FP engineering review captured: `docs/ENGINEERING_GUARDRAILS.md` now defines typed state, auth-mode, append-only event, async effect, and verifier failure rules.\n- [x] Knowledge Workspace note embeddings: pgvector semantic search (migration 0028).\n- [x] Note-to-entity linking UI: entity search picker in Knowledge sidebar.\n- [x] Direct "Create Decision from this brief": synthesis questions link to pre-filled decision form.\n- [x] Backcast → dashboard seeding: `GET /api/dashboard/[role]/suggested` from strategy profile + workflow backcast.

## Engineering Guardrails (added 2026-06-25)

These tasks come from the FP-style review of workflow/runtime risk. They should be completed before building autonomous review loops, local/on-prem distribution, or high-trust connector sync automation.

- [x] Create guardrails doc: `docs/ENGINEERING_GUARDRAILS.md`.
- [x] Add discriminated-union contracts for new runner/sync states instead of raw `status: string` shapes. CLOSED 2026-06-25 — `lib/guardrails.ts` `RunnerState` + `runnerStateSchema`.
- [x] Add explicit auth-mode contract before local/on-prem distribution: Clerk cloud, local license, offline local, hybrid sync pending. CLOSED 2026-06-25 — `AuthMode` + `authModeSchema` + `canSyncToCloud()` + `authModeTransitionEvent()`.
- [x] Add append-only run/sync/verifier event records before exposing autonomous workflow loops. CLOSED 2026-06-25 — `RunnerEvent` + `runnerEvent()` builder (8 event types).
- [x] Add visible `EffectResult`-style result contracts for disk, network, LLM, storage, and source-system effects. CLOSED 2026-06-25 — `EffectResult<T>` + `ok()`/`err()`/`mapEffect()`/`runEffect()` + 9-type error taxonomy.
- [x] Add verifier/runner outcome taxonomy: passed, user-fixable failed, system error, timeout, OOM, permission denied, policy denied, provider unavailable, cancelled. CLOSED 2026-06-25 — `VerifierOutcome` + `isRetryableOutcome`/`isUserActionable` exhaustive switches.
- [x] Add `assertNever`-style exhaustive handling tests for new runner/auth/verifier states. CLOSED 2026-06-25 — `assertNever()` helper + `tests/guardrails.test.ts` (impossible-state rejection + exhaustive handling, 16 assertions).

## Architecture Review Action Items (added 2026-06-25)

These tasks come from the Queen's Architecture Review of the full stack. Human-action items (upgrading Render to Standard, Neon to Launch) are excluded; those are noted in `docs/INFRA_DECISION_MEMO.md` and the Distribution Plan. These are code/config tasks only.

- [x] Add cron job entries to `render.yaml`: dispatch runner (`/api/cron/dispatch`), billing reset (`/api/cron/billing`), and trial-to-free conversion. CLOSED 2026-06-25 — three cron services in `render.yaml`. Verify in Render dashboard after deploy.
- [x] Wire `routePolicyFor(surfaceId)` from `lib/config/model-routing.ts` into `callLLM()` in `lib/services/llm.ts`. CLOSED 2026-06-25 (Task #36) -- see item 10 above for detail.
- [x] Add workspace-level provider allow-list UI in Settings > AI Policy. CLOSED 2026-06-25 — page rewritten with multi-select of 6 providers, jurisdiction flags, local-only toggle, and live save via `PATCH /api/settings/workspace`.
- [x] Add Resend email delivery: synthesis brief template, send on scheduled cron completion, unsubscribe link. CLOSED 2026-06-25 — `lib/email/resend.ts`, wired into `synthesis-schedule.ts`, `GET /api/email/unsubscribe`, env vars in `render.yaml`. Ships silently (no-op until key is set).
- [x] Add Sentry error tracking: install SDK, tag errors by workspaceId/route/errorType, wire into API route error boundaries. Free tier covers pilot volume. CLOSED 2026-06-25 (Task #32, hardened Task #37) -- see item 13 above for detail and what is still pending (npm install + SENTRY_DSN on a machine with registry access).
- [x] Add Mode Indicator React context/provider per Design Philosophy Pillar 3.6. CLOSED 2026-06-25 — `lib/mode-context.tsx` with 4 AuthMode states, `ModeProvider` in layout, `ModeIndicator` badge in top bar. Detects from `NEXT_PUBLIC_NEXUS_DEPLOY_MODE`.
- [x] Migrate remaining company-detection/onboarding prompts into the prompt registry (P2-B follow-through, open since v0.17.0). CLOSED 2026-06-25 — `onboarding.company-detect` upgraded from stub to the full detection system prompt (v1.1.0); new `onboarding.focus-map` entry (v1.0.0). `company-detection.ts` `detectCompanyProfile`/`mapFocusToDashboard` now render via `getPrompt(...)` with workspace audit threaded from `detect-profile`/`first-focus` routes, so both prompts are versioned and emit `prompt_rendered` events. tsc clean.
- [x] Wrap multi-table repository writes in DB transactions. CLOSED 2026-06-25 (Task #35). `createDecision`/`updateDecision`, `createAction`/`updateAction`, `saveAgentOutput`, and `rollbackAgentOutput` now use `db.transaction()` so the row write and its audit-event write commit or roll back together. Added `tests/repository-transactions.test.ts`. `enqueueDispatchJob` checked and confirmed single-table -- no transaction needed.

### Architecture review notes (not tasks, but context for future work)

- **Rate limiting is already built.** v0.11.0 middleware (lines 166-177): auth 10/min, readiness 12/min, ingestion 20/min, ask 30/min, dashboard 60/min, cron 2/min, billing webhook 10/min. Returns 429 with `Retry-After` and `x-ratelimit-*` headers. Do not duplicate this work.
- **Knowledge Workspace local vault sync** (`NEXUS_VAULT_SYNC`, `NEXUS_LOCAL_VAULT_PATH`) is production-tested dual Postgres/local storage with path validation, symlink rejection, and conflict preservation. This is the prototype seam for the Tauri Desktop local-data strategy.
- **Orchestration Dispatcher** (`dispatch_jobs` with `FOR UPDATE SKIP LOCKED`) provides the atomic job claiming and retry primitives needed for local Tauri SQLite dispatch. The pattern transfers directly.
- **AuthMode contracts** in `docs/ENGINEERING_GUARDRAILS.md` (lines 47-62) already define the Clerk-to-local-auth transition for Tauri Desktop Phase 2. Implementation is deferred, not undesigned.
- **Connector architecture has two runtimes** (2026-06-26). All 8 existing connectors (Slack, Google Drive, SharePoint, GitHub, Jira, HubSpot, QuickBooks, LinkedIn) use OAuth + REST (`fetch()` only). IMAP email (Spacemail, Fastmail, cPanel, self-hosted) requires TCP sockets, TLS negotiation, and MIME parsing via `imapflow`. This is a second connector runtime. Build one "IMAP Email" connector (protocol-level, user provides server/port/credentials). No POP3. Credential encryption already solved (`lib/crypto.ts`, AES-256-GCM). Sequence: prove OAuth pattern e2e (Google Drive, Gmail/Outlook) first, then build IMAP as a separate architecture track. See `ARCHITECTURE.md` S13.

**Design priority order (updated 2026-06-26):**
1. [x] Figma Pro selected as active design workspace; Penpot parked until MCP/plugin compatibility improves.
2. [x] Consulting-grade v1 design direction captured in `docs/UI_UX_FLOW_PLAN.md`.
3. [x] First Figma screens started: Executive Command Center, Agent Control Profile, Workflow Twin Run.
4. [x] Complete next Figma screen batch: Mission Creation, Mission Run Detail, Evidence Room, Approval Inbox.
5. [ ] Lock design system: Tailwind config + Figma variables round-trip (UI/UX Workplan Phase 1).
6. [~] Verify/rebuild Batch 1-2 screens with expert review P1 fixes applied.
   - [x] Primary action hierarchy: one dominant next action on each existing Figma screen.
   - [x] Live CEO dashboard bridge: command-center layer added above the existing executive synthesis stack.
   - [x] Desktop option comparison: Figma page `03 Desktop Options - Render vs Proposed` now has Option A for current room-based Render structure and Option B for the proposed command-center-over-rooms model.
   - [x] End-to-end surface story: Figma page `04 V0.1 V0.2 Desktop Buildout` now covers the broader product arc documented in `docs/UI_UX_SURFACE_INVENTORY_2026-06-26.md`.
   - [x] Full V0.1 desktop prototype: Figma page `05 V0.1 Full Desktop Prototype` now has 30 browser screens for the complete Render-aligned room-and-tool journey.
   - [x] Full V0.2 desktop prototype: Figma page `06 V0.2 Full Desktop Prototype` now mirrors the 30-screen journey with guided routing, trust drawer, source coverage, owner, approval consequence, and audit-readiness cues.
   - [x] Trust Drawer pattern from confidence/evidence badges — built 2026-06-26 on the live `/dashboard/ceo` bridge (`lib/trust-drawer-context.tsx`, `components/trust-drawer.tsx`, `components/ui/trust-drawer-trigger.tsx`); rolled out 2026-06-26 across Ask, Approvals, Recommendations, Decisions, Sources, and Export Hub. Confidence is shown as `null` (no fabricated score) wherever a surface has evidence but no real aggregate number, via the new `EvidenceCountLink` trigger.
   - [x] Approval Consequence Preview — built 2026-06-26 (`components/ui/consequence-preview.tsx`, `useConsequencePreview` hook); gates single-item decisions on Approvals (`app/approvals/page.tsx`) and Recommendations (`components/recommendation-list.tsx`). Copy verified against the real API routes (`app/api/evidence/[id]/review/route.ts`, `app/api/approvals/[recommendationId]/route.ts`) — `loopsBack` omitted on the recommendation flow since no reversibility path exists in the backend.
   - [x] Now / Next strip on mission/workflow screens — built 2026-06-26 (`components/ui/now-next-strip.tsx`); rendered on open Decisions (`app/decisions/page.tsx`) from real `Action` records (owner, dueDate, isBlocker, status). No synthetic "Mission" entity invented — Decision/Action is the real running-workflow analog in this codebase.
   - [x] Nav health badges — built 2026-06-26 (`app/api/nav/health/route.ts`, wired into `components/side-nav.tsx`). Four real, deterministic counts: approvals pending, risks open (`buildRiskRadar` high-severity), evidence below threshold, workflows blocked.
   - [x] Agent passport drift metadata — built 2026-06-26 in `app/settings/page.tsx` (Agent Governance tab, Searchable Agent Output Log). Compares each `AgentOutput.agentVersion` (stored at generation time) against the agent's current Agent Control Profile version; shows a "Passport drift" chip only when they genuinely disagree. No new schema — both fields already existed (`lib/contracts.ts` `agentOutputSchema`, `agentControlProfileSchema`).
7. [ ] Complete governance/admin screen batch: Risk and Audit, Integration Hub, Integration Detail, Governance Settings.
8. [ ] Complete onboarding/prototype handoff batch: User and Role Management, Company Setup, First Mission Template, Audit Export / Executive Pack.
9. [ ] Build expert review mini features: Trust Drawer, Approval Consequence Preview, Command Palette, Mission Health Score.
10. [~] Design-to-code generation: React/Next.js components from Figma via `get_design_context` — proven both directions (write via `use_figma`, read back via `get_design_context`) for all 6 signature patterns; full screen-by-screen generation still open.
11. [ ] Empty/loading/error states for all screens.
12. [x] Convert repeated Figma UI patterns into reusable components and Code Connect mappings — 2026-06-26. All 6 locked signature patterns now genuinely represented on Figma page `06 V0.2 Full Desktop Prototype`: Trust Drawer, Approval Consequence Preview, Now/Next strip already existed; Mode Indicator (`54:2`), Nav Health Badges (`54:25`), Passport Drift Warning (`54:48`) were built this session from the real shipped code, not faked. Live Code Connect API submission is blocked by Figma plan tier (Org/Enterprise required; Ali declined to upgrade) — mappings recorded manually in `docs/UI_UX_WORKPLAN.md` §1a instead. Patterns are duplicated frames, not true component instances, so each mapping is representative, not cascading.

**Figma MCP capability note (verified 2026-06-25):** The connected Figma MCP has full Plugin API write access via `use_figma`, not just Framelink read-only. Claude can create/edit screens, components, and variables directly in Figma AND read designs back as code. See `docs/UI_UX_WORKPLAN.md` for the full MCP-aware workflow.

What is built at v0.18.0 (Executive Synthesis Layer):
- No new DB migrations. Synthesis is computed on demand from existing agent outputs + evidence.
- `lib/services/synthesis.ts` -- dispatcher calls `cardsForRole()`, synthesis engine answers
  role-specific questions in parallel. CEO: 7 cross-functional questions. COO, CFO, CTO, CBO,
  CHRO: 5 role-tuned questions. All other roles: 5 generic leadership questions.
- Archetype language (bank CEO vs coffee shop owner) carried through via `buildCompanyContext()`.
- Red-team check applied per question answer before returning to user.
- `synthesis.executive` added to prompt registry.
- `GET /api/synthesis/:role` -- scope `read:dashboard`. Returns `ExecutiveSynthesis`.
- `ExecutiveSynthesisBrief` component -- primary hero panel with numbered Q&A, confidence badge,
  evidence count, answered/total indicator.
- `AgentDetailSection` component -- collapsible wrapper for agent cards below synthesis.
- `SynthesisBriefSkeleton` -- loading skeleton.
- `components/dashboard-panel.tsx` reframed -- synthesis primary, agent cards collapsible.
  Dashboard cards are generated once and reused by synthesis. Single-agent filter bypasses synthesis.
- `ExecutiveSynthesis` and `ExecutiveSynthesisQuestion` types in `lib/contracts.ts`.
- `docs/EXECUTIVE_SYNTHESIS_SPEC.md` committed.
- 13 tests in `tests/synthesis.test.ts`.

What is built locally for v0.25.0 (Knowledge Workspace and Live Vault Sync):
- Migration 0026 adds `knowledge_notes`, `knowledge_links`, and `knowledge_sync_events`.
- Contracts cover knowledge note status/source kind/link type, note input, links, search results, graph shape, sync mode, and sync events.
- `/knowledge` provides a three-pane workspace: vault tree/search, markdown editor/preview/graph, backlinks/Nexus refs/import/export/triage/sync controls.
- Markdown support includes frontmatter parse/write, `[[wikilinks]]`, `#tags`, headings, typed refs, search scoring, and graph projection.
- APIs: notes CRUD, search, graph, import, export, triage, and sync under `/api/knowledge/*`.
- Optional local vault sync: `NEXUS_VAULT_SYNC=disabled|readonly|bidirectional` and `NEXUS_LOCAL_VAULT_PATH=/absolute/path/to/vault`.
- MCP wrapper: `npm run mcp:knowledge -w @nexus/mission-control` exposing memory/search/read/write/status/sync/graph tools.
- Ask now returns `noteRefs` separately from `evidenceRefs`.
- Verification: TypeScript clean, 29 test files / 187 tests passing, production build passed, production audit clean.
- Spec: `docs/KNOWLEDGE_WORKSPACE.md`.

What is built at v0.18.1 (Executive Synthesis Traceability):
- Each synthesis question now carries readable `sources` and extracted `entities`.
- Dashboard synthesis answers show clickable evidence source pills.
- Dashboard synthesis answers show company-memory entity chips derived from overlapping evidence refs.
- Older synthesis payloads remain valid because `sources` and `entities` default to empty arrays.
- No DB migration required.
- 14 synthesis tests; 103 total tests.

What is built at v0.18.2 (Executive Synthesis Refresh/History):
- `POST /api/synthesis/[role]` regenerates a synthesis and persists it as `agent_outputs.agent_id = synthesis_<role>`.
- Dashboard synthesis panel has a `Refresh brief` button.
- Synthesis history uses existing U3 agent output versioning, active switching, rollback plumbing, and audit events.
- No DB migration required.
- 15 synthesis tests; 104 total tests.

What is built locally for v0.16.0 (Phase 8A — Decision & Action Twin):
- Migration 0017: extended `decisions` table (sourceOutputId FK, deadline, priority, timestamps).
  New `actions` table (decisionId FK cascade, actionText, owner, dueDate, isBlocker, status, completedAt).
- Contracts: extended `decisionSchema` + `decisionInputSchema`; new `actionSchema`, `actionInputSchema`,
  `actionStatusSchema`, `decisionPrioritySchema`.
- Repository: `listDecisions`, `createDecision`, `updateDecision`, `listActions`, `createAction`,
  `updateAction` — all Postgres-first with in-memory fallback + audit events on every mutation.
- Store: `saveDecision`, `listActions`, `saveAction` in-memory fallback with blocker-first sort.
- API: `GET/POST /api/decisions`, `PATCH /api/decisions/[id]`,
  `GET/POST /api/actions`, `PATCH /api/actions/[id]`.
- Decisions page: full interactive rewrite — priority badges, status tabs, summary strip (open/decided/
  open actions/blockers), Mark Decided button, inline action list with checkbox completion,
  blocker badge, overdue date highlighting, Add Action inline form, New Decision form.

What is built at v0.16.1 (Decision Auto-Extraction):
- `POST /api/decisions/extract` proposes decision/action drafts from recent `agent_outputs`.
- `lib/services/decision-extraction.ts` extracts structured decisions with sourceOutputId,
  evidence refs, priority, owner, rationale, and proposed actions.
- `/decisions` now includes "Propose from agent outputs", an AI-proposed decision panel,
  and explicit human acceptance before any decision/action becomes canonical.

What is built at v0.16.2 (Persistent Ask Conversation Memory):
- Migration 0018 `ask_conversation_messages` table with workspace/user/date index.
- `ConversationMessage` contract plus Postgres-first repository methods:
  get, append, and clear conversation.
- `GET /api/ask` loads history, `DELETE /api/ask` clears history, and `POST /api/ask`
  injects recent turns into retrieval prompt context.
- Ask UI loads persistent history on open and clears it server-side.

What is built at v0.16.3 (Entity Extraction Pipeline):
- Migration 0019 adds `evidence_entity_links` to connect extracted entities to source evidence.
- Entity contracts cover people, organizations, projects, risks, KPIs, amounts, dates, systems,
  processes, locations, products, and unknowns.
- Processed evidence now triggers deterministic entity extraction after ingestion.
- Repository methods list and upsert entities with evidence refs and confidence.
- `GET /api/entities` exposes workspace-scoped entity summaries with type/search/limit filters.
- Tests cover risk/system/process/amount/date/org extraction and evidence linkage.

What is built locally for v0.15.1 (Demo Pack Audit):
- All 3 sector packs rewritten to CEO sales-test standard: named metrics, named risks,
  named deadlines, named people, consequence language.
- Added `suggestedQuestions` (3 per pack, pre-tuned, not AI-generated at runtime).
- Added `demoSummary` field (one sentence per pack for Settings UI).
- Settings → Demo tab shows post-reset panel with workspace name, summary, and numbered questions.

What is built locally for v0.15.0 (U4 Learning Signals):
- Migration 0016 `learning_signals` table with FK cascade on agent_outputs.
- `LearningSignalType` enum, `learningSignalSchema`, `learningSignalInputSchema`,
  `learningSignalSummarySchema` in contracts.ts.
- `saveLearnningSignal`, `listLearningSignals`, `getLearningSignalSummary` in repository + store.
- Every signal write fires an `agent_learning_signal` audit event.
- `POST /api/learning-signals`, `GET /api/learning-signals`, `GET /api/learning-signals/summary`.
- Agent Output Log now shows Approve / Edit / Reject / thumbs_up / thumbs_down per output card.
- 12 tests in `tests/learning-signals.test.ts`.

What is built locally for v0.14.1:
- U3 `agent_outputs` table, migration 0015, contract, DB repository, and in-memory fallback.
- Dashboard agent brief generation now writes full output history with agent id, agent version,
  role key, prompt summary, evidence refs, confidence, active version, and output version.
- Rollback API restores a previous output version, deactivates the current version, preserves
  all history, and writes an audit event.
- Settings → Agent Governance now includes a searchable Agent Output Log with agent/date filters
  and rollback controls.
- U3 tests cover version retention, active output switching, rollback, and audit visibility.

What is built locally for v0.14.0:
- U2 Agent Governance Settings UI with profile listing, seeding, edit-as-new-version,
  suspend, and resume flows.
- Three regulated-buyer demo passports: Regulatory Response Agent, Legal Redline Agent,
  and Proposal Partner Agent.
- Ask retrieval now accepts `agentKey` and applies passport filters before vector and keyword
  ranking; denied evidence is audited and never enters model context.
- Dashboard and Ask output gates now route deterministic legal/regulatory/pricing/data/privacy
  triggers to human review, block hard-stop actions, and suspend persisted offending profiles.
- Runtime tool guard helper audits denied tool invocations with agent key, tool, action, actor,
  and deny reason.
- U2 tests expanded to cover Ask passport filtering, suspended agents, output gates, tool-denial
  audit events, and passport version retention.

What is built locally for v0.13.2:
- Agent Control Profile/passport contract, enums, migration 0014, DB table, in-memory fallback,
  repository methods, default passport builder, and server-side policy helpers.
- Dashboard generation now filters evidence through the active/default agent passport before any
  evidence reaches the LLM prompt; deny events are written to audit.
- Admin API endpoints for listing/seeding/versioning/suspending agent passports.
- Passport policy and contract tests added.

What is built locally for v0.13.4:
- Dependabot alert #5 fixed: vulnerable `next/node_modules/postcss@8.4.31` removed.
- `npm audit --json` reports 0 vulnerabilities.

What is built at v0.13.1:
- Public `/readiness` AI-Native Readiness Assessment with seven-dimension scoring, no login required.
- `POST /api/readiness/submit` lead/audit capture endpoint, public and rate-limited.
- Supporting docs: readiness assessment, workflow twin scorer, shadow-mode ROI playbook,
  Govern and Assure messaging, and U2 agent passport spec.
- Client-safe company file classification split from server-only LLM detection to keep the
  onboarding wizard out of the Node/Postgres bundle.

What is built at v0.12.0 (in addition to v0.11.0):
- Export API routes: weekly brief, risk radar (CSV), reco register (CSV), one-pager
- Print pages: /export hub, /export/weekly-brief, /export/one-pager
- Demo mode: schema + migration 0013 + DEMO badge + ingestion block + Settings toggle
- Demo reset: POST /api/workspace/demo-reset + 3 sector packs (financial services, consulting, SaaS)
- Pilot kit: /pilot-kit — sponsor onboarding checklist + success scorecard (print-ready)
- docs/PILOT_BILLING_TRIGGERS.md — billing conditions, pricing tiers, Stripe automation spec
- TypeScript clean. Migrations 0012 + 0013 need to run on production before deploy.

V1.1 sequencing added from `docs/V1_1_UPGRADE_PLAN.md`:
- Tier 1 before first pilot (v0.14.0): U1 readiness assessment, U2 agent control profile/passport,
  U3 searchable per-agent log + rollback, U4 learning-signal capture
- Tier 2 fast-follow (v0.15.0): Phase 8A Decision & Action Twin first, then Phase 8B workflow
  twin scorer/client selection, then Phase 8C Ops Review Twin, plus backcasting, shadow-mode ROI,
  and trusted evals when real usage data exists
- Tier 3 later with company memory: U9 learning loop and improvement reporting

What was built before (v0.10.3 + v0.11.0):
- 7-step AI-assisted onboarding wizard — company detection, archetype-aware role selection,
  staged roles, dual-hat handling, fallback questions, focus mapping, governance defaults
- 20-role registry with deterministic relevance engine (`lib/domain/role-registry.ts`,
  `lib/services/role-suggestion.ts`)
- Five business archetypes — corporate, startup_scaleup, sme_physical, digital_native,
  professional_practice — driving role labels, brief language, and evidence expectations
- Expanded specialist agents for all 20 roles including CFO, CRO, CCO, CMO, Growth Officer,
  VP Performance Marketing, Brand/Community, CPO, CHRO, Chief of Staff, Managing Partner,
  Chief Medical, VP Supply Chain, Project Director, Practice Lead, General Counsel, Franchise Manager
- Digital/social/WhatsApp/local evidence classifier (ad_performance, social_export,
  whatsapp_business, local_business, creator_performance, email_crm source types)
- Agent Room navigation in the side nav — Finance, Risk, People rooms alongside the core rooms
- Agent-level filtering with `?agent=...` on dashboard pages
- Brief-language modes — plain English for sme_physical, formal for corporate
- Settings: archetype, brief language, location count, role states visible and editable
- Per-workspace LLM rate limits, evidence delete, audit log, department filters
- Migration 0010 (connectorInstanceId), migration 0011 (archetype + roleStates fields)
- Full CSP + CORS + rate limiting in middleware
- Workspace status enum + trial_ends_at + llm_usage table (migration 0012)
- Trial banner + suspension banner in layout
- LLM cost tracking to DB (fire-and-forget, every call)
- In-app feedback button + POST /api/feedback
- docs/DR_RUNBOOK.md + docs/SECURITY_REVIEW.md
- TypeScript clean. 12 test files, 44 tests passing.

---

## Strategic Build Priority (commercial logic)

The phases are ordered by what unblocks revenue, not by complexity:

1. **Phase 7D** — V1.1 governance hardening and readiness on-ramp. Required before first signed
   pilot, especially for regulated buyers.
2. **Phase 7A** — Role system expansion. Unblocks everything downstream.
   Without this the product serves only 4 role types. With it, every company type is covered.
3. **Phase 8** — Paid pilot packaging. Weekly brief export, risk radar, demo reset.
   This is what converts demos into signed pilots. Should be built alongside Phase 7A.
4. **Phase 7B** — Agent Rooms UI reframe. Changes how the product is perceived and sold.
5. **Phase 8A** — Universal workflow twin foundation. Decision & Action Twin turns approved
   evidence into decisions, owners, risks, blockers, action items, and recommendations.
6. **Phase 8B** — Workflow twin scorer and client selection. Lets each client pick their first
   Parallel Workflow Pilot without over-niching Nexus into one industry.
7. **Phase 8C** — Ops Review Twin. Weekly operating cadence for blockers, KPIs, overdue owners,
   process gaps, and department follow-ups.
8. **Phase 9B** — Mobile and voice. WhatsApp briefings are a market differentiator in GCC/Pakistan.
9. **Phase 9** — Team members. Required once pilots have more than one user per workspace.
10. **Phase 10** — Core connectors. Each connector removes a manual upload step from the workflow.
11. **Phase 10B** — Infrastructure connectors. Banking, payments, POS, regulatory portals.
   Priority for GCC/Pakistan pilots — these clients have operational data in these systems.
12. **Phase 11** — Social and market signals. Digital-native and D2C companies.
13. **Phase 12** — Company memory. The long-term compounding value of the product, including U9.
14. **Phases 13–15** — Local edge, contextual agents, Obsidian experience. Enterprise moat.

---

## Roadmap Principle

Build from **essential** to **aspirational**:

1. Make the product trustworthy, usable, and sellable.
2. Prove the paid pilot loop with documents, evidence, dashboards, Ask, recommendations, and approvals.
3. Expand role coverage and channel delivery (WhatsApp, voice).
4. Add enterprise connectors, team collaboration, and company memory.
5. Build the local edge, contextual agents, and graph experience as the enterprise moat.

Positioning rule from the 2026-05-31 reassessment:
- Nexus is a governed intelligence operating layer for high-stakes professional workflows.
- Client-facing language should use Strategic Mandate, Operating Doctrine, Policy Guardrails,
  Human Approval Layer, Parallel Workflow Pilot, and Decision Workflow Engine.
- Avoid broad ExO rhetoric in client-facing copy: no "100x" claims, no workforce-replacement
  positioning, no "fully autonomous company" claims, and no promise that agents act without
  human approval.

---

## Phase 1 — Essential Foundation

- [x] Create Mission Control app in `apps/mission-control`
- [x] Add Clerk auth and workspace scoping
- [x] Add Postgres/Drizzle schema and migrations
- [x] Add ingestion contracts, provenance, confidence, quarantine statuses
- [x] Add R2 original-file storage path
- [x] Add pgvector migration and vector retrieval path
- [x] Deploy on Render
- [x] Verify live auth, ingestion, and workspace scoping
- [x] Add dependency vulnerability cleanup pass
- [x] Add production health checklist for DB, vector search, object storage, auth, and LLM provider

---

## Phase 2 — AI Trust and Operating Model

> Note: 4 tasks remain open. These are production-readiness items — not required for pilot demos
> but essential before scaling to multiple paying clients. Recommended: complete alongside Phase 8.

- [x] Define AI modes used across the product: Detect, Extract, Classify, Summarize, Reason, Recommend, Draft, Monitor, Route, Act-with-Approval
- [x] Define AI trust levels: deterministic system action, AI-assisted suggestion, AI-generated draft, human-approved output, blocked/refused output
- [x] Define global AI output contract: answer, confidence, evidence refs, freshness, sensitivity, reasoning note, suggested next action, and refusal reason
- [x] Define where AI can act autonomously: low-risk classification, deduplication suggestions, search expansion, draft generation, and non-sensitive summaries
- [x] Define where AI must ask for approval: recommendations, outbound messages, canonical memory promotion, sensitive summaries, connector actions, and agent task completion
- [x] Define where AI must never act in V1: financial transactions, HR actions, legal commitments, contract approvals, system writebacks, social posting, or external commitments
- [x] Add AI model-routing policy by task type: cheap model for classification, stronger model for synthesis, embedding model for retrieval, local model for sensitive extraction
- [x] Add AI cost and latency budgets per task type
- [x] Add AI fallback policy when provider fails: retry, downgrade model, deterministic fallback, or human review queue
- [x] Add AI audit event schema for every generation, classification, recommendation, refusal, and agent action
- [x] Add hallucination controls: cite evidence, refuse weak evidence, show confidence, and never invent source references
- [x] Add per-phase AI responsibility map so every roadmap phase states what AI detects, what AI drafts, what AI routes, and what humans approve
### P2-A: AI Evaluation Harness
> Required before regulated-sector pilots. Financial services and GCC clients will ask "how do you
> test the AI?" before signing. Shipped in v0.17.0.

- [x] Create `lib/eval/golden-set.ts` with 30 cases across risk detection, decision framing,
      recommendation quality, sector classification, source grounding, and restricted-data refusal.
- [x] Create `lib/eval/harness.ts` with deterministic scoring, latency, confidence, and aggregate summaries.
- [x] Add `POST /api/eval/run` admin route with 5-minute workspace rate limit.
- [x] Add `GET /api/eval/results` admin route backed by `eval_runs` with audit fallback.
- [x] Add Settings → Eval tab with latest run, pass-rate badge, run button, and case preview.
- [x] Add `tests/eval-harness.test.ts`.

### P2-B: Prompt Version Registry
> Required before second team member edits prompts. Prevents silent regressions.
> Shipped in v0.17.0.

- [x] Create `lib/prompts/registry.ts` with keyed prompt entries, versions, owners, descriptions,
      changelog, and lastUpdated.
- [x] Move Ask and dashboard system prompts to registry-backed `getPrompt()` calls.
- [x] Add `getPrompt()` interpolation, unknown-key errors, missing-variable errors, and optional audit.
- [x] Add `GET /api/prompts` admin route returning manifest metadata only.
- [x] Add Settings → Prompts read-only manifest tab.
- [x] Add `tests/prompt-registry.test.ts`.
- [ ] Future cleanup: migrate remaining company-detection/onboarding prompts into the registry.

### P2-C: Red-Team Checks
> Required before any regulated-sector pilot receives real client data.
> Shipped in v0.17.0.

- [x] Create `lib/security/red-team.ts` with `checkOutput()` and sanitized content.
- [x] Implement PII, overconfidence, unsafe action, sensitivity ceiling, and hard-stop checks.
- [x] Wire red-team checks into dashboard brief generation before display/output save.
- [x] Wire red-team checks into Ask synthesis before response return.
- [x] Add `tests/red-team.test.ts`.

### P2-D: Workspace AI Policy Settings
> Required for pilot clients who need UI control over AI behaviour (currently env-var only).
> Shipped in v0.17.0.

- [x] Add workspace AI policy columns in migration `0020_p2_trust_layer.sql`.
- [x] Update `workspaceSettingsSchema` in `contracts.ts`.
- [x] Update repository + store read/write paths.
- [x] Update `lib/services/llm.ts` to enforce provider allow-list and local-only mode.
- [x] Update dashboard and Ask to route low-confidence outputs to human review.
- [x] Add Settings → AI Policy tab.
- [x] Add `tests/ai-policy.test.ts`.

---

## Phase 3 — Public Front Door, Trust, and Licensing

- [x] Add public landing page before authenticated app routes
- [x] Add hero section with headline: "Your company's second brain for decisions, risks, and executive action."
- [x] Add subheadline explaining evidence-backed briefs, recommendations, role-aware intelligence, and company memory
- [x] Add primary CTA: "Start a Pilot"
- [x] Add secondary CTA: "View Demo Workspace"
- [x] Add product mockup area showing CEO Brief, Risk Radar, Decision Memo, and Evidence Panel
- [x] Add value cards: Evidence-backed answers, Company memory that compounds, Cloud or local processing for sensitive files
- [x] Add trust line: "Built for human-approved executive intelligence. Every answer links back to evidence."
- [x] Add `/terms` page
- [x] Add `/privacy` page
- [x] Add `/security` page
- [x] Add `/acceptable-use` page
- [x] Add enterprise `/data-processing` placeholder for future DPA flow
- [x] Adopt PolyForm Noncommercial 1.0.0 for public source distribution
- [x] Add commercial license available notice to README
- [x] Add `LICENSE.md` with PolyForm Noncommercial terms
- [x] Add human-review disclaimer for AI-generated executive outputs
- [x] Add customer data ownership statement
- [x] Add beta/pilot software disclaimer

---

## Phase 4 — Core Product UX Stabilization

- [x] Batch upload up to 10 files in onboarding
- [x] Batch upload up to 10 files in dashboard ingestion
- [x] Add active side-nav highlighting
- [x] Add dashboard loading skeletons
- [x] Polish Ask tab history, source details, and suggested prompts
- [x] Polish ingestion result guidance and quarantine refresh prompt
- [x] Polish recommendations empty state and actor handling
- [x] Rewrite remaining technical page descriptions into exec-friendly language
- [x] Add mobile/tablet navigation behavior
- [x] Convert duplicated dashboard routes into one dynamic route
- [x] Add richer source display instead of raw evidence IDs where possible
- [x] Add richer original document preview path

---

## Phase 5 — Company Context Onboarding

- [x] Add sector/company type library
- [x] Add workspace profile contract and persistence
- [x] Add onboarding step for company type before uploads
- [x] Add free-text company description box
- [x] Add AI classifier for sector, subsector, business model, likely roles, likely documents, KPIs, and risk defaults
- [x] Add deterministic fallback when AI is unavailable
- [x] Let users confirm/edit AI-generated company profile
- [x] Use company profile in dashboard and Ask prompts
- [x] Use company profile to recommend first upload pack
- [x] Add Settings page editor for company profile after onboarding
- [x] Persist confirmed upload-pack suggestions or derive them from the stored sector profile on demand
- [x] Add AI responsibility notes: AI detects sector/profile, suggests roles/docs/KPIs/risks, humans confirm profile before it becomes workspace context
- [x] Add profile-confidence gate: low-confidence company detection routes to manual selection instead of silently applying defaults
- [x] Add "Can't find your industry?" fallback — free-text AI classification for non-standard sectors
- [x] Add 7-step AI-assisted onboarding wizard: Workspace, Discover, Profile, Roles, Upload, Preview, Go Live
- [x] Add Add Role feature in wizard — custom roles (CFO, CRO, Risk/Compliance) persist alongside pre-built roles
- [x] Add governance and policy defaults panel in profile step — shows auto-approved/pending/quarantine thresholds and sensitivity default
- [x] Add regulated-sector callout — financial_services and healthcare show elevated confidentiality notice
- [x] Add sector-aware file classification in wizard upload step (sector passed to classifyFilename)
- [x] Add AI focus mapping — mapFocusToDashboard() maps user intent to dashboards + first questions
- [x] Add POST /api/workspace/first-focus — focus intent API with company context enrichment
- [x] Add AI-driven Go Live step — user types priority, AI recommends dashboards with "Start here" badge and pre-populates Ask panel via ?q= param
- [x] Add sector-aware ingestion classification outside wizard — every file upload now uses workspace sector for smart defaults

---

## Phase 6 — Evidence, Ingestion, and Governance

- [x] Add department taxonomy
- [x] Add department metadata to evidence records
- [x] Let users choose department during upload
- [x] Add AI-suggested department labels per file (classifyFilename, sector-aware)
- [x] Add sector-specific department defaults
- [x] Add AI responsibility notes: AI classifies document department/sensitivity, humans can override, restricted files inherit stricter processing rules
- [x] Add AI refusal patterns for missing evidence, low confidence, restricted data, stale sources, and role-unauthorized requests
- [x] Add department filters in Sources, Ingestion, and Ask (Sources/Ingestion had filters; Ask upgraded to chip selector with server-side department list)
- [x] Add admin delete/archive path for individual evidence records in UI (DeleteEvidenceButton component + Sources page)
- [x] Add audit log page (GET /api/audit/events + Audit Log tab in Settings)
- [x] Add rate-limit/cost guardrails for LLM calls (per-workspace Map keyed by workspaceId in llm.ts; workspaceId threaded through retrieval, dashboard, recommendations)

---

## Pre-Phase 7A — Technical Prep ✓ COMPLETE (v0.9.1)

> Shipped in v0.9.1. Both items below are done. Neither is complex but both are
> hard blockers — Phase 7A code will fail to compile and fail at runtime without them.
>
> **Completed 2026-05-30:** `roleSchema` is now open-ended with `KNOWN_ROLES`, dashboard routes
> support custom/future role keys, fallback agent briefs are in place, and evidence records now
> support `connectorInstanceId` through contract, ingestion, repository, schema, and migration
> `0010_connector_instance.sql`.

- [x] **Widen Role type in `contracts.ts`** — change `roleSchema = z.enum(["ceo","coo","cbo","cto"])`
  to `z.string()` with a `KNOWN_ROLES = new Set([...])` constant for validation.
  Update `ROLE_AGENT_BRIEFS` in `agent-library.ts` from `Record<Role, string[]>` to
  `Partial<Record<string, string[]>>` with an unknown-key fallback to default agents.
  Update the two route files (`app/api/dashboard/[role]/route.ts` and
  `app/dashboard/[role]/page.tsx`) to use `KNOWN_ROLES.has(role)` instead of `roleSchema.safeParse`.
  Update `dashboardCardSchema` to use `z.string()` for the role field.
  Update `getRoleSummary` and `byRoleSummary` in repository and store to accept `string`.
  Verify TypeScript passes clean after the change.

- [x] **Add `connectorInstanceId` to evidence records** — add a nullable `connector_instance_id`
  text column to `evidence_records` in `db/schema.ts` and migration `0009_connector_instance.sql`.
  Update `IngestionInput` type and `ingestEvidence()` to accept an optional `connectorInstanceId`.
  Update `toEvidenceRecord()` mapper. This column is optional and defaults null for all manually
  uploaded files. Phase 10B connectors will populate it to trace which connector produced each record.
  No existing functionality changes — purely additive.

---

## Phase 7A — Role System, Business Archetypes, and Full C-Suite Expansion ✓ COMPLETE (v0.10.0–0.10.2)

> Shipped across three releases. Role registry, archetype taxonomy, role suggestion engine,
> wizard upgrade, expanded agent briefs, and digital evidence classifier are all built and tested.
> Tasks below are preserved as a record of what was designed and built.

### Design principles for this phase
- Roles are not just titles. They are defined by the company's archetype, stage, size, regulatory
  environment, and what the person in that seat actually worries about.
- The system should grow with the company. Roles can be Active (live dashboard), Staged
  (anticipated — visible but not yet populated), or Available (can be added any time).
- Street companies and digital-native companies have fundamentally different role vocabularies
  and evidence types. The product must speak their language, not impose C-suite labels on them.
- Social media and AI-driven ad performance are first-class evidence sources for internet companies,
  not optional connectors.

### Company archetype taxonomy
- [x] Define `companyArchetype` as a new field in `DetectedProfile` and `WorkspaceProfile`
- [x] Five archetypes: `corporate` (formal C-suite, governed, likely regulated), `startup_scaleup`
  (founder-led, functional titles, stage-driven), `sme_physical` (owner-operated, physical presence,
  daily cash rhythm, staff and supplier focus), `digital_native` (internet-first, performance
  marketing, social-driven, PLG or D2C motion), `professional_practice` (partnership model,
  billing by time or retainer, client relationships, no traditional C-suite)
- [x] Update `detectCompanyProfile` LLM prompt to infer `companyArchetype` from description
- [x] Add archetype-specific role label overrides: `sme_physical` uses Owner, Ops Manager, Accounts
  instead of CEO, COO, CFO. Language in agent briefs adapts accordingly.
- [x] Add archetype-specific evidence type expectations:
  - `sme_physical`: POS reports, weekly cash, Google Reviews, staff rota, supplier invoices
  - `digital_native`: Meta Ads exports, Google Ads reports, TikTok Business, social analytics,
    email CRM reports, creator/influencer performance data
  - `corporate`: board packs, risk registers, regulatory filings, financial statements
  - `startup_scaleup`: product roadmap, investor updates, burn rate, OKR tracking, hiring plan
  - `professional_practice`: engagement tracker, WIP schedule, utilisation report, client pipeline

### Full role registry (replaces 4-value enum)
- [x] Widen `Role` type in `contracts.ts` from 4-value Zod enum to open string backed by a
  `ROLE_REGISTRY` record — unknown role keys fall back to a sensible default agent set
- [x] Define all roles with: key, label, archetype relevance, sector relevance, stage threshold,
  size threshold, regulatory trigger, business model signal, and `staged` boolean

**Universal tier (always relevant, CEO is locked):**
- [x] `ceo` — CEO / MD / Founder / Owner. Locked, always first. Label adapts to archetype.
- [x] `cfo` — CFO / Head of Finance / Accounts. Relevant from growth stage or any company
  with real P&L accountability. Label becomes "Accounts" for `sme_physical`.
- [x] `coo` — COO / Head of Operations / Ops Manager. Any company with delivery complexity
  or multi-function coordination. Label becomes "Ops Manager" for `sme_physical`.

**Regulatory specialist tier (hard-triggered by sector + regulatory signal):**
- [x] `cro` — CRO / Head of Risk. Financial services, healthcare, legal, any regulated sector.
  High relevance score whenever sector = financial_services or healthcare.
- [x] `cco` — CCO / Chief Compliance Officer. Financial services, healthcare. Sometimes combined
  with CRO for smaller regulated firms. Surfaces "Compliance Officer" label for mid-size.

**Commercial and growth tier:**
- [x] `cbo` — CBO / Chief Business Officer / Strategy. B2B, professional services, growth stage.
  Evidence: BD pipeline, proposals, partner agreements, strategic plans.
- [x] `growth_officer` — VP Growth / Chief Growth Officer. `digital_native` and `startup_scaleup`
  with PLG or high-velocity acquisition motion. Different from CMO — focused on funnel, retention
  curves, LTV/CAC, and referral loops. Not relevant for `sme_physical` or `corporate`.
- [x] `vp_performance_mktg` — Head of Performance Marketing / Paid Social. Evidence: Meta Ads
  Manager exports, Google Ads reports, TikTok Business Center, attribution reports, creative
  performance data. Agents surface ROAS decay, creative fatigue, audience burn, CPM trends,
  and AI-optimised spend signals. Relevant for `digital_native` and D2C retail.
- [x] `brand_community` — Brand / Content / Community / Social. Social media follower growth,
  engagement quality, creator partnership ROI, brand sentiment, content performance. Long-game
  signal distinct from performance marketing. Relevant for D2C, consumer SaaS, retail brands.
- [x] `cmo` — CMO / Head of Marketing. Traditional brand and marketing leadership. Relevant for
  enterprise, B2B, healthcare, education. Different from `growth_officer` and `vp_performance_mktg`.

**Technology and product tier:**
- [x] `cto` — CTO / CDO. Any company building or heavily using technology as a core function.
- [x] `cpo` — CPO / Chief Product Officer. SaaS, fintech, edtech, marketplace. Evidence: product
  roadmap, sprint reports, user research, feature adoption, NPS trends.

**People tier:**
- [x] `chro` — CHRO / Head of People / HR Lead. Scale-ups and enterprises, typically 200+. Earlier
  for people-intensive businesses (healthcare, retail, hospitality). Evidence: headcount, attrition,
  hiring pipeline, culture surveys, compensation benchmarks.

**Sector-specific specialists:**
- [x] `managing_partner` — Managing Partner / Senior Partner. Professional services, law, consulting,
  advisory. Replaces CEO as primary label for `professional_practice` archetype.
- [x] `chief_medical` — Chief Medical Officer / Medical Director. Healthcare, pharma, healthtech.
- [x] `vp_supply_chain` — VP Supply Chain / Head of Procurement. Manufacturing, FMCG, retail with
  complex supplier networks. Evidence: supplier scorecards, inventory aging, lead time reports.
- [x] `project_director` — Project Director / Head of Development. Real estate, construction,
  project-based businesses. Evidence: project status, cost reports, milestone tracking.
- [x] `practice_lead` — Practice Lead / Team Lead. Consulting, legal. Often below Managing Partner.
  Evidence: utilisation, project margin, client satisfaction per practice area.
- [x] `vp_customer_success` — VP Customer Success / Head of CS. SaaS and subscription businesses.
  Evidence: NRR, churn risk, QBR status, at-risk accounts, health scores.

**Future-stage roles (shown as Staged — visible but not yet populated):**
- [x] `chief_of_staff` — Activates when company is 100+ people and CEO needs leverage. Monitors
  CEO priority list, open decisions, follow-ups, and cross-functional blockers.
- [x] `general_counsel` — Activates when company has significant contract complexity, M&A activity,
  or regulatory filings. Evidence: contracts, legal correspondence, regulatory submissions.
- [x] `franchise_manager` — Multi-location and franchise-operated businesses. Evidence: per-location
  performance, brand compliance, franchisee health signals.

### Role relevance engine
- [x] Build `suggestRolesForProfile(profile)` — deterministic function that takes `DetectedProfile`
  and returns ordered list of `{roleKey, relevanceScore, reason, state}` objects.
  CEO is always first with state=active and locked=true.
- [x] Relevance scoring uses: sector signal, archetype signal, stage threshold check, size threshold
  check, regulatory trigger, business model signal, and free-text keyword signals from description
  (e.g. "risk" → raises CRO, "marketing" → raises CMO or growth_officer depending on archetype,
  "supply chain" → raises vp_supply_chain)
- [x] Each returned role includes a one-line reason: "CRO recommended: regulated financial services
  company with payment processing operations in GCC."
- [x] Staged roles included in output with state=staged and an activation condition shown:
  "Chief of Staff activates when you reach 100+ people"

### Update detectCompanyProfile
- [x] Add `companyArchetype` to LLM output and validated response
- [x] Add `suggestedRoleReasons` map to output: `{roleKey: reason}` for each suggested role
- [x] Add `stagedRoles` array: roles anticipated for next stage with activation condition
- [x] Adjust confidence gate: if archetype or sector confidence is below 0.5, set a flag
  `requiresRoleConfirmation: true` which triggers the fallback question in the wizard

### Wizard Roles step update
- [x] CEO shown first, always selected, locked (cannot be deselected). Label adapts to archetype:
  "CEO" for corporate, "Founder / MD" for startup_scaleup, "Owner" for sme_physical,
  "Managing Partner" for professional_practice.
- [x] Pre-selected roles driven by `suggestRolesForProfile()` — archetype-aware, stage-aware,
  size-aware, regulatory-aware. Not a hardcoded list.
- [x] Each pre-selected role card shows: role label, badge (sector/archetype reason), one-line
  reason from the relevance engine ("CRO recommended: regulated fintech with payment operations"),
  and a toggle to include or exclude from active setup.
- [x] Dual-hat toggle on each role for small companies: "Is there a dedicated person in this role?"
  If no, the role is marked dual_hat and folded into CEO brief rather than creating a separate view.
- [x] Staged roles shown as a distinct section below active role selection: "These roles will
  matter as you grow." Each shows its activation condition. "Activate now" or "Remind me when
  we're ready" options. Staged roles can be activated immediately if the company is growing faster.
- [x] If `requiresRoleConfirmation: true` (low confidence detection or unusual company type):
  show the two-part plain-language fallback questions (see "Fallback question design" section)
  BEFORE the role cards. Run deterministic role suggestion from the answers before showing cards.
- [x] After fallback questions are answered, role cards update to reflect the new archetype signal.
  The transition is shown: "Based on your answers, here are the dashboards we recommend."
- [x] Custom role creation still available at the bottom: label, short description, what it monitors.

### Agent briefs for new roles
- [x] Define agent brief set for `cfo`: budget signal, margin vs plan, cash runway, revenue quality,
  variance analysis, covenant compliance (for regulated). Language adapts for `sme_physical` to
  weekly cash, supplier payment terms, payroll timing.
- [x] Define agent brief set for `cro`: risk register status, open audit findings, regulatory
  exposure, incident signals, third-party/vendor risk, capital adequacy signals.
- [x] Define agent brief set for `cco`: regulatory obligation tracker, policy gap analysis,
  submission deadlines, examination findings, breach or near-miss signals.
- [x] Define agent brief set for `cmo`: brand performance, campaign ROI, market share signals,
  customer sentiment, PR/media signals.
- [x] Define agent brief set for `growth_officer`: acquisition funnel, CAC by channel, LTV trends,
  retention curves, PLG activation rates, referral loop signals.
- [x] Define agent brief set for `vp_performance_mktg`: ROAS by campaign and channel, creative
  fatigue detection, audience saturation signals, CPM trends, AI ad spend efficiency, cross-channel
  attribution, budget pacing vs. spend. Evidence sources: Meta Ads, Google Ads, TikTok Business.
  Specific AI bidding signals: Meta Advantage+ learning phase status, creative saturation causing
  AI under-delivery, Google Performance Max asset group performance, TikTok Smart Campaign
  audience drift. These are novel signals no current BI tool surfaces — a key product differentiator.
- [x] Define agent brief set for `brand_community`: follower growth and engagement quality by
  platform (Instagram, TikTok, LinkedIn, X), content performance, creator/influencer contract
  status and deliverable tracking (what was promised, what was posted, promo code conversions,
  link click attribution), brand sentiment across channels, community health signals.
- [x] Define agent brief set for `cpo`: roadmap delivery, sprint velocity, feature adoption rate,
  user feedback themes, technical debt signals, NPS trends.
- [x] Define agent brief set for `chro`: headcount vs plan, attrition rate and risk, hiring pipeline,
  culture and engagement signals, compensation benchmarks, org design changes.
- [x] Define agent brief set for `vp_customer_success`: NRR trend, churn risk by account, QBR
  completion rate, at-risk account signals, health score distribution.
- [x] Define agent brief set for `chief_of_staff`: CEO open decisions, cross-functional blockers,
  follow-up tracker, priority vs time allocation signals.
- [x] Define agent brief set for `managing_partner`: partner utilisation, client relationship
  health, firm-wide profitability, key-person risk, pipeline by partner.
- [x] Define agent brief set for `chief_medical`: patient safety signals, clinical audit findings,
  regulatory compliance status (accreditation, inspections), staff clinical competency, adverse
  event trends, clinical outcome metrics vs benchmarks.
- [x] Define agent brief set for `vp_supply_chain`: supplier scorecard and lead times, inventory
  aging and buffer stock levels, OTIF (on-time-in-full) delivery rate, single-source risk
  concentration, raw material price variance, inbound logistics delays.
- [x] Define agent brief set for `project_director`: project milestone status, cost variance vs
  budget, contractor performance and payment schedule, risk register for active projects,
  planning approval status, defects and snagging list progress.
- [x] Define agent brief set for `practice_lead`: billable utilisation rate for their team,
  project margin per engagement, client satisfaction signals, capacity vs pipeline, key-person
  risk within the practice, upcoming renewal and rebid opportunities.
- [x] Define agent brief set for `general_counsel`: active contract status and renewal calendar,
  litigation and dispute exposure, regulatory submission deadlines, M&A due diligence status,
  IP and IP risk signals, external counsel cost tracking.
- [x] Define agent brief set for `franchise_manager`: per-location performance vs brand standards,
  franchisee P&L health, compliance audit findings per location, brand consistency signals,
  franchisee satisfaction and retention risk, royalty payment status.
- [x] Street company (sme_physical) agent briefs: daily and weekly cash position, supplier credit
  terms and payment due dates, Google My Business signals (search appearance, direction requests,
  calls from listing, review average and recent reviews), staff attendance and rota gaps,
  per-location sales vs prior week, local ad campaign performance (Google Local, Meta radius,
  WhatsApp broadcast reach and response rate), customer return rate signals.

### Agent brief language modes (archetype-specific language rules)
- [x] Define two brief language modes: `formal` (default for corporate and professional_practice)
  and `plain` (for sme_physical). startup_scaleup and digital_native use formal but with
  startup-appropriate vocabulary (burn rate, runway, ARR, PLG — not EBITDA or capex).
- [x] `sme_physical` mode explicitly prohibits these terms in generated briefs: "EBITDA",
  "covenant compliance", "IRR", "capex", "WACC", "board pack", "regulatory filing",
  "capital adequacy", "net present value". Replacements: "weekly profit", "loan repayment terms",
  "return on your investment", "equipment spend", "cost of borrowing", "weekly business summary".
- [x] Agent brief length also adapts: `sme_physical` produces 2-3 sentence briefs max with a
  single clear action. `corporate` produces structured briefs with evidence refs and confidence
  scores. Both are grounded in evidence but the communication style is completely different.
- [x] Store `briefLanguageMode` on workspace profile derived from archetype. Passed to every
  agent brief generation call alongside company context.

### Digital marketing, social, and local evidence classifier
- [x] Add source types to evidence registry: `ad_performance`, `social_export`, `local_business`,
  `whatsapp_business`, `creator_performance`, `email_crm`
- [x] Update `classifyFilename` to recognise paid marketing exports:
  Meta Ads Manager exports, Google Ads reports, Google Performance Max reports, TikTok Business
  Center exports, LinkedIn Campaign Manager exports, Snapchat Ads exports.
  Classify as department=Marketing, sourceType=ad_performance, sensitivity=internal.
- [x] Update `classifyFilename` to recognise organic social exports:
  Instagram Insights, TikTok Business analytics, LinkedIn Company Page analytics (organic, not
  just paid), Facebook Page Insights, YouTube Studio exports, Twitter/X analytics.
  Classify as department=Marketing, sourceType=social_export, sensitivity=internal.
- [x] Update `classifyFilename` to recognise WhatsApp Business exports: broadcast analytics,
  message report, catalog performance, contact list export. WhatsApp Business is a primary
  marketing, sales, and customer service channel in GCC and Pakistan markets. Classify as
  department=Marketing, sourceType=whatsapp_business, sensitivity=confidential (contains
  customer contact data).
- [x] Update `classifyFilename` to recognise Google My Business exports and reports: search
  appearance reports, direction request data, call analytics, review export. Classify as
  department=Marketing, sourceType=local_business, sensitivity=internal.
- [x] Update `classifyFilename` to recognise creator/influencer performance reports:
  influencer contract summaries, deliverable tracking sheets, promo code redemption reports,
  affiliate link performance exports. Classify as department=Marketing,
  sourceType=creator_performance, sensitivity=confidential.
- [x] Update `classifyFilename` to recognise email and CRM exports:
  Mailchimp, Klaviyo, HubSpot, ActiveCampaign, Brevo exports. Classify as
  department=Marketing, sourceType=email_crm, sensitivity=internal.
- [x] Add structured extraction hints for ad performance files: key columns to extract —
  ROAS, impressions, CPM, CPC, CTR, conversions, spend, creative name, audience name,
  frequency, reach, campaign status. Flag if creative frequency exceeds 3.0 (fatigue signal).
- [x] Add AI bidding signal extraction: detect mentions of "learning phase", "limited",
  "budget constrained", "creative fatigue", "audience overlap" in campaign status columns.
  These are the AI bidding health signals the performance marketing agent surfaces.
- [x] Add cross-platform attribution note in extraction: when the same conversion period
  appears in multiple ad platform exports, flag potential double-counting. Surface this
  as an evidence quality warning in the agent brief.
- [x] Define performance marketing agent evidence scope to include: ad_performance, social_export
- [x] Define brand/community agent evidence scope to include: social_export, creator_performance
- [x] Define local business (sme_physical) agent evidence scope to include: local_business,
  whatsapp_business, social_export

### Dual-hat roles and single-person coverage
- [x] Define dual-hat role detection: if a company has stage=early_stage or
  employeeBand=1_10 or 11_50, apply dual-hat suppression rules — do not show separate CFO
  dashboard if CEO is likely covering finance, do not show separate CTO if the co-founder is
  likely covering technology. Instead, merge those signals into the CEO brief.
- [x] Add dual-hat question to the wizard Roles step for small companies: "Is there a dedicated
  person in this role, or is this covered by someone in another position?" Shown as a toggle
  on each pre-selected role. If "covered by another" is selected, the role is marked as
  `dual_hat=true` and its agents are folded into the primary role's dashboard rather than
  creating a separate view.
- [x] Store dual-hat state per role in workspace profile. When a dedicated hire is made,
  the role can be promoted from dual_hat to active with one click in Settings.
- [x] Dual-hat roles appear differently in the Add Role surface: shown as "Currently covered
  by [role]" with an "Activate when you hire" option rather than as a standard available role.
  **V1 note:** stored and surfaced in Settings; full one-click activation panel moved to Phase 8.

### Fallback question design for ambiguous companies
- [x] If `requiresRoleConfirmation: true` or if company description produces sector confidence
  below 0.5, show a structured two-part fallback before role selection:
  Part 1 — "How does your company primarily make money?" with options:
    (a) We sell a product (physical or digital) directly to customers
    (b) We provide services to businesses on a project or retainer basis
    (c) We provide services to individual consumers
    (d) We run a platform or marketplace connecting buyers and sellers
    (e) We are a regulated financial services company (bank, fintech, insurance)
    (f) We are a physical business with a location (shop, restaurant, clinic, office)
    (g) Something else — let me describe it
  Part 2 — "Who makes the most important decisions in your company, and what do they
  worry about most?" (open text, 1-3 sentences). This answer is fed back into the LLM
  as additional context for role suggestion, not just sector detection.
- [x] Map Part 1 answers to archetype overrides:
  (a) → likely digital_native or sme_physical depending on scale
  (b) → professional_practice or corporate
  (c) → sme_physical or startup_scaleup
  (d) → digital_native or startup_scaleup
  (e) → corporate (financial services)
  (f) → sme_physical
- [x] After fallback answers, re-run role suggestion engine with updated archetype signal.
  Do not re-run full LLM detection — use deterministic relevance scoring with the new archetype.
- [x] If Part 2 open text mentions "cash" or "payroll" → raise CFO relevance.
  Mentions "customers" or "complaints" → raise CBO or vp_customer_success.
  Mentions "compliance" or "regulator" → raise CRO and CCO.
  Mentions "my team" or "staff" or "people" → raise CHRO.
  Mentions "technology" or "platform" or "app" → raise CTO.

### Company archetype evolution
- [x] Store `archetypeVersion` on workspace profile with a timestamp. When the profile is
  updated manually or AI re-detects a different archetype from new evidence, record the change.
- [x] Add archetype drift detection: if uploaded evidence consistently uses language inconsistent
  with the stored archetype (e.g., board pack and regulatory filing language for a workspace
  stored as startup_scaleup), surface a suggestion in Settings: "Your documents suggest your
  company has evolved. Would you like to update your company archetype?"
  **Deferred:** automated drift detection moved to Phase 12 company memory; Phase 7 stores the
  profile fields and manual confirmation timestamp.
- [x] When archetype changes, show a confirmation step: "Updating your archetype will change
  role labels, agent brief language, and evidence type defaults. Your existing evidence and
  history are preserved." Require explicit confirmation before applying.
  **V1 note:** manual Settings confirmation updates archetype version and language mode.
- [x] Role labels update automatically when archetype is confirmed changed.
  Staged roles are re-evaluated against the new archetype's thresholds.

### Multi-location and street company intelligence
- [x] For sme_physical archetype, add `locationCount` to workspace profile. Default 1.
  If >1 location, enable per-location vs aggregate view in relevant agent briefs.
- [x] Multi-location owner (non-franchise) is distinct from franchise_manager. The owner
  runs all locations directly. Per-location daily sales, staff issues, and stock levels are
  the operating signal. Aggregate vs per-location comparison is the key intelligence need.
- [x] Street company evidence ingestion should recognise location tags in filenames:
  "branch-1-weekly-sales.xlsx", "dubai-mall-report.pdf", "location-2-rota.xlsx". Use these
  to tag evidence with a location label for per-location filtering.
- [x] Add local advertising signal types: Google Local Service Ads reports, Meta local radius
  campaign exports, WhatsApp Business broadcast analytics, SMS campaign reports (for markets
  where SMS is primary). Classify as sourceType=local_ad_performance, department=Marketing.

### Sector library gaps for companies that do not fit the 8 sectors
- [x] Document the current 8-sector gap list: Hospitality and Tourism, Logistics and Transport,
  Media and Publishing, Energy and Utilities, Government and Public Sector, NGO and Non-profit,
  Agriculture, Sports and Entertainment.
- [x] When sector detection returns unknown or confidence is below 0.4, archetype becomes the
  primary driver for role suggestion. The free-text description keyword signals become the
  secondary driver. The sector label shows as "Custom" in the profile.
- [x] The "Describe your company" fallback (Step 2 in wizard) is the primary path for these
  companies. The plain-language fallback questions in the role step provide the archetype signal
  needed for role suggestion even when sector is unclassified.
- [x] Add a "suggest new sector" path: if multiple workspaces use the same custom description
  cluster, flag it for taxonomy expansion in the next release cycle.
  **Deferred:** automated clustering is a product-ops workflow; Phase 7 documents the trigger in
  `docs/SECTOR_GAPS.md`.

### Staged role activation mechanics
- [x] When a staged role is activated early (company grew faster than anticipated), mark it
  active in workspace profile and clear the staged condition for that role only. Other staged
  roles retain their conditions independently.
- [x] When any role is activated (staged → active or available → active), immediately trigger
  a first agent brief run for that role using existing processed evidence. Do not wait for
  new evidence to be uploaded.
  **V1 note:** dashboard render now runs the role's agent briefs on demand from existing evidence.
- [x] Show an activation confirmation: "Activating the CFO dashboard — NexusAI will run the
  first Finance brief using your existing evidence. This takes a few seconds."
  **Deferred:** explicit activation confirmation moved to Phase 8 Add Role panel.
- [x] If no processed evidence exists at activation time, show an empty state with the
  document types most useful for this role (derived from role's evidence scope).
  **V1 note:** empty dashboard and upload guidance paths exist; role-specific activation empty state moves to Phase 8.

### Dashboard "Add Role" surface
- [x] Add role state to workspace profile: each role key has state active/staged/available
- [x] Dashboard nav or header shows count of staged and available roles not yet activated
  **Deferred:** counts moved to Phase 8 Add Role UX; role state is stored and visible in Settings.
- [x] "Add Role" panel shows: (1) Staged roles with activation condition, (2) Available roles
  relevant to this workspace's archetype and sector, (3) Custom role creation
  **Deferred:** full Add Role panel moved to Phase 8; onboarding role selection covers V1 setup.
- [x] One-click role activation: marks role as active in workspace profile and populates
  dashboard with first agent brief run
  **Deferred:** one-click post-onboarding activation moved to Phase 8.
- [x] Staged roles can be activated early if the company grows faster than anticipated

### Codebase file map for new Phase 7A code
- [x] Create `lib/domain/role-registry.ts` — defines `ROLE_REGISTRY` as a Record keyed by
  role key string. Each entry: `{ key, label, archetypeLabels, archetypeRelevance, sectorRelevance,
  stageThreshold, sizeThreshold, regulatoryTrigger, businessModelSignal, staged, stagedCondition,
  evidenceScope, agentIds }`. This is the single source of truth for all role definitions.
- [x] Create `lib/services/role-suggestion.ts` — defines and exports `suggestRolesForProfile(profile)`.
  Pure deterministic function, no LLM calls, no DB calls. Takes `DetectedProfile`, returns
  `Array<{ roleKey, label, relevanceScore, reason, state, dualHatCandidate }>`. CEO always first.
  All scoring logic lives here. Keeps company-detection.ts focused on LLM inference only.
- [x] Update `lib/services/company-detection.ts` — import `suggestRolesForProfile` from
  `lib/services/role-suggestion.ts`. After LLM profile detection, run `suggestRolesForProfile`
  to populate `priorityRoles`, `suggestedRoleReasons`, and `stagedRoles`. LLM no longer generates
  the role list directly — it infers the profile fields that feed the deterministic engine.
- [x] Update `lib/domain/sector-library.ts` — remove `defaultRoles` from sector definitions.
  Role suggestions now come from `role-registry.ts` + `role-suggestion.ts`, not from the sector
  library. Sector library keeps `commonKPIs`, `commonRisks`, `documentTypes`, etc.
  **V1 note:** `defaultRoles` remains as a legacy fallback for manual sector-only flows; active role
  suggestions come from `role-registry.ts` + `role-suggestion.ts`.
- [x] Update `lib/domain/sector-library.ts` `buildCompanyContext()` — add `companyArchetype`
  and `briefLanguageMode` to the context string injected into every LLM call. Format:
  `Archetype: {label}` and `Brief language: {formal|plain}` added after sector line.
- [x] Update `lib/agents/agent-library.ts` — add `ROLE_AGENT_BRIEFS` entries for all new roles.
  Update `AgentRoom` entries for finance_room, people_room, and risk_room to have proper
  standalone paths (`/dashboard/cfo`, `/dashboard/cro`, `/dashboard/cco`) not query params.

### DB schema and migration for Phase 7A fields

> Implemented as migration `0011_role_archetype.sql` because `0009` and `0010` were already used
> for evidence department and connector provenance.

- [x] Create `db/migrations/0011_role_archetype.sql` — adds the following columns to
  `workspace_profiles` table:
  ```
  company_archetype TEXT,
  archetype_version TEXT,
  brief_language_mode TEXT DEFAULT 'formal',
  location_count INTEGER DEFAULT 1,
  role_states JSONB DEFAULT '{}'
  ```
  `role_states` shape: `{ [roleKey]: { state: 'active'|'staged'|'available'|'dual_hat',
  activatedAt: string|null, stagedCondition: string|null, dualHatOf: string|null } }`
- [x] Update `db/schema.ts` — add the five new columns to `workspaceProfiles` table definition.
- [x] Update `lib/contracts.ts` `WorkspaceProfile` type — add `companyArchetype`,
  `archetypeVersion`, `briefLanguageMode`, `locationCount`, `roleStates` fields.
- [x] Update `lib/data/repository.ts` — update `toWorkspaceProfile()` mapper and
  `saveWorkspaceProfile()` upsert to handle the new columns. `roleStates` stored as JSONB,
  deserialised to `Record<string, RoleState>` on read.
- [x] Update `lib/data/store.ts` — add the five new fields to in-memory `WorkspaceProfile`
  store with sensible defaults. In-memory fallback must mirror DB schema exactly.

### Settings page updates for Phase 7A
- [x] Update Company Profile tab in `app/settings/page.tsx` — add `companyArchetype` as a
  selectable field with the five archetype options and their plain-language descriptions.
  Show current `archetypeVersion` timestamp as "Profile last updated" note.
- [x] Add role state management section to Settings > Company Profile tab: shows all active
  roles with their state (active/staged/dual-hat), a toggle to promote dual-hat to active,
  and a link to the Add Role panel for available and staged roles.
- [x] Add archetype drift warning banner to Settings > Company Profile tab: if
  archetype drift is detected from evidence, show a yellow callout: "Your uploaded documents
  suggest your company may have evolved. Review your archetype." with a one-click update option.
  **Deferred:** automated drift banner moves to Phase 12 once company memory can detect drift reliably.

### Tests for Phase 7A logic
- [x] Write unit tests for `suggestRolesForProfile()` in
  `tests/role-suggestion.test.ts`. Cover at minimum:
  - Fintech company (financial_services, corporate) → CEO locked, CFO high, CRO high, CCO high
  - Early-stage SaaS (technology_saas, startup_scaleup, 1_10) → CEO locked, dual-hat CFO, CTO high
  - Street restaurant (sme_physical, 11_50) → Owner locked, Ops Manager, Accounts — no CRO, no CPO
  - Digital D2C brand (digital_native, retail_commerce) → CEO, Growth Officer, VP Perf Marketing, Brand
  - Consulting firm (professional_services, professional_practice) → Managing Partner locked, CFO, CBO
  - Low confidence profile → requiresRoleConfirmation: true
  - Unknown sector → archetype drives all suggestions, sector signal absent
- [x] Write unit tests for archetype label overrides:
  sme_physical CEO label = "Owner", CFO label = "Accounts", COO label = "Ops Manager"
- [x] Write unit tests for dual-hat suppression:
  Stage early_stage + employeeBand 1_10 → CFO and COO marked dualHatCandidate=true

### Documentation and AI responsibility notes
- [x] Update `AGENTS.md` with new role trust levels and archetype-specific approval policies
- [x] Note: performance marketing agents read ad data and surface decay signals — humans decide
  budget reallocation. Agent never recommends spend changes autonomously.
- [x] Note: street company agents use simpler evidence and shorter brief language — no board
  pack language, no IRR calculations.
- [x] Note: social/community agents read engagement data — brand risk signals route to approval
  queue before any external communication is drafted.
- [x] Note: WhatsApp Business data contains customer contact information — classified as
  confidential by default, never included in shared summaries or external brief exports.

---

## Phase 7B — Agent Rooms Visual Reframe ✓ COMPLETE (v0.10.3)

> Shipped in v0.10.3. Agent Room navigation, room labels, agent-level filtering (?agent=...),
> SME brief-language adaptation, and settings controls are all built.

- [x] Define the Agent Room model: Executive Command Room, Operating Room, Growth Room, Technology and Data Room, Finance Room, People Room, and Risk Room
- [x] Add `agent-library.ts` with named specialist agents, room mapping, mandate, evidence scope, output type, approval policy, and skill hints
- [x] Wire agent briefs into dashboard service — cards are generated by named agents not generic templates
- [x] Rename dashboard cards to "Agent Briefs" in the UI — cards display agent name and mandate
- [x] Map existing dashboard cards to agents: Strategy Agent, Risk Agent, Decision Agent, Execution Agent, Process Agent, Growth Agent, Technology Health Agent, Data Quality Agent, Security Agent, AI Governance Agent
- [x] Add agent brief metadata: agent name, mandate, confidence, freshness, evidence refs, last run time, suggested next action
- [x] Add lightweight agent output schema without introducing autonomous task execution
- [x] Add AI responsibility notes: specialist agents monitor, classify, synthesize, and draft; humans approve high-impact recommendations and external actions
- [x] Define future Hermes/OpenClaw adapter design and licensing review requirement
- [x] Add agent soul fields to spec: voice, working style, priorities, escalation threshold, memory scope
- [x] **Rename dashboard page headers and nav labels to room names** — the side nav currently shows
  "CEO", "COO", "CBO", "CTO". After Phase 7A role expansion these should show room names where
  applicable: "Executive Command Room", "Operating Room", "Growth Room", "Finance Room" etc.
  Labels adapt to archetype: `sme_physical` shows "Owner Brief", "Ops Brief" not room names.
- [x] **Add room-level description copy** on each dashboard page: "NexusAI staffs this room with
  evidence-backed specialist agents. Each agent reads your approved evidence only."
- [x] **Add room filter/navigation** — ability to view a specific agent's brief in isolation
  rather than the full room view. Useful when a role has 3-4 agents and the user wants to
  focus on one (e.g., view only the Risk Agent brief from the CEO room).

---

## Phase 7C — Production Operations ✓ CODE COMPLETE (v0.11.0) — external services pending

> Code layer complete. Sentry is now wired in code (Task #32, hardened Task #37) but ships
> disabled until `SENTRY_DSN` is set in Render. Stripe is fully wired (v0.20.0-v0.21.0).
> Uptime monitoring and the SECURITY_REVIEW.md sign-off must be completed before the first
> pilot signs.

### Billing and subscription infrastructure
- [x] Workspace status field: `trial | pilot | active | suspended | cancelled` — schema + migration 0012 done.
- [x] Trial banner: persistent in-app banner showing days remaining (v0.11.0)
- [x] Suspension banner: shown when workspace is suspended with support contact link (v0.11.0)
- [x] Integrate Stripe for workspace subscriptions. Current implementation uses Free / Pro /
  Business / Enterprise with pure-fetch Stripe Checkout, Portal, webhooks, and Stripe IDs on workspaces.
- [x] Add usage limits enforcement per tier: max evidence records, max monthly LLM calls,
  max connector count, max workspace members. Hard limits at tier ceiling with a clear
  in-app message when approaching or hitting the limit.
- [x] Add billing portal in Settings: current plan, next billing date, usage vs. limit gauges,
  upgrade/downgrade path, invoice history download. Powered by Stripe Billing Portal.
- [ ] Add workspace suspension flow: when payment fails, send warning email at 3 days,
  restrict dashboard access (read-only) at 7 days, full suspension at 14 days.
  Evidence and settings are preserved for 90 days before deletion.
- [ ] Add internal revenue dashboard (admin only): MRR, ARR, active pilots, churn, usage
  per workspace. Not a client-facing feature — internal business intelligence.

### Operational monitoring and observability
- [x] Integrate Sentry for error tracking. Capture all unhandled exceptions in API routes,
  ingestion pipeline, LLM calls, and connector syncs. Tag errors by workspaceId, route,
  and error type. CLOSED 2026-06-25 (Task #32, hardened Task #37). Alert-on-spike rules
  still need to be configured in the Sentry dashboard once a project exists -- that is a
  dashboard-config step, not code.
- [x] Add LLM cost monitoring: `llm_usage` table in schema + migration 0012. `repository.recordLLMUsage()`
  writes token cost records (micro-USD) after every LLM call. `estimateCostMicro()` per model family. (v0.11.0)
- [ ] Add ingestion pipeline monitoring: track extraction success rate, average confidence
  score, quarantine rate, and processing time per workspace per day. Alert when quarantine
  rate exceeds 40% (indicates a document format problem).
- [ ] Add uptime monitoring via Checkly or UptimeRobot: monitor `/api/health`, the dashboard
  route, and the ingestion route. PagerDuty-style alert if any endpoint is down for >2 minutes.
- [ ] Add database query performance monitoring: log slow queries (>500ms) to the audit log.
  Alert when p99 query time exceeds 1 second for evidence retrieval routes.
- [ ] Add a real-time status page (public): shows current system status for ingestion,
  dashboards, Ask, and connectors. Hosted at `status.nexus.ai` or similar.

### Security hardening
- [x] Add security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
  Permissions-Policy, HSTS. Full suite now in middleware.ts. (v0.11.0)
- [x] Add rate limiting: auth 10/min, ingestion 20/min, ask 30/min, dashboard 60/min — per IP,
  in-process sliding window. Returns 429 with Retry-After. (v0.11.0)
- [x] Add CORS policy: production domain only, never wildcard. Preflight handled. (v0.11.0)
- [ ] Verify headers with securityheaders.com after next production deploy. Target A rating.
- [ ] Add automated dependency vulnerability scanning: `npm audit --audit-level=high` in CI.
- [ ] Conduct first-party security review using `docs/SECURITY_REVIEW.md` checklist.
  Complete the sign-off table before first paid pilot contract is signed.
- [ ] Ensure `security@nexusai.io` is actively monitored before first pilot.

### Backup and disaster recovery
- [ ] Configure automated daily Postgres backups via Neon. Retention: 30 days.
  Test restore from backup at least once before first paid pilot.
- [x] Define RTO/RPO: RTO = 4 hours, RPO = 24 hours. Documented in `docs/DR_RUNBOOK.md`. (v0.11.0)
- [ ] Configure R2 bucket versioning for 30-day object recovery.
- [x] Document migration rollback SQL for key migrations — included in `docs/DR_RUNBOOK.md`. (v0.11.0)
- [x] Full disaster recovery runbook: `docs/DR_RUNBOOK.md` — DB loss, R2, Clerk, LLM, full outage. (v0.11.0)

### Customer support infrastructure
- [ ] Set up `support@nexusai.io` or helpdesk (Intercom/Freshdesk) before first pilot.
- [ ] Create knowledge base / FAQ: minimum 10 articles before pilot launch.
- [x] In-app feedback button: floating button on all dashboard pages, modal, routes to audit log. (v0.11.0)
- [ ] Define and document SLA for pilot clients: 4-hour response, 1-hour for critical issues.

---

## Phase 7D — Governance Hardening / ExO Upgrade Tier 1 (v0.14.0, before first pilot)

> Drawn from V1_1_UPGRADE_PLAN.md (ExO 3.0 / Salim Ismail EP #258 analysis).
> Four items. All must ship before the first regulated-sector demo or pilot contract.
> See companion doc: docs/V1_1_UPGRADE_PLAN.md
> Supporting docs: docs/AI_NATIVE_READINESS_ASSESSMENT.md,
> docs/U2_AGENT_PASSPORT_SPEC.md, and docs/GOVERN_ASSURE_MESSAGING.md.

### U1 — AI-Native Readiness Assessment (Phase 9D extension)
- [x] Draft operating document: `docs/AI_NATIVE_READINESS_ASSESSMENT.md`.
- [x] Build public `/readiness` page — no login required, seven-dimension scoring.
  Dimensions: organizational drag, AI as a first-class function, data readiness,
  workflow standardization, governance maturity, regulatory exposure, decision-cycle speed.
  Each scored 1–7. Output: dimension scores, banded overall result (Emerging / Developing /
  Advanced / AI-Native), and a specific recommended next step (fix drag first / book a pilot call /
  ready for full deployment).
- [x] Score bands route to different CTAs: low scores get "here is what to fix first" with a
  resource link; mid scores get "book a 30-minute scoping call"; high scores get a direct
  pilot proposal link. This protects delivery by qualifying out misfit clients automatically.
- [x] Submission writes a lead record to the audit log: timestamp, dimension scores, overall band,
  and the CTA triggered. Used for outbound BD follow-up.
- [x] Assessment must complete in under 5 minutes. No account required.
  Must not present its score as a regulatory or financial opinion — include a one-line disclaimer.
- [x] Draft the seven dimension questions written for regulated and GCC consulting buyers,
  not copied from the Salim ExO scorecard. Questions should feel like a senior advisor is asking,
  not a SaaS marketing form.

### U2 — Agent Control Profile (Passport)

> Build from `/Users/alijanjua/Downloads/NexusAI_U2_Agent_Passport_Spec.md`.
> Principle: every control is enforced server-side. Prompt-only limits do not count as controls.
> Versioned repo spec: `docs/U2_AGENT_PASSPORT_SPEC.md`.

#### U2.1 Passport schema and contracts
- [x] Define `AgentControlProfile` as a first-class contract with identity fields:
  `id`, `workspaceId`, `agentKey`, `name`, `purpose`, `version`, and `status`
  (`draft | active | suspended`).
- [x] Add data-control fields: `allowedScopes`, `forbiddenScopes`, `maxSensitivity`
  (`public | internal | confidential | restricted`), and `crossEntityAccess` (default false).
  Explicit deny always overrides allow.
- [x] Add tool-control fields: `allowedTools`, `forbiddenTools`, and `policyControlledApis`
  for named APIs with per-call constraints.
- [x] Add action-control fields: `actionRight`, `hardStops`, `escalationTriggers`,
  `approvalLevel`, `riskRating`, `reviewCadence`, `watcherAgents`, and `logLevel`.
- [x] Define the V1 action-right ladder exactly as:
  `retrieve → summarize → draft → recommend → prepare_for_approval`.
  Autonomous send/commit/submit is not available in V1.
- [x] Define default hard stops: `send_email`, `submit_filing`, `make_payment`,
  `modify_contract`, `contact_regulator`, external posting, source-system writeback,
  HR action, and legal/financial commitment.
- [x] Define default escalation triggers: legal interpretation, regulatory commitment,
  statement of compliance, pricing/fee commitment, data residency statement,
  data protection statement, cross-entity data access, external communication,
  and financial figure above configured threshold.
- [x] Add Zod schema and TypeScript type exports for passport enums and
  `AgentControlProfile` in `lib/contracts.ts`.

#### U2.2 Database and versioning
- [x] Add migration `0014_agent_control_profiles.sql` with `agent_control_profiles` table.
  Store every profile version as a new row; never overwrite prior versions.
- [x] DB fields must include: workspace_id, agent_key, name, purpose, version, status,
  allowed_scopes, forbidden_scopes, max_sensitivity, cross_entity_access, allowed_tools,
  forbidden_tools, policy_controlled_apis, action_right, hard_stops, escalation_triggers,
  approval_level, risk_rating, review_cadence, watcher_agents, log_level, created_by,
  created_at, updated_by, updated_at.
- [x] Add unique constraint `(workspace_id, agent_key, version)` and index
  `(workspace_id, agent_key, status)`.
- [x] Add repository methods: list active profiles, get active profile by agent key,
  get profile history, create new version, suspend agent, and audit profile update.
- [x] Add in-memory store fallback mirroring the DB behaviour so local/dev mode still works.

#### U2.3 Default passport seeding
- [x] Seed default passports for all current specialist agents from `agent-library.ts`.
  Defaults should be least-privilege: `maxSensitivity=internal`, no cross-entity access,
  read/draft/recommend only as required by the agent mandate.
- [x] Seed three demonstration passports from the spec: Regulatory Response Agent,
  Legal Redline Agent, and Proposal Partner Agent. Use these for regulated-buyer demos.
- [x] Ensure regulated/high-risk agents default to `riskRating=regulated` or `high`,
  `reviewCadence=per_output`, and approval level `partner` or `client` where appropriate.
- [x] Suspended agents cannot retrieve evidence, call tools, produce outputs, or appear as active
  runnable agents. They may still appear in history/audit views.
  - 2026-06-01 note: Ask and dashboard generation refuse suspended agents; Settings shows
    suspend/resume controls; tool guard denies inactive profiles.

#### U2.4 Evidence retrieval enforcement
- [x] Implement `canReadEvidence(object, passport)` as a default-deny server-side function:
  deny if object scope is forbidden, scope not allowed, sensitivity exceeds `maxSensitivity`,
  cross-entity read is attempted without `crossEntityAccess`, or sensitivity is missing.
- [x] Treat unlabeled evidence as `restricted` and deny unless the passport explicitly allows
  restricted access.
- [x] Apply passport filters before vector search and before keyword search, not after search.
  Forbidden content must never enter model context or ranking results.
- [x] Partition/filter retrieval by workspace/entity/scope before calling vector similarity.
  This is required to prevent vector store leakage.
- [x] Log every deny as an audit event with workspaceId, agentKey, objectId, sensitivity,
  scope, and deny reason.
- [x] Update dashboard and Ask retrieval paths so agent-generated briefs use passport-filtered
  evidence only.
  - 2026-06-01 note: dashboard and Ask both filter by active Agent Control Profile before
    evidence enters prompt context; Ask vector search receives the passport-allowed candidate
    ID set before pgvector ranking.

#### U2.5 Tool invocation enforcement
- [x] Implement `canUseTool(tool, passport, action)` as a default-deny server-side function:
  deny if tool is forbidden, tool is not explicitly allowed, requested action exceeds
  `actionRight`, tool maps to a hard stop, or policy-controlled API constraints fail.
- [x] Add audit events for denied tool calls: agentKey, tool, requested action, deny reason,
  and actor.
- [x] Ensure tool enforcement is independent of model prompt text. Prompt injection inside an
  evidence document cannot expand tool rights.

#### U2.6 Output gate and escalation
- [x] Implement output gate before any agent output leaves the server. Detect triggers using
  deterministic rules first. Classifier fallback is deferred until U3/U4 adds persistent output
  records and evaluation traces.
- [x] Route outputs to human review when they contain legal opinions, regulatory commitments,
  pricing/fee commitments, data residency/data protection statements, external communication,
  cross-entity data, or financial figures above threshold.
- [x] Block and log outputs that request or imply hard-stop actions such as sending an email,
  submitting a filing, making a payment, modifying a contract, contacting a regulator, or
  posting externally.
- [x] Add watcher/suspend pathway: watcher agents monitor the log stream; anomaly sets offending
  agent to `suspended`, notifies a human, and holds output for U3 rollback.
  - 2026-06-01 note: V1.1 path is deterministic hard-stop output block -> audit event ->
    persisted profile suspension. Rich watcher agents and notification routing move into U3.

#### U2.7 Settings UI — Agent Governance
- [x] Add Settings → Agent Governance tab showing every active agent passport: name, purpose,
  status, version, risk rating, max sensitivity, action right, approval level, review cadence,
  allowed/forbidden scopes, allowed/forbidden tools, watcher agents, and last updated.
- [x] Add read-only reviewer view suitable for bank/security due diligence. One screen should
  answer: what is this agent, what can it see, what can it do, and when does it escalate?
- [x] Add admin edit flow that creates a new profile version, preserves old versions, and writes
  an audit event with actor, agentKey, old version, new version, and changed fields.
- [x] Add suspend/resume control for admins. Resume creates a new version and audit event.

#### U2.8 Acceptance tests
- [x] Surfin agent asked to retrieve a Tawha document: denied, no content returned, attempt logged.
  - Covered by equivalent forbidden-scope Ask retrieval test: disallowed evidence is denied,
    uncited, and audited before ranking/model context.
- [x] Agent asked to read an object above its sensitivity ceiling: denied and logged.
- [x] Output containing regulatory interpretation: routed to partner review regardless of
  action right.
- [x] Agent attempts hard-stop action such as send email: blocked and logged.
- [x] Unlabeled evidence object requested: treated as restricted and denied.
- [x] Passport edited: new version row created, prior version retained, actor and timestamp
  recorded.
- [x] Suspended agent attempts any action: refused and logged.
- [x] Agent with `forbiddenScopes` or finance-deny policy cannot retrieve or cite Finance
  evidence. Verified in tests.

#### U2.9 Failure points to explicitly test
- [x] Incomplete sensitivity labels do not weaken controls: missing labels default to restricted.
- [x] Vector search cannot leak forbidden content: filters run before vector/text search.
- [x] Trigger routing does not rely only on an LLM classifier: deterministic rules cover the
  highest-risk triggers.
- [x] Prompt injection cannot alter passport limits because enforcement lives outside the prompt.

### U3 — Searchable Per-Agent Log and Granular Rollback
- [x] Add client-facing Govern and Assure messaging document: `docs/GOVERN_ASSURE_MESSAGING.md`.
- [x] Extend audit_events to capture per-agent action detail: agentId, agentVersion, inputSummary
  (first 200 chars of the prompt), evidenceIdsUsed (array), outputId, outputVersion, confidence,
  and processingMs. Existing audit events remain unchanged — this adds fields to agent-generated events.
- [x] Add `agent_outputs` table: outputId, workspaceId, agentId, agentVersion, roleKey,
  content (the full brief text), evidenceRefs, confidence, createdAt, isActive (boolean),
  replacedById (nullable FK). Every dashboard card generation writes a row.
- [x] Rollback mechanism: when a user or admin triggers a rollback, the previous `agent_outputs`
  row is restored (isActive = true), the current row is deactivated (isActive = false, replacedById
  set), and an audit event is written with: actor, agentId, rolledBackFrom (outputId),
  rolledBackTo (outputId), and reason. Prior versions are never deleted.
- [x] Searchable log UI in Settings > Agent Governance: filter by agent, date range, action type.
  Shows: timestamp, agent name, action, input summary, output confidence, and a "Roll back" button
  for agent-generated outputs that are still active.
- [x] Acceptance test: reviewer can search all actions by a single agent over a 7-day range,
  select a specific output, roll it back to the previous version, and verify both the prior version
  and the rollback event appear in the audit log. History is never deleted.

### U4 — Learning-Signal Capture ✓ COMPLETE (v0.15.0)

> Note: implemented as a standalone `learning_signals` table with per-output signals
> (approve/edit/reject/thumbs_up/thumbs_down) rather than the originally planned
> decision_reason/decision_edit fields on recommendation approval. The actual implementation
> is more flexible and covers all agent outputs, not just recommendations.

- [x] `learning_signals` table (migration 0016) with FK cascade on agent_outputs.
- [x] Signal types: approve, edit, reject, thumbs_up, thumbs_down per agent output.
- [x] `POST /api/learning-signals`, `GET /api/learning-signals`, `GET /api/learning-signals/summary`.
- [x] Agent Output Log UI shows signal buttons per output card.
- [x] Every signal write fires an `agent_learning_signal` audit event.
- [x] Workspace-scoped, never used to profile individual staff members.
- [x] 12 tests in `tests/learning-signals.test.ts`.

---

## Phase 8 — Paid Pilot Packaging ✓ COMPLETE (v0.12.0)

> A client who sees a great demo can receive a polished brief within 24 hours.
> Pricing anchor: $3,000–$8,000/month per workspace, 90-day pilot commitment.

### Pilot delivery artifacts
- [x] **Weekly executive brief export** — `GET /api/export/weekly-brief`. AI-generated per-role narratives, risk table, recommendation summary. Print page at `/export/weekly-brief`. (v0.12.0)
- [x] **Risk radar export (CSV)** — `GET /api/export/risk-radar?format=csv`. Severity-ranked signals, named file download. (v0.12.0)
- [x] **Recommendation register export (CSV)** — `GET /api/export/reco-register?format=csv`. All recommendations with status, confidence, evidence refs. (v0.12.0)
- [x] **Executive one-pager** — `GET /api/export/one-pager`. Print page at `/export/one-pager`. Single page: metrics, roles, findings, risks, open recommendations. (v0.12.0)
- [x] **Export Hub** — `/export` page linking all four artifacts with format badges. Export section in side nav. (v0.12.0)

### Demo and sales tools
- [x] **Demo workspace reset** — `POST /api/workspace/demo-reset?sector=<sector>`. Requires demo mode ON. Clears data, seeds sector pack, fires recommendation generation. (v0.12.0)
- [x] **Sector demo packs** — `lib/demo/sector-packs.ts`. Three packs, 5 documents each: Financial Services (Gulf Capital Partners), Professional Services (Meridian Advisory Group), Technology SaaS (Vanta Systems). (v0.12.0)
- [x] **Demo mode flag** — `demo_mode` boolean in workspace_settings + migration 0013. DEMO badge in top bar. Ingestion blocked with 403. Settings → Demo Tools tab. (v0.12.0)

### Sponsor and pilot management
- [x] **Sponsor-facing onboarding checklist** — `/pilot-kit` print page. 5-step business readiness guide (before login through end of month). Print → PDF and share at kickoff. (v0.12.0)
- [x] **Pilot success scorecard** — second section of `/pilot-kit`. 7-outcome table with Day 30/60/90 columns and sign-off blocks. (v0.12.0)
- [x] **Pilot billing triggers** — `docs/PILOT_BILLING_TRIGGERS.md`. Trigger conditions, status definitions, manual override SQL, pricing tiers, Stripe automation spec. (v0.12.0)

### AI responsibility notes for pilot artifacts
- [x] AI generates weekly brief narrative from approved evidence only. Human reviews before sharing. Never auto-send. (v0.12.0)
- [x] Risk radar and recommendation register are direct data extractions — no additional LLM call. Audit-safe exports. (v0.12.0)

---

## Phase 8A — Universal Workflow Twin Foundation (v0.15.0)

> Reassessment decision: do not make the first workflow twin Proposal/SOW, Regulatory Response,
> or Agreement Review. Those are valuable later templates, but they risk making Nexus look
> industry-specific too early. The first universal workflow twin is the Decision & Action Twin.

### Decision & Action Twin
- [x] Add `actions` as a first-class product object. Fields: workspaceId, decisionId (FK),
  actionText, owner, dueDate, isBlocker, status (open/done/deferred/cancelled), completedAt,
  timestamps. Migration 0017.
- [x] Extended `decisions` table with sourceOutputId (FK to agent_outputs), deadline, priority
  (low/medium/high/critical), createdAt, updatedAt.
- [x] Build `GET/POST /api/decisions`, `PATCH /api/decisions/[id]`,
  `GET/POST /api/actions`, `PATCH /api/actions/[id]`.
- [x] Build `/decisions` page with full interactive Decision & Action Twin UI: priority badges,
  status tabs, summary strip, Mark Decided, inline action list, blocker badges, overdue
  highlighting, Add Action inline form, New Decision form. All mutations via API.
- [x] Every decision and action mutation writes an audit event (decision_created,
  decision_updated, action_created, action_updated).
- [x] Add AI proposal extraction from agent outputs — `/api/decisions/extract` and `/decisions`
  review panel propose decisions/actions with sourceOutputId and evidence refs. Human click required
  before canonical creation. (v0.16.1)
- [ ] Add direct "Create Decision from this brief" button on dashboard card to prefill a single
  proposal from one outputId.
- [x] Add workflow twin primitives: `workflow_twins` and `workflow_twin_runs` tables for
  structured AI-assisted decision extraction from meeting notes and uploaded docs. (v0.19.1)
- [x] Add `GET/POST /api/workflow-twins`, `GET/POST /api/workflow-twins/:id/run`, and
  `GET /api/action-items` alias for workflow surfaces. (v0.19.1)
- [x] Add deterministic first-pass run payloads for Decision & Action, Workflow Scorer, and
  Ops Review twin types. (v0.19.1)
- [ ] Enforce Agent Control Profiles before evidence enters workflow twin LLM prompts.
- [x] Acceptance rule: no proposed decision/action becomes canonical without explicit user click.
- [ ] Acceptance test: output works across financial services, professional services, and SaaS profiles.

### Later workflow templates, not the universal first twin
- [ ] Add Proposal/SOW Twin template after Decision & Action Twin is working.
- [ ] Add Regulatory Response Twin template after output gates and escalation routing are working.
- [ ] Add Agreement Review Twin template after legal-risk triggers and review routing are working.

---

## Phase 8A+ — Executive Synthesis Layer (SHIPPED v0.18.0)

> Specialist agents produce signals. Leadership receives synthesis. The dispatcher collects
> agent outputs per role, the synthesis service produces one evidence-backed brief answering
> the questions that matter to that seat. See docs/EXECUTIVE_SYNTHESIS_SPEC.md for full design.

### Session 1 — On-Demand Dispatcher + Synthesis Service + Tests

- [x] Create `lib/services/synthesis.ts`: combined dispatcher/synthesis engine that calls
  `cardsForRole()`, builds a specialist brief block, computes evidence refs/confidence, and
  answers role-specific leadership questions.
- [x] Add role question frameworks: CEO 7 questions; COO, CFO, CTO/CDO, CBO/CMO, and CHRO
  5 questions each; generic fallback for all other roles.
- [x] Use workspace company context and brief-language instructions in synthesis prompts.
- [x] Add `synthesis.executive` to the prompt registry.
- [x] Apply red-team checks per synthesis answer before returning to the user.
- [x] Create `GET /api/synthesis/[role]` with `read:dashboard` scope and optional department filter.
- [x] Add `/api/synthesis(.*)` to middleware agent/API route matching.
- [x] Create `tests/synthesis.test.ts` covering role question sets and synthesis contracts.
- [x] Type-check and build clean.
- [x] All tests pass: `npm run test` (21 files / 102 tests).

### Session 2 — Dashboard Reframe + UX

- [x] Render synthesis as the first dashboard panel for role dashboards.
- [x] Move existing agent cards into collapsible "Specialist Agent Detail" below synthesis.
- [x] Add confidence badge, evidence source count, answered/total indicator, and loading skeleton.
- [x] Preserve single-agent filter (`?agent=`) as a direct specialist card view.
- [x] Update HANDOVER.md, CHANGELOG.md, architecture docs, roadmap, and user flows.
- [x] Persist refreshed synthesis outputs into `agent_outputs`.
- [x] Add manual refresh endpoint/button for regenerated synthesis.
- [ ] Future: add staleness banner when source evidence or source agent outputs exceed threshold.
- [x] Add entity backlinks and source names inside synthesis answers.
- [ ] Future: add learning signal buttons directly on synthesis cards.

---

## Phase 8A++ — Scheduled Synthesis Refresh (target v0.19.0)

> Turns NexusAI from a pull product into a push product. The CEO gets a fresh leadership brief
> every Monday morning without logging in. See `docs/SCHEDULED_SYNTHESIS_SPEC.md` for full spec.

### Session 1 — Core Scheduled Synthesis

- [x] Migration `0021_synthesis_schedules.sql` and Drizzle schema for `synthesis_schedules` table.
- [x] Repository methods: `getSynthesisSchedule`, `upsertSynthesisSchedule`, `getDueSchedules`, `updateScheduleLastRun`.
- [x] Cron runner script: `scripts/run-scheduled-synthesis.mjs` (calls protected synthesis cron route).
- [x] Internal cron API route `POST /api/cron/synthesis` with shared-secret auth (`NEXUS_CRON_SECRET`).
- [x] Settings API routes: `GET/PUT /api/synthesis-schedule`, `POST /api/synthesis-schedule/test`.
- [x] Settings UI section: enable/disable toggle, schedule picker, role checkboxes, delivery channel config.
- [x] Add "Last refreshed" timestamp on synthesis brief panel from `agent_outputs.createdAt`.
- [x] Tests: schedule CRUD, cron window matching, runner dispatch logic.
- [x] Audit events: `synthesis_scheduled_run` and delivery/run status events.

### Session 2 — Email Delivery and Polish

- [ ] Install Resend, build React Email template for synthesis digest (`lib/email/synthesis-digest.tsx`).
- [ ] Email delivery dispatch in cron runner (subject, role brief, CTA to dashboard).
- [ ] Render cron job config in `render.yaml`.
- [ ] End-to-end test: scheduled synthesis with email delivery.
- [x] Update ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md for scheduled synthesis core.
- [x] Bump version to v0.19.0 for scheduled synthesis core.

---

## Billing Tiers and Usage Metering (target v0.20.0)

> Four-tier billing (Free / Pro / Business / Enterprise) with LLM token budget enforcement,
> feature gating, Stripe checkout, and usage UI. See `docs/BILLING_TIERS_SPEC.md` for full spec.

### Session 1 — Schema, Enforcement, and Settings UI

- [x] Migration `0022_billing_tiers.sql`: plan columns on workspaces, `plan_definitions` table with seed data.
- [x] Drizzle schema updates for plan fields and plan_definitions.
- [x] `checkTokenBudget(workspaceId)` with in-process cache (5-min TTL).
- [x] Extend `recordLLMUsage()` to atomically increment `workspaces.monthly_token_used`.
- [x] Feature gate function `canUseFeature()` for scheduled synthesis, exports, extraction, etc.
- [x] Enforce token budget at all LLM call points (Ask, dashboard, synthesis, extraction, ingestion).
- [x] Enforce resource limits: max roles, max evidence, max API keys, ask daily limit.
- [x] Plan and Usage section in Settings UI: plan display, usage percentage bar, resource limits, breakdown.
- [x] Warning banners at 80%/95%/100% of token budget.
- [x] Monthly token reset in cron runner.
- [x] Tests: budget check, feature gating, enforcement, reset logic.
- [x] Audit events: `plan_upgraded`, `plan_downgraded`, `token_budget_exceeded`.

### Session 2 — Stripe Integration and Checkout

- [x] Configure Products and Prices for Pro and Business using pure-fetch Stripe client (no Stripe SDK dependency).
- [x] Checkout session creation endpoint `POST /api/billing/checkout`.
- [x] Webhook handler `POST /api/billing/webhook` for subscription lifecycle events.
- [x] Upgrade flow in Settings: "Upgrade to Pro/Business" buttons with Stripe Checkout redirect.
- [x] Downgrade logic: adjust limits at next billing cycle, "resolve limits" banner.
- [x] Trial-to-Free conversion (day 15 drops to Free instead of suspension).
- [x] Invoice portal link in Settings.
- [x] End-to-end test: trial expiry, upgrade, downgrade, payment failure.

### Session 3 (optional) — Polish and Analytics

- [ ] Usage breakdown by feature type (Ask vs synthesis vs dashboard) in Settings.
- [ ] Internal admin revenue dashboard: MRR, active plans, usage per workspace.
- [ ] Upgrade CTA components across all gated features (lock icons, tooltips).
- [ ] Annual pricing option (2 months free).
- [x] Update ARCHITECTURE.md, ROADMAP.md, CHANGELOG.md for core billing and Stripe releases.
- [x] Bump version to v0.20.0/v0.21.0 for core billing and Stripe releases.

---

## Phase 8B — Workflow Twin Scorer and Client Selection (v0.15.0)

> Drawn from the V1.1 Upgrade Plan Tier 2. These strengthen pilot scoping, onboarding, proof,
> and quality measurement, but they do not block signing the first pilot. Build during or
> immediately after the first live pilot once there is a real workflow to measure.

### U5 — Workflow Twin Candidate Scorer
- [x] Draft facilitated worksheet and scoring model: `docs/WORKFLOW_TWIN_SCORER.md`.
- [x] Create a facilitated workflow scoring worksheet in `/pilot-kit` or docs. Score at least
  five candidate workflows on frequency, pain, data readiness, automation risk, reusability
  across clients, and expected speed gain.
- [x] Add a productized `/workflows` page once a pilot workflow exists. Inputs are inferred from
  workspace context, current decisions/actions/recommendations, evidence coverage, and sponsor-entered
  workflow scope/ROI fields.
- [x] Return a ranked list of candidate workflows with a defensible score and recommended first
  workflow twin candidate.
- [x] Acceptance test: a client can score at least five workflows and receives one recommended
  first candidate with a clear reason.
- [x] AI responsibility note: AI can suggest scoring rationale, but the sponsor confirms the
  workflow selected for pilot scope.

### Client workflow selection flow
- [x] Add a workflow-candidate library that includes universal candidates first:
  Decision & Action Twin, Ops Review Twin, Risk Review Twin, Proposal/SOW Twin,
  Regulatory Response Twin, and Agreement Review Twin.
- [x] Keep industry-specific candidates as optional templates: Proposal/SOW, Regulatory Response,
  Agreement Review, Due Diligence, Board Memo Preparation, and PMO Tracking.
- [x] Use the company profile to suggest relevant candidates, but let the sponsor override.
- [x] Acceptance test: a client can score at least five workflows and receives one recommended
  first Parallel Workflow Pilot with a clear reason.

### U6 — Backcasting Onboarding Step
- [x] Add an optional backcasting step through `/workflows` after company profile and role selection:
  "What would this function look like if it were AI-native in 12 months?"
- [x] Use a guided scope capture to define the desired end state, then work backward into a
  6-8 week pilot scope.
- [x] Persist the backcast summary to workflow twin config / pilot metadata: function,
  end-state description, success criteria, constraints, and first workflow candidate.
- [ ] Seed first dashboards and suggested questions from the backcast result. (Onboarding linkage remains part of priority item 8.)
- [x] Acceptance test: sponsor completes a backcasting session and the output appears in the
  pilot scope / kickoff materials.
- [x] AI responsibility note: backcasting is a planning aid, not a commitment that NexusAI can
  autonomously transform the function.

### U7 — Shadow-Mode Parallel-Run ROI
- [x] Draft shadow-mode ROI measurement playbook: `docs/SHADOW_MODE_ROI_PLAYBOOK.md`.
- [x] Add shadow-mode pilot measurement template: manual process output vs NexusAI output,
  reviewer, timestamp, cycle time, rework count, quality notes, and decision impact.
- [x] Extend the workflow ROI instrumentation to accept measured Day 30 data rather than only assumed hours saved.
- [x] Add a Day 30 review section showing measured comparison for at least one workflow:
  time saved, rework reduced, evidence coverage, recommendations accepted, and sponsor notes.
- [x] Acceptance test: pilot review can show one measured workflow comparison, not just
  self-reported productivity estimates.
- [x] AI responsibility note: AI does not claim ROI; it reports measured process deltas confirmed
  by the sponsor or reviewer.

### U8 — Trusted Eval Harness
- [ ] Build evaluation tables for agent outputs: agentId, outputId, workspaceId, evidence coverage,
  accuracy score, groundedness score, restricted-data score, decision outcome, reviewer notes,
  and evaluation timestamp.
- [ ] Use U4 learning signals and U3 agent logs as the input data source.
- [ ] Add an Agent Quality view in Settings or internal admin: acceptance rate, edit rate,
  rejection rate, evidence coverage, and restricted-data violations per agent.
- [ ] Add golden prompts for risks, decisions, recommendations, sector classification, source
  grounding, and restricted-data refusal.
- [ ] Acceptance test: each agent has an evaluation score that updates as review decisions
  accumulate.
- [ ] AI responsibility note: eval scores are used to improve workflows and prompts, not to
  surveil individual employees.

---

## Phase 8C — Ops Review Twin (v0.15.x)

> The repeatable company-wide cadence layer. This is broader than consulting/regulatory work:
> every company has blockers, owners, priorities, KPIs, overdue work, and weekly follow-ups.

- [ ] Add Ops Review Twin type and default configuration.
- [ ] Inputs: processed evidence, action items, recommendations, decisions, source status,
  department metadata, and optional Slack/Teams thread summaries.
- [ ] Outputs: weekly execution summary, top blockers, overdue owners, process gaps, KPI signals,
  department follow-ups, risks, and suggested next actions.
- [ ] Add `/workflows/ops-review` or route through the generic `/workflows` detail page.
- [ ] Add weekly run history with evidence refs, confidence, freshness, and reviewer status.
- [ ] Route high-risk output through the same U2 output gate before it can appear in exports
  or outbound summaries.
- [ ] Acceptance test: an Ops Review Twin run produces different views for at least Operations,
  Finance, People, Commercial, and Technology evidence without leaking restricted content.
- [ ] Acceptance test: overdue owners and blockers are evidence-backed or clearly marked
  as inferred/needs review.

---

## Phase 9 — Team Members and Sub-Accounts

> Build this when a pilot client has more than one user who needs access to their workspace.
> Do not build speculatively — the trigger is a client asking "can my COO also see this?"

- [ ] Add workspace member invitation flow from Settings — invite by email, sends Clerk invitation.
- [ ] Add workspace roles: Owner, Admin, Executive, Reviewer, Contributor, Viewer.
  Owner: full access including billing and member management.
  Admin: all workspace settings and evidence management.
  Executive: dashboard and Ask access for their assigned role lens.
  Reviewer: evidence approval queue only.
  Contributor: can upload documents; cannot see dashboards.
  Viewer: read-only dashboard access; cannot ask questions or upload.
- [ ] Add role lens assignment per member: each Executive member gets one or more role lenses
  (CEO, COO, CFO, etc.) that determine which dashboards and agent briefs they see.
- [ ] Add department-level access policy per member: Contributor and Viewer can be scoped to
  a single department (e.g., Finance team member can only see Finance evidence).
- [ ] Add sensitivity access policy per member: Viewers can be restricted to internal-level
  content only, preventing them from seeing confidential or restricted evidence.
- [ ] Add invitation states: pending (email sent), accepted, revoked. Show invitation history
  in Settings > Team. Resend invitation option.
- [ ] Add audit events for: member invite sent, member accepted, role changed, member removed,
  access policy changed. All events include actor and timestamp.
- [ ] Add team member management page under Settings: list all members with role, lens, status,
  last active. Remove member and change role actions for admins.
- [ ] Add read-only external advisor access: a Viewer-level access type that does not count
  against member limits, intended for board members, pilot sponsors, and external consultants.
  External advisors see approved summaries only — not raw evidence or restricted content.
- [ ] AI responsibility note: AI suggests role lens and access defaults based on job title
  if provided during invitation. Admin confirms before the invitation is sent.

---

## Phase 9C — Data Residency, Compliance, and Privacy

> Required before onboarding regulated clients in GCC and Pakistan. These clients will ask
> where their data lives before signing anything. Some will have contractual obligations to
> their own regulators that make this non-negotiable.

### Pakistan — PDPL (Personal Data Protection Law)
- [ ] Conduct a PDPL gap analysis: map which NexusAI data flows touch personal data
  (user email, phone numbers, document content that may contain PII, WhatsApp contact data).
  Document lawful basis for processing each category.
- [ ] Add a data processing agreement (DPA) template for Pakistan clients. Include:
  data categories processed, processing purposes, retention periods, sub-processors list
  (Neon/Postgres, R2, Clerk, Twilio, Anthropic/OpenAI), and data subject rights.
- [ ] Implement data subject rights in the product: right to erasure (workspace deletion
  removes all evidence and profile data), right to export (workspace data export as ZIP),
  right to correction (profile and evidence metadata editable). Document the process.
- [ ] Note on PDPL data localisation: as of 2025, PDPL does not mandate data localisation
  for all sectors, but financial services and health data may face additional obligations.
  Document which data categories require localisation review before each client onboarding.

### Saudi Arabia — NCA Cloud Computing Policy and SAMA requirements
- [ ] Document Saudi NCA Cloud Computing Policy requirements for NexusAI's architecture:
  cloud service classification (IaaS/PaaS/SaaS), data classification requirements,
  and the specific obligations for government-linked or regulated entities.
- [ ] For SAMA-regulated clients (banks, fintechs, insurance): document that NexusAI
  processes business intelligence data, not core banking data. The distinction matters
  for SAMA cloud circulars. Prepare a one-page architecture note clients can share with
  their compliance teams.
- [ ] Evaluate Neon Postgres region availability for KSA. If AWS ap-southeast-1 or a
  closer region is required, document the migration path to a KSA-proximate region.
  Saudi NCA prefers data hosted in KSA or GCC for sensitive workloads.
- [ ] Add Twilio regional routing note for KSA: Twilio's WhatsApp routes through US by
  default. For KSA clients who require in-region routing, document Meta Cloud API as the
  Phase 2 migration and note the limitation in the client DPA.

### UAE — TDRA and DIFC/ADGM requirements
- [ ] Document UAE TDRA (Telecommunications and Digital Government Regulatory Authority)
  cloud usage requirements relevant to NexusAI's architecture.
- [ ] For DIFC-licensed clients: DIFC Data Protection Law 2020 applies. Ensure DPA template
  covers DIFC DPL requirements including data transfer mechanisms and processor obligations.
- [ ] For ADGM-licensed clients: ADGM Data Protection Regulations 2021 apply. Same scope
  as DIFC — confirm DPA template covers both.
- [ ] UAE data residency: UAE does not mandate data localisation for most sectors but
  financial services clients (CBUAE-regulated) may require GCC hosting. Document this
  and offer Neon region selection (if available) or note it as a Phase 13 local edge concern.

### GDPR (for EU-touching clients or staff)
- [ ] If any client has EU operations or EU-based employees whose data passes through NexusAI,
  GDPR applies. Add a GDPR-compliant DPA addendum. Identify sub-processors and their
  Standard Contractual Clauses (SCCs) status: Anthropic, OpenAI, Neon, Cloudflare R2,
  Clerk, Twilio, Render.
- [ ] Add cookie consent banner to the landing page and any unauthenticated pages.
  Authenticated app pages behind login are lower priority for cookie compliance.
- [ ] Add a privacy-by-design checklist to the development process: any new feature that
  touches personal data must document: what data is collected, why, how long it's retained,
  who can access it, and whether the user is informed.

### Cross-market compliance
- [ ] Create a data processing register: a living document listing every category of data
  NexusAI processes, the system it's stored in, the legal basis, the retention period, and
  the deletion process. Update with every new connector or data type added.
- [ ] Add a sub-processor change notification process: when a new sub-processor is added
  (new LLM provider, new storage provider, new analytics tool), notify existing clients
  30 days in advance per standard DPA terms.
- [ ] Add a data breach response plan: detection (Sentry alert + manual report),
  assessment (is personal data involved?), notification (within 72 hours under GDPR and
  PDPL if personal data is affected), remediation. Document in `docs/BREACH_RESPONSE.md`.
- [ ] Add a deletion/retention policy enforced in the product: evidence records older than
  the workspace's configured retention period (default 3 years, configurable) are flagged
  for deletion. Admin confirms before deletion runs. This is not automated — human approval
  required for any bulk deletion.

---

## Phase 9D — Go-to-Market Execution

> These are the commercial tools needed to convert conversations into signed pilots.
> Most are documents and templates, not code. They should exist before the first outbound call.

### Outreach and sales materials
- [x] Create a one-page product brief for NexusAI: what it does, who it's for, how it works,
  what the pilot looks like, what it costs. Designed to be sent after a first call.
  Available as PDF and as a web page at `/product-brief`.
- [x] Create a pilot proposal template (SOW): scope of work, deliverables, timeline, fees,
  assumptions, exclusions, client responsibilities, governance, and next steps.
  Tailored versions for: fintech/regulated, professional services, digital-native/SaaS.
- [x] Create a demo script with 3 narrative flows: (1) Fintech CEO who needs risk and
  compliance intelligence, (2) Consulting Managing Partner who needs BD pipeline and
  project intelligence, (3) D2C brand founder who needs performance marketing and growth signals.
  Each script is 15 minutes, uses realistic demo data, and ends with a clear "what you'd see
  with your own documents" moment.
- [x] Create a competitor comparison one-pager: NexusAI vs. ChatGPT Enterprise, NexusAI vs.
  Glean, NexusAI vs. traditional BI tools. Focus on what the others lack: sector-aware
  onboarding, evidence grounding, role-specific briefs, WhatsApp delivery, GCC/Pakistan
  infrastructure connectors.
- [x] Create a pilot ROI calculator: a simple spreadsheet showing time saved per week per
  executive role (CEO: 3 hours briefing prep, CFO: 2 hours report consolidation, etc.)
  multiplied by the executive's estimated cost per hour. Used in the pilot close conversation.

### Pilot management
- [x] Create a pilot kickoff deck template: NexusAI overview, what happens in the first 30
  days, who does what, how success is measured, escalation path, next review date.
- [x] Create a 30/60/90 day pilot review template: what was ingested, which dashboards are
  active, which recommendations were actioned, which questions were asked via Ask, pilot
  scorecard status, blockers, renewal discussion.
- [ ] Create a case study template: client context (anonymised if needed), challenge, what
  was set up, results after 90 days (time saved, risks surfaced, decisions logged),
  quote from sponsor. First case study to be written at the end of the first successful pilot.
- [ ] Define the pilot-to-paid conversion process: what triggers a renewal conversation,
  who initiates it, what the commercial terms are for conversion, how workspace settings
  change from pilot to paid tier.

### Partnership and channel
- [ ] Define the consultant/system integrator partnership model: Leap Associates and similar
  firms can deploy NexusAI for their clients under a reseller or referral arrangement.
  Define: margin structure, white-label availability, co-branded pilot deck, training
  required before a partner can run a pilot independently.
- [ ] Create a partnership one-pager: why NexusAI is a strong add-on for fintech consultants,
  management consultants, and digital transformation advisors. What the partner gets,
  what NexusAI gets, how referrals are tracked.
- [ ] Define GCC market entry priority: UAE (Dubai, Abu Dhabi) first given regulatory
  environment and tech adoption, Saudi Arabia second (larger market, higher compliance
  friction), Pakistan third (high growth, cost-sensitive, WhatsApp-first). Document
  the approach for each market in `docs/MARKET_ENTRY.md`.

---

## Phase 9B — Mobile and Voice Interface

> Positioning: no other executive intelligence product delivers briefings on WhatsApp or by voice call.
> This is a genuine differentiator for the GCC and Pakistan market where WhatsApp is the primary
> business communication layer and executives are rarely at a desk when they need information.
> Build sequence: WhatsApp inbound and outbound first, then scheduled briefings, then voice.
> This phase can be piloted independently of Phase 10 connectors work.

### First-iteration boundary
- [ ] Keep Whisper/local voice out of the first V1 demo dependency path. The demo should not require browser microphone permissions, audio storage, Twilio Voice, Deepgram, or OpenAI Whisper to work.
- [ ] Future-proof voice as a transcript seam: local OS dictation or local Whisper on the user's PC can turn speech into text before Nexus receives it. Nexus then handles the result as a normal Ask query, note, or evidence transcript.
- [ ] Keep browser microphone capture disabled until a dedicated voice feature ships with explicit consent, audit logging, sensitivity gating, and transcript retention rules.

### Design principles for this phase
- Meet the user where they already are. WhatsApp, SMS, and voice are not add-ons — they are
  primary interfaces for the sme_physical and mobile-first executive audience.
- The same evidence, different delivery. A WhatsApp response and a dashboard card come from
  the same retrieval engine. Only the formatting changes.
- Sensitivity governs channel. WhatsApp (E2E encrypted) can carry confidential content.
  SMS (unencrypted) carries internal level only. Voice carries internal level only.
  Restricted content never leaves the platform through any mobile channel.
- Conversations have memory. A WhatsApp thread is a session. Follow-up questions should
  work without re-stating context. Thread history (last 5 exchanges) is kept in session.
- Outbound before inbound for voice. Outbound calls (NexusAI calls the user to deliver a brief)
  are simpler to build than inbound IVR. Ship outbound first.

### Phone number registration and authentication
- [ ] Add `mobileNumber` and `whatsappNumber` fields to user profile in workspace settings.
  These can differ — some users have separate WhatsApp and phone numbers.
- [ ] Add phone number verification flow in Settings: enter number, receive OTP via SMS,
  confirm. One-time setup. Multiple numbers supported per workspace (each exec registers
  their own).
- [ ] When an inbound WhatsApp or SMS message arrives, look up the sender's phone number
  against registered workspace users. If not found, send: "This number is not registered
  with NexusAI. Visit your workspace settings to add your number."
- [ ] For voice calls, phone number match is the authentication. If calling from a registered
  number, no further verification needed for internal-level briefs. Confidential briefs via
  voice require a spoken 4-digit PIN confirmed during registration.
- [ ] Store channel preferences per user: preferred channel (WhatsApp, SMS, voice), preferred
  briefing time, preferred role lens for outbound briefings.
- [ ] Sensitivity gate stored per channel per user: `whatsappMaxSensitivity` (default confidential),
  `smsMaxSensitivity` (default internal), `voiceMaxSensitivity` (default internal). Admin
  can lower these globally from workspace policy settings.

### Response formatting layer
- [ ] Create `lib/services/mobile-formatter.ts` — takes a retrieval response or agent brief
  and formats it for three output modes:
  `whatsapp`: supports *bold* via asterisks, line breaks, up to 4000 chars. Strips confidence
  percentages into plain language ("high confidence" not "84%"). Strips evidence IDs. Keeps
  key points and a single action item.
  `sms`: plain text only, max 480 chars. No markdown. One-sentence summary and one action.
  Longer briefs get a truncated version with "Reply FULL for complete brief."
  `voice`: spoken sentences only. No bullet points. No lists. Converts numbers to spoken form
  ("around 84 percent" not "84%"). No abbreviations (say "Chief Financial Officer" not "CFO"
  on first mention). Max 90 seconds at natural speaking pace (~200 words). Structured as:
  greeting → key finding → recommended action → closing.
- [ ] Response length adapts to archetype: `sme_physical` gets the shortest responses (2-3 sentences
  on any channel). `corporate` gets fuller responses with more evidence context.
- [ ] Add a `channel` parameter to the retrieval and dashboard services so they can adjust
  prompt instructions: "Answer in 3 sentences for mobile delivery" vs standard length.
- [ ] WhatsApp supports reaction emojis and read receipts — do not use emojis in brief content
  but do send a delivery confirmation: a single checkmark emoji after the brief is sent to
  indicate NexusAI received and processed the query.

### WhatsApp inbound — user queries
- [ ] Create `app/api/webhooks/whatsapp/route.ts` — receives POST from Twilio or Meta Cloud API.
  Verifies webhook signature (Twilio HMAC or Meta X-Hub-Signature-256). Identifies user by
  sender phone number. Routes to the appropriate handler.
- [ ] Text message handler: treat message body as a query. Call `answerWithEvidence()` with
  the user's workspace ID and role. Format response for WhatsApp. Reply via API.
- [ ] Voice note handler: receive audio file URL from WhatsApp. Transcribe using OpenAI Whisper
  or Deepgram. Treat transcript as a text query. Same routing as text messages.
- [ ] File/document handler: receive file URL (PDF, DOCX, image). Download and submit to
  ingestion pipeline (`ingestEvidence()`). Reply: "Received [filename] — processing now.
  I'll confirm once it's extracted and added to your evidence."
- [ ] Image handler: receive image URL. If it appears to be a document (photo of a page,
  screenshot of data), submit to OCR + ingestion. If it's not a document, reply:
  "I can process documents and data files. Send a PDF, photo of a document, or data export."
- [ ] Keyword shortcuts: if the message is a single word or short phrase, recognise command
  shortcuts:
  "brief" or "dashboard" → send the user's role dashboard brief
  "risks" → send the top risks from their dashboard
  "ask [question]" → treat everything after "ask" as a retrieval query
  "stop" → pause outbound scheduled briefings (WhatsApp opt-out compliance)
  "help" → send a list of available commands

### WhatsApp thread continuity (session memory)
- [ ] Store last 5 exchanges per WhatsApp thread ID in a short-lived in-memory or Redis store.
  Key: `whatsapp:{threadId}`, TTL: 4 hours of inactivity.
- [ ] When a new message arrives in an active thread, prepend the last 3 exchanges to the
  retrieval prompt as conversation context. This enables follow-up questions:
  "What about the vendor situation?" → NexusAI knows this follows "what are the top risks?"
- [ ] Thread context is cleared on "stop", on workspace logout, or after 4-hour inactivity.
- [ ] Thread context is never persisted to the main evidence DB — it is ephemeral session state.

### WhatsApp outbound — scheduled and alert-triggered briefings
- [ ] Add outbound briefing configuration to user settings: on/off toggle, preferred time,
  preferred role lens, preferred channel (WhatsApp or SMS).
- [ ] Create scheduled task for daily WhatsApp briefing: at the user's configured time, fetch
  their role brief, format for WhatsApp, send via Twilio or Meta Cloud API.
  Uses the existing `mcp__scheduled-tasks` infrastructure for scheduling.
- [ ] Add alert-triggered outbound: when an agent brief detects a time-sensitive signal
  (regulatory deadline, risk escalation, audit finding), send a WhatsApp alert immediately.
  Alert format: "NexusAI Alert — [signal title]. [1-sentence description]. Reply BRIEF for
  the full brief or DISMISS to acknowledge."
- [ ] Threshold configuration: admins can set which signal types trigger immediate WhatsApp
  alerts vs. daily digest inclusion only. Default: regulatory deadlines and high-severity
  risk signals trigger immediate alerts.
- [ ] WhatsApp opt-out compliance: "stop" command pauses all outbound messages. "start" resumes.
  Maintain opt-out state per user in workspace profile. Never send to opted-out numbers.

### SMS interface
- [ ] Create `app/api/webhooks/sms/route.ts` — receives POST from Twilio SMS webhook.
  Same authentication model as WhatsApp. Stricter content rules.
- [ ] SMS responses capped at 480 chars. If the full brief exceeds this, send a truncated
  version ending with "Reply FULL for the complete brief via WhatsApp."
- [ ] Confidential content never sent via SMS regardless of user configuration. If a query
  would return confidential evidence, respond: "This response contains confidential content.
  Please check your NexusAI dashboard or WhatsApp for the full brief."
- [ ] Inbound file handling not supported via SMS — SMS does not reliably support MMS in
  all GCC/Pakistan carriers. If a user sends an MMS, reply: "Please send documents via
  WhatsApp or the NexusAI web app for processing."

### Voice interface — outbound (Phase 1)
- [ ] Create `lib/services/voice-briefing.ts` — takes an agent brief and converts it to a
  voice-ready script. Rules: no lists, no markdown, no abbreviations on first mention,
  numbers spoken as words, max 200 words, structured as greeting → key finding → action → close.
- [ ] Create `app/api/voice/outbound/route.ts` — triggered by schedule or alert threshold.
  Uses Twilio Voice API to initiate a call to the registered phone number.
  Delivers voice script via Twilio TTS (Polly neural voice, language matched to region:
  English UK for GCC, English US fallback). Call is one-way — user listens, no IVR in Phase 1.
- [ ] Voice briefing schedule: user configures time and frequency in settings. Default off.
  When enabled, NexusAI calls at the configured time, delivers the role brief, hangs up.
  Missed call → sends a WhatsApp message: "We tried to call with your brief. Reply BRIEF
  for the text version."
- [ ] Call recording: do not record calls in Phase 1. Add as optional Phase 2 feature with
  explicit consent, because recordings constitute evidence and have data implications.

### Voice interface — inbound (Phase 2, not Phase 1)
- [ ] Provision a phone number per workspace via Twilio (or shared IVR with workspace
  selection). Design IVR flow: welcome → say your name or workspace PIN → confirm role →
  "Say your question or press 1 for your daily brief."
- [ ] Inbound voice query: STT via Deepgram or OpenAI Whisper. Route transcript to
  `answerWithEvidence()`. Format response for voice. TTS response delivered in the call.
- [ ] Inbound voice ingestion: "Send us a voice note" — user speaks a meeting summary,
  decision note, or update. Transcribed and ingested as evidence with sourceType=voice_note.
  Classified as department=Operations by default, editable.
- [ ] Hold music / processing time: STT + retrieval + TTS takes 3-6 seconds. Play a brief
  hold tone with "NexusAI is thinking..." during processing.

### Twilio vs Meta Cloud API decision
- [ ] Use Twilio as the primary provider for Phase 1. Twilio supports WhatsApp, SMS, and
  Voice from a single API and SDK. Simpler credential model, faster to build. Costs
  approximately $0.005-0.015 per WhatsApp message and $0.013/min for voice.
- [ ] Plan migration path to Meta Cloud API for WhatsApp at scale: Meta Cloud API has no
  per-message fee beyond hosting, supports higher throughput, required for business
  verification at enterprise tier. Document migration path but do not build it in Phase 1.
- [ ] Required environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_WHATSAPP_NUMBER`, `TWILIO_SMS_NUMBER`, `TWILIO_VOICE_NUMBER`.
  Add to `.env.example` and Render environment documentation.
- [ ] Twilio webhook verification: all inbound webhooks must verify the X-Twilio-Signature
  header before processing. Reject unsigned requests with 403.

### GCC and Pakistan market specifics
- [ ] WhatsApp is the primary channel — prioritise WhatsApp reliability over SMS or voice.
  A failed WhatsApp delivery should retry once, then fall back to SMS, then log failure.
- [ ] Arabic language support: detect if user's WhatsApp interface language is Arabic.
  If so, send responses in English but with RTL-friendly formatting (no left-aligned markdown
  lists that look wrong in RTL). Full Arabic response generation is Phase 2.
- [ ] Urdu language support: similarly detect and flag. English responses for Phase 1.
  Phase 2 adds Urdu brief generation for Pakistan market.
- [ ] Number formatting: GCC numbers use +971 (UAE), +966 (KSA), +968 (Oman), +974 (Qatar),
  +973 (Bahrain), +965 (Kuwait). Pakistan: +92. Validate these prefixes during number
  registration to catch formatting errors early.
- [ ] WhatsApp Business Policy compliance: NexusAI must use approved message templates for
  outbound messages initiated by NexusAI (not replies). Design templates for: daily briefing,
  alert notification, document received confirmation. Submit for WhatsApp template approval
  before launch. User-initiated conversations (replies) do not need templates.

### Security and privacy for mobile channels
- [ ] Confidential evidence: can be sent via WhatsApp (E2E encrypted). Never via SMS or voice.
  Restricted evidence: never sent via any mobile channel. Platform only.
- [ ] No customer PII via mobile channels: WhatsApp briefs must redact customer names,
  account numbers, and personal identifiers. Company-level aggregates are acceptable.
  Individual customer data is not. This is critical for financial services and healthcare clients.
- [ ] Audit log: every WhatsApp, SMS, and voice interaction is logged as an audit event
  with: channel, sender number (hashed), query (or "voice briefing"), response classification,
  timestamp. Never log the full response content in the audit log — only the query and
  result classification.
- [ ] Data residency note: Twilio routes messages through US infrastructure by default.
  For PDPL (Pakistan) and Saudi NCA compliance, document this and offer a note in the
  settings page. Meta Cloud API supports regional routing. Add as Phase 2 migration reason.
- [ ] Do not retain WhatsApp thread history beyond the 4-hour session window. After expiry,
  the conversation is gone. This is by design — mobile channels are not an evidence store.

### Settings page additions for mobile and voice
- [ ] Add Mobile and Voice section to Settings page with tabs:
  WhatsApp: phone number registration, verification status, outbound briefing on/off,
  preferred briefing time, alert preferences, opt-out status.
  SMS: phone number (can be same as WhatsApp), sensitivity ceiling (internal only).
  Voice: phone number, outbound call on/off, preferred call time, voice language preference.
- [ ] Show channel health status: "WhatsApp connected — last message 2 hours ago."
  "SMS not configured." "Voice not enabled."
- [ ] Admin-level channel policy: workspace admin can disable any channel globally,
  lower the sensitivity ceiling globally, or restrict mobile access to specific roles only.

### Documentation and AI responsibility notes for mobile channels
- [ ] Note: mobile channel responses are always grounded in the same evidence as the dashboard.
  NexusAI never generates unsupported answers for WhatsApp or voice.
- [ ] Note: AI cannot take actions via WhatsApp or voice in Phase 1. Read-only intelligence
  delivery only. Phase 2 may introduce approval-gated actions (e.g., "Reply APPROVE to
  action this recommendation") with explicit human confirmation required.
- [ ] Note: voice briefings are one-way in Phase 1. NexusAI speaks, the user listens.
  No autonomous actions result from a voice call.
- [ ] Note: WhatsApp document ingestion via mobile is treated identically to web upload —
  same confidence scoring, same quarantine rules, same sensitivity defaults. Being received
  via WhatsApp does not lower the quality bar.
- [ ] Update `AGENTS.md` with mobile channel trust model: mobile channels are read-only
  delivery surfaces. No agent can initiate an action, send external messages, or modify
  workspace data as a result of a mobile channel interaction in Phase 1.

- [ ] Add workspace member invitation flow from Settings
- [ ] Add roles: Owner, Admin, Executive, Reviewer, Contributor, Viewer
- [ ] Add CxO/business lens assignment per member: CEO, COO, CBO/Strategy, CTO/CDO, Finance, Risk, Sales, Operations, HR, Product
- [ ] Add department and sensitivity access policy per member
- [ ] Add invitation emails and accepted/pending/revoked membership states
- [ ] Add audit events for invite, role change, removal, and access-policy changes
- [ ] Add team member management page for CXOs/admins
- [ ] Add read-only external advisor access for consultants, board members, and pilot sponsors
- [ ] Add AI responsibility notes: AI suggests role/lens/access defaults from job title and department, but admins approve permissions

---

## Phase 10 — Core Enterprise SaaS Connectors

> Scope clarification: Phase 10 covers SaaS application connectors — the tools companies
> use to run projects, communicate, manage customers, and track finances. Phase 10B covers
> infrastructure and operational data — banking APIs, POS systems, regulatory portals, payroll
> systems. The overlap on accounting tools (QuickBooks, Xero) is intentional: Phase 10 connects
> to the SaaS application layer, Phase 10B connects to the raw GL and bank statement layer.
> Build Phase 10 first — it has broader applicability across company types and archetypes.
> Priority within Phase 10: Docs/Comms → Meetings → Project/Work → CRM → Finance → HR → BI.

### Connector infrastructure (build once, used by all connectors)
- [ ] Build connector abstraction layer: auth handler, sync scheduler, source object mapper,
  provenance tagger, permission enforcer, failure handler with exponential backoff retry.
- [ ] Add connector registry UI in Settings: installed connectors with status, owner, last
  sync timestamp, records ingested, sync health indicator, manual sync trigger, remove option.
- [ ] Add source-level sensitivity controls: each connector has a max sensitivity ceiling.
  Evidence produced by a connector cannot exceed that ceiling regardless of filename signals.
- [ ] Add per-connector audit trail: every sync run logged with: connector type, instance ID,
  records fetched, records ingested, records skipped, errors, duration.
- [ ] Add OAuth token refresh and rotation handling: background job refreshes tokens before
  expiry. Alert admin if refresh fails. Connector goes to `error` state, not silent failure.
- [ ] Add webhook ingestion path: for connectors that push events (Slack, GitHub, Jira webhooks).
  Route to the ingestion pipeline with connector source tagging.
- [ ] Add CSV/XLSX export fallback: for any system without a live API, provide a structured
  CSV upload template per connector type. Manual upload triggers the same ingestion pipeline.

### Docs and Communications bundle
- [x] **Google Drive** — OAuth2. Sync: Google Docs, Sheets, Slides, PDFs from specified folders.
  Respect Google Drive sharing permissions — only ingest files the connected account can read.
  Exclude personal Drive; connect only shared drives or specified team folders.
  Closed 2026-06-25, commit `2ff4c26`. `lib/connectors/google-drive.ts` + install/callback/files/ingest
  routes. Code-complete; pending real-OAuth-app verification (no folder-scoping yet — lists all
  Drive files the token can see).
- [x] **Microsoft SharePoint / OneDrive** — OAuth2 via Microsoft Graph API. Sync document
  libraries from specified sites. Respect SharePoint permission inheritance.
  Closed 2026-06-25 (Task #40), commit `9da3411`. Code-complete; pending real-OAuth-app verification.
- [ ] **Dropbox Business** — OAuth2. Sync specified team folders. Paper documents included.
- [ ] **Box** — OAuth2. Sync specified Box folders. Enterprise content management use case.
- [ ] **Slack** — already partially built (event listener). Extend to: channel message ingestion
  (selected channels only), file attachments from Slack, thread summaries. Admin selects
  which channels are ingested. No DMs ingested — privacy boundary.
- [ ] **Microsoft Teams** — OAuth2 via Graph API. Ingest Teams channel messages (selected
  channels), files shared in Teams, meeting chat. Same privacy boundary as Slack: no DMs.
- [ ] **Gmail** — OAuth2 with narrow scope. Ingest emails from specified labels/folders only
  (e.g., "NexusAI" label). Never ingest full inbox. User explicitly labels emails for ingestion.
- [ ] **Outlook** — OAuth2 via Graph API. Same pattern as Gmail — specified folders only.

### Meetings bundle
- [ ] **Zoom** — OAuth2. Ingest meeting transcripts and recordings summaries (not raw video).
  Auto-classify as department=Meetings, sourceType=meeting_transcript.
- [ ] **Google Meet** — Google Workspace OAuth2. Ingest transcripts from Google Meet recordings.
- [ ] **Otter.ai** — API key. Ingest conversation transcripts and action items.
- [ ] **Fireflies.ai** — API key. Ingest meeting notes, action items, and sentiment signals.

### Project and Work Management bundle
- [~] **Jira** — OAuth2. Ingest: project status summaries, sprint reports, open issues by
  priority, overdue items, epic completion rates. Not individual ticket text — aggregate signals.
  Partially closed 2026-06-25. `lib/connectors/jira.ts` (Atlassian OAuth 2.0 3LO + cloudId
  resolution) + install/callback/files/ingest routes built and code-complete, pending
  real-OAuth-app verification. Current ingest is per-issue (JQL search + single-issue fetch),
  not yet the aggregate sprint/epic-rollup summaries this line originally specced — that
  aggregation layer is still open and should be scoped as a follow-up on top of `searchIssues()`.
- [ ] **Linear** — API key or OAuth2. Same as Jira: project status, cycle summaries, blockers.
- [ ] **Asana** — OAuth2. Project status, milestones, overdue tasks, portfolio health.
- [ ] **Monday.com** — OAuth2. Board summaries, project status, overdue items.
- [ ] **ClickUp** — API key. Space and list summaries, sprint goals, overdue items.
- [ ] **Smartsheet** — OAuth2. Sheet summaries, project timelines, red/amber/green status.

### CRM and Sales bundle
- [ ] **Salesforce** — OAuth2. Ingest: pipeline summary by stage, forecast vs target,
  opportunity win/loss signals, deal velocity, account health scores. Not individual contact
  records — aggregate sales intelligence. Sensitivity: confidential.
- [~] **HubSpot** — OAuth2. Pipeline summary, deal stages, contact activity signals, email
  sequence performance, forecast report.
  Partially closed 2026-06-25. `lib/connectors/hubspot.ts` + install/callback/files/ingest routes
  built and code-complete, pending real-OAuth-app verification. Current scope is deals only
  (list + single-deal ingest as `sourceType: "crm"`); contact activity signals and email
  sequence performance are not yet built — still open.
- [ ] **Zoho CRM** — OAuth2. Pipeline, forecast, activity summary.
- [ ] **Pipedrive** — API key. Pipeline summary, deal age, stalled deals.

### Finance and ERP bundle (SaaS application layer)
> Note: QuickBooks, Xero, and Zoho Books at the raw GL level (trial balance, AR/AP aging)
> are in Phase 10B. Phase 10 connects to the standard report and summary exports via their
> SaaS APIs — appropriate for most companies. Phase 10B is for companies that need the
> full accounting data at ledger level.
- [~] **QuickBooks Online** — OAuth2. Profit and loss summary, cash flow statement, accounts
  receivable aging summary, accounts payable aging summary, balance sheet snapshot.
  Partially closed 2026-06-25. `lib/connectors/quickbooks.ts` (Intuit OAuth2 + realmId
  resolution from callback) + install/callback/files/ingest routes built and code-complete,
  pending real-OAuth-app verification. Current scope is invoices only (list + single-invoice
  ingest as `sourceType: "finance_export"`); P&L/cash flow/AR/AP aging/balance-sheet report
  pulls are not yet built — still open as a follow-up on the Accounting API's `/reports/`
  endpoints.
- [ ] **Xero** — OAuth2. Same report set as QBO above.
- [ ] **NetSuite** — RESTlet or SuiteQL. Financial summary reports, project billing status,
  multi-entity consolidation summary. Enterprise-tier connector.
- [ ] **SAP / Oracle ERP** — SFTP-based report export or API where available. Financial
  summary, cost centre reports, budget vs actual. Large enterprise connector.

### HR and People bundle
- [ ] **Workday** — API/SFTP. Headcount report, attrition summary, open positions, time-to-fill.
- [ ] **BambooHR** — API key. Headcount, attrition, PTO usage, turnover trends.
- [ ] **HiBob** — API key. Headcount, engagement survey results, attrition signals.

### BI and Data bundle
- [ ] **Power BI** — REST API or Export API. Pull published report summaries as evidence.
  Not raw data — summarised report content.
- [ ] **Tableau** — REST API. Published view data and workbook summaries.
- [ ] **Looker** — API key. Dashboard summaries and Look results.
- [ ] **Google Looker Studio** — OAuth2. Report snapshots.

### Support and Customer bundle
- [ ] **Zendesk** — API key. Ticket volume by category, CSAT scores, first response time,
  open escalations, SLA breach rate. Not individual ticket content — aggregate signals.
- [ ] **Intercom** — API key. Conversation volume, CSAT, common topics (from tags), churn signals.
- [ ] **Freshdesk** — API key. Ticket volume, SLA performance, CSAT, escalation count.
- [ ] **Gainsight** — API key. Customer health scores, churn risk signals, NPS, renewal pipeline.

### Engineering and Product bundle
- [~] **GitHub** — OAuth2 App or personal token. Repository summary: open PRs, CI pass rate,
  deployment frequency, open issues by label. Not code content — engineering health signals.
  Partially closed 2026-06-25. `lib/connectors/github.ts` (classic OAuth web app flow) +
  install/callback/files/ingest routes built and code-complete, pending real-OAuth-app
  verification. Current scope is repo listing + per-issue/PR ingest as `sourceType: "github"`;
  CI pass rate, deployment frequency, and label-based rollups are not yet built — still open.
- [ ] **GitLab** — OAuth2. Same engineering health signals as GitHub.
- [ ] **Sentry** — API key. Error rate trends, top errors by frequency, new regressions,
  performance degradation signals.
- [ ] **Datadog** — API key. Service health summary, error rate, p99 latency, deployment events.
- [ ] **PagerDuty** — API key. Incident count, MTTR (mean time to resolve), on-call escalations.

### Security and Compliance bundle (SaaS tools)
- [ ] **Vanta** — API key. Compliance framework status (SOC2, ISO27001), failing controls,
  open evidence requests, risk register summary.
- [ ] **Drata** — API key. Same as Vanta — compliance posture, failing controls.
- [ ] **Okta** — API key. Login failure rates, MFA adoption, suspicious login signals.

### Email bundle (second connector runtime — see docs/ARCHITECTURE.md §13)
> Note: Gmail and Outlook Mail reuse the existing Google/Microsoft OAuth clients (Google Drive
> and SharePoint respectively) with mail-specific scopes — pure `fetch()`, no SDK, same pattern
> as every other connector. IMAP is architecturally different: it is the codebase's first
> non-OAuth, non-REST connector, requiring `imapflow`/`mailparser` and a stateful TCP/TLS
> session instead of `fetch()`. Built 2026-06-26 per Ali's explicit decision to build both
> Gmail/Outlook and IMAP in the same pass rather than sequencing IMAP as long-tail.
- [~] **Gmail** — OAuth2, `gmail.readonly` scope. `lib/connectors/gmail.ts` +
  install/callback/files/ingest routes built and code-complete, pending real-OAuth-app
  verification (reuses `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, needs the Gmail redirect URI
  added to the same OAuth client). Current scope is message listing + per-message plain-text
  ingest as `sourceType: "email_crm"`. Attachment extraction and thread-level rollups are not
  yet built — still open.
- [~] **Outlook Mail** — OAuth2 via Microsoft Graph, `Mail.Read` scope. `lib/connectors/outlook-mail.ts`
  + install/callback/files/ingest routes built and code-complete, pending real-OAuth-app
  verification (reuses `MICROSOFT_CLIENT_ID`/`MICROSOFT_CLIENT_SECRET`/`MICROSOFT_TENANT_ID`,
  needs the Outlook Mail redirect URI added to the same Azure AD registration). Works against
  Outlook.com and Microsoft 365/Exchange Online alike. Same scope gaps as Gmail above — still open.
- [~] **IMAP Email** — protocol-level, not provider-specific (no OAuth). `lib/connectors/imap.ts`
  using `imapflow` + `mailparser`, plus `connect`/`files`/`ingest` routes (no install/callback —
  user supplies host/port/username/password directly in a settings-page form; credentials are
  encrypted at rest through the same `repository.upsertConnector` path as every OAuth connector).
  Code-complete pending `npm install` (new dependency, not yet installed) and a real-mailbox
  connection test. Covers any standards-compliant IMAP-over-TLS server (Spacemail, Hostinger,
  Zoho, self-hosted, etc). No POP3 by design. Folder browsing beyond INBOX and attachment
  extraction are not yet built — still open.

### Marketing and Growth bundle (SaaS application layer)
> Note: Phase 7A classifyFilename handles file uploads of ad exports (Meta Ads CSV, Google Ads
> XLSX). Phase 10 here handles live API connections to the same platforms — different path,
> same data. Phase 10 is for workspaces with dedicated marketing functions; Phase 7A file
> upload is for any workspace that exports reports manually.
- [ ] **Google Analytics 4** — OAuth2. Traffic summary, conversion rate, top channels,
  user acquisition sources. Not raw user data — aggregate marketing signals.
- [ ] **Google Search Console** — OAuth2. Organic search performance, top queries, click-through
  rates, coverage issues.
- [ ] **HubSpot Marketing** — OAuth2. Campaign performance, email metrics, landing page conversion.
- [ ] **Mailchimp** — OAuth2. Campaign open rates, click rates, unsubscribe rate, list health.
- [~] **LinkedIn (company page / social signals)** — OAuth2. Company-page posts and engagement
  as social/brand evidence. Built ahead of this section's original sequencing, per Ali's
  2026-06-25 explicit decision to build now rather than defer.
  Partially closed 2026-06-25. `lib/connectors/linkedin.ts` + install/callback/files/ingest
  routes built and code-complete, pending real-OAuth-app verification. Reading company-page
  posts additionally requires LinkedIn's Community Management API product (separate partner
  review/approval, not just OAuth client registration) — the install/callback flow works
  without it, but `files`/`ingest` will 502 with a 403 from LinkedIn until that product is
  approved for the registered app. Engagement-metric rollups are not yet built — still open.
- [ ] Add webhook ingestion path for tools that support real-time updates
- [ ] Add department-specific connector bundles
- [ ] Add Docs + Comms bundle: Google Drive, SharePoint, OneDrive, Dropbox, Box, Slack, Microsoft Teams
- [ ] Add Meetings bundle: Zoom, Google Meet, Microsoft Teams recordings/transcripts, Otter.ai, Fireflies.ai
- [ ] Add Project/Work bundle: Jira, Linear, Asana, Monday.com, ClickUp, Trello, Smartsheet
- [ ] Add CRM/Sales bundle: Salesforce, HubSpot, Microsoft Dynamics 365 CRM, Zoho CRM, Pipedrive
- [ ] Add Finance/ERP bundle: NetSuite, SAP, Oracle ERP, Microsoft Dynamics 365 Finance, QuickBooks, Xero, Sage
- [ ] Add HR/People bundle: Workday, BambooHR, HiBob, ADP, SAP SuccessFactors, Oracle HCM
- [ ] Add BI/Data bundle: Power BI, Tableau, Looker, Metabase, Snowflake, BigQuery, Redshift, Databricks
- [ ] Add Support/Customer bundle: Zendesk, Intercom, Freshdesk, ServiceNow, Gainsight
- [ ] Add Engineering/Product bundle: GitHub, GitLab, Bitbucket, Sentry, Datadog, PagerDuty, Jira, Linear
- [ ] Add Security/Compliance bundle: Vanta, Drata, OneTrust, Okta, Microsoft Entra ID, Google Workspace Admin
- [ ] Add Procurement/Legal bundle: DocuSign, Ironclad, Coupa, Zip, SharePoint legal folders
- [ ] Add Marketing/Growth bundle: Google Analytics, Search Console, Google Ads, LinkedIn Ads, HubSpot Marketing, Mailchimp
- [ ] Add AI responsibility notes: AI normalizes connector data into evidence/entities, summarizes trends, detects anomalies, and drafts recommendations; humans approve writebacks or outbound actions
- [ ] Add connector-specific AI policy for each system: read-only, draft-only, approval-required writeback, or blocked

---

## Phase 10B — Company Infrastructure and Operational Data Connectors

> This phase covers the layer below SaaS applications — the systems companies actually run their
> operations on. POS, banking, payments, regulatory portals, inventory, property, and sector-specific
> operational platforms. Each instance is captured individually with its specific data objects,
> authentication method, and what the AI agent does with the data.
>
> Priority for your markets: GCC and Pakistan banking/payments infrastructure first, then POS
> and inventory for sme_physical, then regulatory portals for financial services and healthcare.
> Each connector entry specifies: system name, data objects ingested, authentication method,
> ingestion frequency, which agent consumes the data, and AI responsibility boundary.

### Design principles for this phase
- Every connector is read-only in Phase 1. No writebacks, no actions in source systems.
- Each connector produces structured evidence records, not raw API dumps. The AI normalises
  and extracts signals — humans review the evidence before it affects any recommendation.
- Connector data is classified at ingestion: department, sensitivity, source type, and
  which agent it feeds. Never treat a connector as a generic file dump.
- Regional infrastructure first. GCC and Pakistan banking, payment, and regulatory systems
  are priority over global enterprise platforms. Your market requires these; global tools
  are secondary.

### Banking and open banking connectors

- [ ] **SBP Open Banking API (Pakistan)** — State Bank of Pakistan's open banking framework.
  Data objects: account balances, transaction history, payment status, settlement reports.
  Auth: OAuth2 with SBP-registered client credentials.
  Ingestion frequency: daily balance, real-time on transaction events via webhook.
  Agent: CFO agent (cash position, reconciliation), CRO agent (payment risk signals).
  AI responsibility: read-only balance and transaction summary. No payment initiation.

- [ ] **SAMA Open Banking API (Saudi Arabia)** — Saudi Central Bank open banking.
  Data objects: account information, transaction history, payment initiation status.
  Auth: SAMA-registered OAuth2.
  Ingestion frequency: daily.
  Agent: CFO agent.
  AI responsibility: read-only. Flag any transaction anomalies to CRO agent.

- [ ] **CBUAE Open Banking (UAE)** — Central Bank of UAE open finance framework.
  Data objects: account balances, transactions, payment status.
  Auth: CBUAE-registered OAuth2.
  Ingestion frequency: daily.
  Agent: CFO agent, CRO agent.

- [ ] **Qatar Central Bank (QCB) reporting** — QCB financial reporting portal.
  Data objects: regulatory returns status, submission confirmations, outstanding submissions.
  Auth: QCB portal credentials (API where available, scrape-resistant form where not).
  Ingestion frequency: weekly.
  Agent: CCO agent (submission status), CRO agent (outstanding obligations).

- [ ] **Habib Bank Limited (HBL) / MCB / UBL corporate banking APIs (Pakistan)** — major
  Pakistan commercial bank APIs for corporate accounts.
  Data objects: account statements, payroll disbursement status, trade finance status,
  LC (letter of credit) status, forex transaction reports.
  Auth: bank-specific API keys or SFTP-based statement delivery.
  Ingestion frequency: daily statement pull.
  Agent: CFO agent.
  AI responsibility: summarise cash position, flag large or unusual transactions.

- [ ] **Emirates NBD / FAB / ADCB / Mashreq corporate banking APIs (UAE)** — UAE commercial
  bank corporate portals.
  Data objects: account balances, transactions, trade finance, payroll status.
  Auth: bank API credentials or SFTP.
  Ingestion frequency: daily.
  Agent: CFO agent.

- [ ] **Al Rajhi / Riyad Bank / Saudi Fransi corporate APIs (KSA)** — Saudi commercial
  bank corporate portals.
  Data objects: accounts, transactions, SARIE payment status, payroll.
  Auth: bank API or SFTP-based delivery.
  Ingestion frequency: daily.
  Agent: CFO agent.

- [ ] **Generic SWIFT MT940/MT942 statement ingestion** — bank-agnostic. Any bank that
  delivers statements in SWIFT MT940 (end-of-day) or MT942 (intraday) format via SFTP.
  Data objects: account statements, balance, transactions with structured reference data.
  Auth: SFTP key-based authentication.
  Ingestion frequency: daily or intraday per file delivery schedule.
  Agent: CFO agent.
  Note: MT940/MT942 is a widely supported fallback when bank APIs are unavailable.

### Payment gateway and acquiring connectors

- [ ] **Stripe** — global payment processor.
  Data objects: charges, refunds, disputes, payouts, balance transactions, subscription revenue,
  MRR/ARR from Stripe Billing, failed payment rate, dispute rate.
  Auth: Stripe API key (restricted key with read-only permissions).
  Ingestion frequency: hourly for transactions, daily for summary metrics.
  Agent: CFO agent (revenue, payout timing), Growth Officer agent (MRR trends, churn signals).
  AI responsibility: detect dispute rate spikes, flag payout delays, surface MRR changes.

- [ ] **HyperPay (MENA)** — dominant payment gateway in Saudi Arabia and GCC.
  Data objects: transaction reports, settlement statements, chargeback register, decline reasons.
  Auth: HyperPay merchant API credentials.
  Ingestion frequency: daily settlement, real-time webhook for transaction events.
  Agent: CFO agent (settlement reconciliation), CRO agent (chargeback rate, decline patterns).

- [ ] **PayTabs (GCC/MENA)** — regional payment gateway.
  Data objects: transaction reports, refund status, settlement, fraud flags.
  Auth: PayTabs API credentials.
  Ingestion frequency: daily.
  Agent: CFO agent, CRO agent.

- [ ] **Telr (UAE/GCC)** — UAE-based payment gateway.
  Data objects: transactions, settlements, disputes, refunds.
  Auth: Telr API key.
  Ingestion frequency: daily.
  Agent: CFO agent.

- [ ] **Moyasar (Saudi Arabia)** — Saudi payment gateway.
  Data objects: invoices, payments, refunds, settlements.
  Auth: Moyasar API key.
  Ingestion frequency: daily.
  Agent: CFO agent.

- [ ] **PayFort / Amazon Payment Services (GCC)** — formerly PayFort, now Amazon Payment
  Services. Widely used in GCC.
  Data objects: transaction reports, settlement, chargebacks.
  Auth: PayFort/APS merchant credentials.
  Ingestion frequency: daily.
  Agent: CFO agent.

- [ ] **JazzCash / EasyPaisa (Pakistan)** — mobile money and payment wallets. Primary
  digital payment channels in Pakistan.
  Data objects: transaction reports, merchant settlement, wallet balance, refund status.
  Auth: merchant API credentials.
  Ingestion frequency: daily.
  Agent: CFO agent (settlement), Growth Officer (transaction volume trends).

- [ ] **1LINK / RAAST (Pakistan)** — Pakistan's interbank settlement network and RAAST
  instant payment system.
  Data objects: settlement reports, RAAST transaction confirmations, return/rejection reports.
  Auth: 1LINK member credentials (API or SFTP).
  Ingestion frequency: daily settlement.
  Agent: CFO agent, CRO agent.

- [ ] **Generic acquiring/settlement report ingestion** — bank-agnostic. For acquirers that
  deliver settlement reports as CSV or XLSX via SFTP or email (common in MENA).
  Data objects: settlement date, gross amount, fees, net payout, chargeback count.
  Auth: SFTP or email attachment parsing.
  Ingestion frequency: per settlement cycle (daily or T+1).
  Agent: CFO agent.

### POS and point-of-sale connectors

- [ ] **Square** — widely used in SME and retail.
  Data objects: daily sales summary, item-level sales, refunds, tip reports, employee shifts,
  inventory counts, customer visit frequency.
  Auth: Square OAuth2.
  Ingestion frequency: daily summary, real-time via webhook for high-value transactions.
  Agent: Owner/CEO agent (daily revenue), Ops Manager/COO agent (staff and shift signals).
  AI responsibility: surface daily trading vs prior week, flag unusual refund patterns.

- [ ] **Lightspeed Retail / Lightspeed Restaurant** — popular in GCC hospitality and retail.
  Data objects: daily sales, category breakdown, employee performance, table turns (restaurant),
  inventory depletion, end-of-day reconciliation.
  Auth: Lightspeed OAuth2.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent, Ops Manager agent.

- [ ] **Toast (F&B / Restaurant)** — restaurant management and POS.
  Data objects: covers, table turns, average check, voids and comps, labour cost, food cost %.
  Auth: Toast API.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent, Ops Manager agent.
  Note: food cost % and labour cost % are the two primary profitability signals for F&B.

- [ ] **Oracle MICROS (Hospitality/F&B)** — enterprise hospitality POS.
  Data objects: revenue by outlet, covers, average spend, void/discount report, shift summary.
  Auth: MICROS API or SFTP extract.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent, COO agent.

- [ ] **Revel Systems** — iPad POS for restaurants and retail.
  Data objects: daily sales, product mix, labour, inventory.
  Auth: Revel API.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent.

- [ ] **Foodics (GCC/MENA)** — dominant F&B POS in Saudi Arabia, UAE, and GCC.
  Data objects: branch-level daily sales, item mix, void reports, staff clock-in/out,
  shift summary, customer count, average ticket.
  Auth: Foodics API (partner access).
  Ingestion frequency: daily per branch.
  Agent: Owner/CEO agent, Ops Manager agent.
  Note: Foodics has strong GCC presence — treat as primary POS connector for the market.

- [ ] **Marn (Saudi Arabia)** — Saudi-based F&B management platform.
  Data objects: restaurant performance, sales, menu item analytics.
  Auth: Marn API.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent.

- [ ] **POSist (MENA/South Asia)** — cloud POS for restaurants, popular in Pakistan and GCC.
  Data objects: sales, orders, item performance, discounts, voids.
  Auth: POSist API.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent.

- [ ] **Generic POS export ingestion** — for POS systems without APIs. Many regional POS
  systems support only CSV exports. Ingest end-of-day summary CSVs via SFTP or email
  attachment. Extract: date, total sales, transaction count, refunds, net revenue.
  Auth: SFTP or email parsing.
  Ingestion frequency: daily.
  Agent: Owner/CEO agent.

### Inventory and warehouse management connectors

- [ ] **Cin7 (Omni)** — inventory management for retail and wholesale.
  Data objects: stock on hand, stock movements, purchase orders, sales orders, reorder alerts,
  inventory aging, low-stock flags.
  Auth: Cin7 API key.
  Ingestion frequency: daily.
  Agent: COO/Ops agent (stock levels, reorder), VP Supply Chain agent (purchase orders).

- [ ] **DEAR Systems (now Cin7 Core)** — popular in MENA SME manufacturing and trading.
  Data objects: inventory, purchase orders, production runs, COGS, stock valuation.
  Auth: DEAR API key.
  Ingestion frequency: daily.
  Agent: COO agent, VP Supply Chain agent.

- [ ] **Fishbowl** — manufacturing and warehouse management.
  Data objects: inventory levels, work orders, bill of materials, purchase orders, cycle counts.
  Auth: Fishbowl API.
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent, COO agent.

- [ ] **Odoo Inventory** — widely used open-source ERP with strong MENA adoption.
  Data objects: stock moves, inventory adjustments, purchase orders, delivery orders, lot tracking.
  Auth: Odoo XML-RPC or REST API with API key.
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent, COO agent.

- [ ] **Zoho Inventory** — popular in Pakistan and GCC SME.
  Data objects: items, stock, purchase orders, sales orders, warehouses, shipments.
  Auth: Zoho OAuth2.
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent.

- [ ] **Generic warehouse/inventory CSV ingestion** — for systems with export-only capability.
  Ingest daily stock-on-hand reports, purchase order logs, and goods-received notes as CSV.
  Auth: SFTP or email.
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent.

### Regulatory and compliance portal connectors

- [ ] **SBP PRISM (Pakistan)** — State Bank of Pakistan's regulatory reporting system.
  Data objects: scheduled submission dates, submission status (filed/pending/overdue),
  acknowledgement receipts, query letters from SBP.
  Auth: SBP PRISM portal credentials (scrape-based until API is available).
  Ingestion frequency: weekly check.
  Agent: CCO agent (submission calendar), CRO agent (overdue flag).
  AI responsibility: flag any overdue submissions immediately to CCO and CRO dashboards.

- [ ] **SECP Company Registry (Pakistan)** — Securities and Exchange Commission of Pakistan.
  Data objects: company registration status, annual return filing status, director changes,
  beneficial ownership filings.
  Auth: SECP eServices portal credentials.
  Ingestion frequency: monthly check.
  Agent: CCO agent, General Counsel agent.

- [ ] **SAMA iThraa (Saudi Arabia)** — SAMA's regulatory reporting portal.
  Data objects: submission status, regulatory circulars relevant to the company,
  outstanding correspondence.
  Auth: iThraa portal credentials.
  Ingestion frequency: weekly.
  Agent: CCO agent, CRO agent.

- [ ] **CBUAE Regulatory Reporting Portal** — Central Bank of UAE supervision portal.
  Data objects: return submission status, outstanding submissions, examination status.
  Auth: CBUAE portal credentials.
  Ingestion frequency: weekly.
  Agent: CCO agent.

- [ ] **Qatar Financial Centre (QFC) Regulatory Portal** — for QFC-licensed entities.
  Data objects: licence status, annual filing status, compliance calendar.
  Auth: QFC portal credentials.
  Ingestion frequency: monthly.
  Agent: CCO agent.

- [ ] **DFSA (Dubai Financial Services Authority) portal** — for DIFC-licensed entities.
  Data objects: reporting obligations, submission status, regulatory updates.
  Auth: DFSA portal credentials.
  Ingestion frequency: weekly.
  Agent: CCO agent.

- [ ] **FIA (Financial Intelligence Authority, Pakistan)** — AML/CTF reporting portal.
  Data objects: STR (Suspicious Transaction Report) filing status, upcoming reporting deadlines,
  circulars and guidance notes.
  Auth: FIA portal credentials.
  Ingestion frequency: weekly.
  Agent: CRO agent, CCO agent.
  AI responsibility: flag any overdue STR submissions as high-priority risk signal.

- [ ] **FATF/MENAFATF compliance tracker** — monitor FATF/MENAFATF grey list status for
  relevant jurisdictions. For companies operating in Pakistan (FATF grey list period) or
  other monitored jurisdictions, this affects counterparty risk and compliance posture.
  Data objects: jurisdiction status, published recommendations, action plan progress.
  Auth: public web data (no API — schedule a scrape of public FATF reports).
  Ingestion frequency: monthly.
  Agent: CRO agent.

- [ ] **ISO certification registry** — track ISO 27001, ISO 9001, PCI-DSS certification
  status and renewal dates.
  Data objects: certification status, expiry date, last audit date, next audit date.
  Auth: manual entry or certification body portal where API available.
  Ingestion frequency: monthly.
  Agent: CCO agent, CTO agent (for ISO 27001).

### Property and facilities management connectors

- [ ] **Yardi Voyager** — property management for real estate portfolios.
  Data objects: occupancy rate, rent roll, lease expiry calendar, maintenance requests,
  NOI (net operating income) by property, arrears.
  Auth: Yardi API or scheduled report export via SFTP.
  Ingestion frequency: daily for occupancy/arrears, monthly for NOI.
  Agent: Project Director agent (property), CFO agent (NOI signals).

- [ ] **MRI Software** — commercial real estate and property management.
  Data objects: portfolio summary, lease status, rent collection, maintenance costs, NOI.
  Auth: MRI API or report export.
  Ingestion frequency: daily for collections, monthly for portfolio summary.
  Agent: Project Director agent, CFO agent.

- [ ] **Arthur Online** — property management popular in GCC and UK.
  Data objects: tenancy status, rent due/received, maintenance jobs, inspection reports.
  Auth: Arthur API.
  Ingestion frequency: daily.
  Agent: Project Director agent.

- [ ] **Maximo (IBM)** — facilities and asset management used in large enterprises and
  government-linked companies in GCC.
  Data objects: work orders, asset health, preventive maintenance schedule, downtime events.
  Auth: Maximo API or CSV export.
  Ingestion frequency: daily.
  Agent: COO agent, VP Supply Chain agent (for asset-heavy businesses).

- [ ] **Generic lease/tenancy register ingestion** — for companies managing properties
  without a dedicated PMS. Ingest lease register as XLSX (tenant, unit, start, expiry,
  rent, status). Flag leases expiring within 90 days.
  Auth: manual upload.
  Ingestion frequency: monthly or on upload.
  Agent: Project Director agent, CFO agent.

### Telecoms and connectivity infrastructure connectors

- [ ] **Zong / Jazz / Telenor / Ufone (Pakistan telecom APIs)** — for companies with
  telecoms-dependent operations (mobile money, USSD services, bulk SMS, telco partnerships).
  Data objects: API usage reports, transaction volumes, service uptime/downtime logs,
  subscriber data (aggregate only), bulk SMS delivery reports.
  Auth: telco partner API credentials.
  Ingestion frequency: daily.
  Agent: CTO agent (service reliability), Growth Officer agent (SMS campaign performance).

- [ ] **Etisalat/Stc/Ooredoo/Mobily (GCC telecom APIs)** — GCC telco partner integrations.
  Data objects: same as Pakistan telecoms above, adapted for GCC operators.
  Auth: telco partner API credentials.
  Ingestion frequency: daily.
  Agent: CTO agent.

- [ ] **Generic uptime/SLA monitoring ingestion** — Pingdom, UptimeRobot, or custom
  monitoring exports. Ingest uptime percentage, incident log, SLA adherence.
  Auth: monitoring tool API key.
  Ingestion frequency: daily.
  Agent: CTO agent (reliability signals), COO agent (SLA breach risk).

### Logistics and delivery connectors

- [ ] **Aramex** — dominant logistics provider in GCC and Pakistan.
  Data objects: shipment tracking, delivery success rate, failed delivery report,
  return rate, transit time vs SLA.
  Auth: Aramex API credentials (merchant account).
  Ingestion frequency: daily summary, real-time webhook on delivery events.
  Agent: VP Supply Chain agent, COO agent.

- [ ] **DHL Express** — international logistics.
  Data objects: shipment status, transit time, customs clearance status, delivery exceptions.
  Auth: DHL Express API (MyDHL+ credentials).
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent.

- [ ] **Trukkin / Fetchr / Quiqup (MENA last-mile)** — regional last-mile delivery platforms.
  Data objects: order status, delivery success rate, failed delivery reasons, COD collection.
  Auth: platform API credentials.
  Ingestion frequency: daily.
  Agent: COO agent, VP Supply Chain agent.

- [ ] **TCS / Leopards / M&P Couriers (Pakistan)** — major Pakistan courier services.
  Data objects: shipment tracking, delivery rate, return rate, transit time.
  Auth: courier API credentials.
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent, COO agent.

- [ ] **Generic courier/logistics report ingestion** — for couriers without APIs. Ingest
  daily delivery performance CSV (shipments sent, delivered, failed, returned, COD collected).
  Auth: SFTP or email.
  Ingestion frequency: daily.
  Agent: VP Supply Chain agent.

### HR and payroll infrastructure connectors

- [ ] **WPS (Wage Protection System, UAE/GCC)** — UAE Ministry of Human Resources WPS
  portal. Mandatory for UAE-registered businesses to process salaries.
  Data objects: payroll submission status, compliance status, wage protection certificate,
  outstanding submissions, employee count for WPS.
  Auth: WPS portal credentials (MOHRE).
  Ingestion frequency: monthly (aligned to payroll cycle).
  Agent: CHRO agent (payroll compliance), CCO agent (WPS compliance status).
  AI responsibility: flag any WPS non-compliance immediately — UAE companies can be fined
  or blacklisted for WPS failures.

- [ ] **GOSI (General Organisation for Social Insurance, Saudi Arabia)** — Saudi social
  insurance portal for employee contributions.
  Data objects: contribution status, outstanding payments, employee registration status,
  monthly contribution summary.
  Auth: GOSI portal credentials.
  Ingestion frequency: monthly.
  Agent: CHRO agent, CCO agent.

- [ ] **EOBI (Employees Old-Age Benefits Institution, Pakistan)** — Pakistan pension and
  social security portal.
  Data objects: contribution status, compliance certificate, outstanding payments.
  Auth: EOBI portal credentials.
  Ingestion frequency: monthly.
  Agent: CHRO agent, CCO agent.

- [ ] **PESSI / SESSI (Pakistan provincial social security)** — Punjab and Sindh social
  security portals.
  Data objects: contribution status, compliance status.
  Auth: provincial portal credentials.
  Ingestion frequency: monthly.
  Agent: CHRO agent.

- [ ] **Muqeem (Saudi Arabia iqama/visa management)** — Saudi Ministry of Interior portal
  for employee iqama (residency permit) status management.
  Data objects: iqama expiry dates by employee, visa status, work permit renewals due.
  Auth: Muqeem portal credentials.
  Ingestion frequency: weekly check for expiry alerts.
  Agent: CHRO agent (iqama expiry risk), COO agent (staff availability risk if iqamas lapse).
  Note: expired iqamas are a genuine operational and legal risk in KSA — surfacing 90/60/30
  day warnings is a high-value signal for any GCC employer.

- [ ] **MOHRE (UAE Ministry of Human Resources) — labour contract portal**.
  Data objects: employee labour contract status, visa status, work permit expiry.
  Auth: MOHRE portal credentials.
  Ingestion frequency: weekly.
  Agent: CHRO agent, CCO agent.

- [ ] **Generic payroll report ingestion** — for companies using local payroll software
  without API. Ingest monthly payroll summary as XLSX: headcount, gross salary, deductions,
  net pay, variance vs prior month.
  Auth: manual upload or SFTP.
  Ingestion frequency: monthly.
  Agent: CHRO agent, CFO agent.

### Construction and project management connectors

- [ ] **Procore** — construction project management platform.
  Data objects: project schedule status, RFIs (requests for information), submittals,
  daily logs, punch list, budget vs actual, change orders, subcontractor compliance.
  Auth: Procore OAuth2.
  Ingestion frequency: daily.
  Agent: Project Director agent (schedule and cost), CRO agent (project risk register).

- [ ] **Aconex (Oracle)** — construction document management used in large GCC projects.
  Data objects: document register, correspondence log, RFI status, submittal log,
  non-conformance reports.
  Auth: Aconex API.
  Ingestion frequency: daily.
  Agent: Project Director agent.

- [ ] **Primavera P6 (Oracle)** — project scheduling for large-scale construction.
  Data objects: schedule baseline vs actual, critical path activities, float consumption,
  milestone status, resource loading.
  Auth: P6 EPPM API or scheduled export via SFTP.
  Ingestion frequency: weekly schedule update.
  Agent: Project Director agent, CFO agent (cost variance).

- [ ] **MS Project export ingestion** — Microsoft Project is widely used in GCC construction.
  Data objects: task status, milestones, baseline vs actual dates, resource assignments.
  Auth: manual upload of .mpp or exported XLSX/CSV.
  Ingestion frequency: weekly on upload.
  Agent: Project Director agent.

- [ ] **Buildertrend** — popular for residential construction and developer projects.
  Data objects: project schedule, budget, lead tracking, change orders, daily logs.
  Auth: Buildertrend API.
  Ingestion frequency: daily.
  Agent: Project Director agent.

### Accounting and GL data at raw level

- [ ] **QuickBooks Online — raw GL data** — beyond the standard QBO connector.
  Data objects at GL level: trial balance by account, aged receivables by customer,
  aged payables by vendor, bank reconciliation status, P&L by department, cash flow statement.
  Auth: QBO OAuth2 with accounting scope.
  Ingestion frequency: daily for AR/AP aging, monthly for TB and P&L.
  Agent: CFO agent (full financial picture), COO agent (AR collection risk).

- [ ] **Xero — raw GL data** — beyond the standard Xero connector.
  Data objects: trial balance, AR aging, AP aging, bank reconciliation, expense claims status.
  Auth: Xero OAuth2.
  Ingestion frequency: daily for AR/AP, monthly for TB.
  Agent: CFO agent.

- [ ] **Zoho Books** — popular in Pakistan and GCC SME.
  Data objects: invoices, bills, AR/AP aging, bank accounts, trial balance.
  Auth: Zoho OAuth2.
  Ingestion frequency: daily.
  Agent: CFO agent.

- [ ] **FreshBooks** — SME accounting popular with professional services.
  Data objects: invoices, payments received, outstanding invoices, expense reports, time
  tracked (for billing).
  Auth: FreshBooks OAuth2.
  Ingestion frequency: daily.
  Agent: CFO agent, Managing Partner agent (for professional_practice archetype).

- [ ] **Tally (ERP/accounting, South Asia)** — dominant accounting software in Pakistan
  and India. API access is limited — use Tally ODBC connector or XML export.
  Data objects: trial balance, ledger balances, voucher entries, stock summary.
  Auth: Tally XML/ODBC extraction (requires Tally Prime with network mode enabled).
  Ingestion frequency: daily via scheduled export.
  Agent: CFO agent.
  Note: Tally has extremely high adoption in Pakistan SME and enterprise. Treat as a
  priority connector for the Pakistan market alongside QuickBooks and Xero.

### Tax and VAT compliance connectors

- [ ] **FBR (Federal Board of Revenue, Pakistan) — IRIS portal** — Pakistan tax authority.
  Data objects: VAT return filing status, income tax return status, withholding tax
  submissions, tax payment receipts, outstanding notices.
  Auth: FBR IRIS portal credentials.
  Ingestion frequency: monthly (aligned to filing cycle).
  Agent: CCO agent (filing compliance), CFO agent (tax payment status).
  AI responsibility: flag any overdue filings or outstanding notices immediately.

- [ ] **ZATCA (Zakat, Tax and Customs Authority, Saudi Arabia) — Fatoora e-invoicing** —
  Saudi e-invoicing compliance portal.
  Data objects: e-invoice submission status, compliance status, Fatoora UUID register,
  rejected invoices, ZATCA clearance status.
  Auth: ZATCA API credentials.
  Ingestion frequency: real-time for invoice clearance, daily for summary.
  Agent: CCO agent, CFO agent.
  Note: ZATCA Fatoora Phase 2 is mandatory for large Saudi taxpayers. Non-compliance
  carries significant penalties — surface any rejection or clearance failure immediately.

- [ ] **FTA (Federal Tax Authority, UAE) — EmaraTax portal** — UAE VAT compliance.
  Data objects: VAT return status, pending submissions, payment status, tax agent access log.
  Auth: EmaraTax portal credentials.
  Ingestion frequency: quarterly (VAT cycle) with monthly check for outstanding items.
  Agent: CCO agent, CFO agent.

- [ ] **GRA (General Revenue Authority, Qatar)** — Qatar tax compliance.
  Data objects: tax return status, filing calendar, outstanding payments.
  Auth: GRA portal credentials.
  Ingestion frequency: monthly.
  Agent: CCO agent.

### Connector infrastructure — shared across all Phase 10B connectors

- [ ] Define a `ConnectorInstance` model: each installed connector has an instance record
  with: connectorType, instanceName (user-defined label), credentials (encrypted),
  lastSyncAt, syncStatus, errorLog, sensitivityPolicy, targetAgents, ingestionFrequency,
  and a `dataObjects` array describing exactly what was pulled in the last sync.
- [ ] Each connector instance produces structured `EvidenceRecord` entries tagged with:
  sourceType (from the extended registry), connectorInstanceId, department, sensitivity,
  and a human-readable label ("HyperPay Settlement — 30 May 2026").
- [ ] Connector health dashboard in Settings: shows each instance with last sync time,
  record count ingested, any errors, and a manual "sync now" trigger.
- [ ] Connector-level sensitivity policy: admin can set maximum sensitivity for a connector.
  Example: SWIFT statement connector defaults to confidential. POS connector defaults to
  internal. Admin can lower but not raise above the system default.
- [ ] SFTP credential vault: for connectors that use SFTP, store host, port, username,
  and encrypted private key. Auto-retry on connection failure with exponential backoff.
- [ ] Email attachment parser: for connectors that deliver data via email (common in GCC
  banks and local couriers). Monitor a dedicated inbox, parse attachments matching known
  file patterns, route to the appropriate connector ingestion handler.
- [ ] Credentials are encrypted at rest using the existing `lib/crypto.ts` encrypt/decrypt
  functions. Never log credentials. Display only masked versions in the UI.
- [ ] AI responsibility: each connector's AI policy is defined at the connector level —
  read-only ingestion for all Phase 10B connectors. No writebacks, no actions in source
  systems. The AI normalises, extracts signals, and surfaces them to the relevant agent.
  Humans review before any recommendation is acted on.

---

## Phase 11 — Social, Market, and External Signal Connectors

> Build priority within Phase 11: Meta/Instagram first (largest ad spend and brand signal for
> D2C and digital-native companies), LinkedIn second (B2B companies), TikTok third (younger
> D2C brands), then social listening and competitor intelligence.
> Safety policy for all connectors in this phase: read-only analytics, no autonomous posting,
> no outbound social actions of any kind. Brand risk signals route to approval queue.

### Organic social media connectors
- [ ] **Meta / Facebook Pages** — Graph API OAuth2. Page insights: reach, engagement, follower
  growth, post performance, audience demographics, page rating and reviews.
  Sensitivity: internal. Agent: Brand/Community agent.
- [ ] **Instagram Business** — Meta Graph API (same OAuth flow as Facebook Pages). Feed
  performance, Reels performance, Story reach, follower growth, audience demographics,
  shop performance if applicable.
- [ ] **LinkedIn Company Page** — LinkedIn Marketing API OAuth2. Follower growth, post
  impressions, engagement rate, follower demographics, company page views.
  Sensitivity: internal. Agent: Brand/Community agent, CBO agent.
- [ ] **TikTok Business** — TikTok for Business API. Video views, follower growth, engagement
  rate, trending content signals. Sensitivity: internal. Agent: Brand/Community agent.
- [ ] **YouTube Studio** — YouTube Data API OAuth2. Channel performance, video views,
  watch time, subscriber growth, top performing content.
- [ ] **X / Twitter** — X API v2. Tweet impressions, follower count, engagement rate,
  mention monitoring (brand mentions in replies and quotes). Sensitivity: internal.
- [ ] **Reddit** — Reddit API. Subreddit monitoring for brand mentions and sentiment.
  Useful for consumer tech and D2C brands. Read-only. Sensitivity: internal.

### Competitor and market intelligence
- [ ] **Google Alerts ingestion** — monitor Google Alerts (via RSS feed) for competitor names,
  industry keywords, and executive name mentions. Ingest alert items as evidence with
  sourceType=market_intelligence. Department=Strategy. Agent: CBO agent, CEO agent.
- [ ] **News API / RSS monitoring** — integrate a news aggregator (NewsAPI.org or custom RSS)
  to monitor configured keywords: competitor names, regulatory announcements, market events.
  Ingest as market_intelligence evidence. Flag regulatory news to CRO agent automatically.
- [ ] **SimilarWeb / public traffic estimates** — for digital companies, public web traffic
  estimates for competitors provide market share signals. Read from SimilarWeb API or
  similar public data source. Department=Strategy. Agent: CBO agent.
- [ ] **G2 / Trustpilot / Capterra reviews** — for SaaS and service companies, competitor
  review aggregates provide product positioning signals. Monitor for both own brand and
  key competitors. Department=Marketing. Agent: Brand/Community agent, CPO agent.
- [ ] **LinkedIn job postings monitor** — track competitor job postings to detect hiring
  signals (expansion into new markets, building new capabilities). Public data via LinkedIn
  search or a job data API. Department=Strategy. Agent: CBO agent.

### Social listening
- [ ] **Brand mention monitoring** — aggregate brand mentions across Twitter/X, Reddit,
  LinkedIn, news articles, and review sites into a single Brand Signals feed.
  Cluster by: positive sentiment, negative sentiment, product feedback, regulatory mention,
  competitor comparison. Surface weekly to Brand/Community agent and CMO agent.
- [ ] **Executive reputation monitoring** — for the CEO and key executives, monitor public
  mentions. Flag anything that could constitute a reputational risk. Route to CEO agent
  and CRO agent with approval_required policy before any action is taken.
- [ ] **Social connector safety policy** — no autonomous posting, no retweets, no engagement
  actions of any kind. All social connectors are read-only ingest. Any draft response to
  social content requires explicit human approval. This applies permanently, not just V1.

---

## Phase 11B — Language Support (Arabic and Urdu)

> Required for GCC and Pakistan market scale. English is sufficient for pilots but Arabic
> and Urdu support will be expected by clients as the product grows in these markets.
> Phase 1: detection and formatting. Phase 2: full UI translation. Phase 3: native-language briefs.

### Phase 1 — Detection and formatting (build alongside Phase 9B mobile work)
- [ ] Detect user interface language preference from browser/WhatsApp settings.
  Store `interfaceLanguage` on user profile: `en` (default), `ar`, `ur`.
- [ ] RTL layout support for Arabic: the dashboard, onboarding, and settings pages should
  render correctly when `dir="rtl"` is applied. Test all UI components for RTL text flow.
  Arabic users should not see broken layouts from English-centric left-aligned components.
- [ ] WhatsApp message formatting for RTL: Arabic-language WhatsApp responses should use
  plain text (no markdown that breaks in RTL), short sentences, and numbers in Western
  Arabic numerals (0-9) which are standard in business Arabic, not Eastern Arabic numerals.

### Phase 2 — UI translation
- [ ] Implement i18n framework (next-intl or similar) across the Next.js app.
  Extract all UI strings to locale files: `en.json`, `ar.json`, `ur.json`.
  Priority: onboarding wizard, dashboard labels, Settings, navigation labels.
- [ ] Arabic UI translation: professional business Arabic, not machine translation.
  Key terms: Dashboard = لوحة التحكم, Evidence = الأدلة, Risk = المخاطر, Recommendation = التوصية.
  All translated by a native Arabic business professional, not a translation API.
- [ ] Urdu UI translation: similarly professional. Key terms for Pakistani business context.
  Priority is lower than Arabic given most Pakistan enterprise users work in English.

### Phase 3 — Native-language brief generation
- [ ] Arabic dashboard briefs: when user's `interfaceLanguage` is `ar` and the LLM supports
  Arabic output (Claude and GPT-4 do), generate agent briefs in Arabic. Validate output
  quality with a native Arabic reader before enabling for clients.
- [ ] Urdu brief generation: same approach for Urdu. Claude supports Urdu output but quality
  should be validated with a native Urdu reader.
- [ ] Arabic WhatsApp responses: generate WhatsApp briefs in Arabic for Arabic-language users.
  Arabic business writing is formal — the LLM prompt should specify formal Modern Standard
  Arabic (MSA), not dialectal Arabic.
- [ ] Bilingual brief option: for users who work in English but present to Arabic-speaking
  boards, offer a "bilingual brief" — English summary with Arabic executive headline.

---

## Phase 12 — Company Memory / Second Brain

### V1.1 Tier 3 — U9 Learning Loop and Improvement Reporting
- [ ] Use captured U4 learning signals to identify recurring accepted reasoning patterns,
  recurring edits, recurring rejection reasons, and workspace-specific phrasing preferences.
- [ ] Generate workflow-level improvement reports for sponsors: acceptance rate trend, rework
  trend, evidence coverage trend, and time-to-review trend. Report at workflow level, never as
  surveillance of named individuals.
- [ ] Add agent improvement recommendations: prompt change candidate, evidence gap, policy rule
  gap, or user-training gap. Human approves any prompt or policy change before it affects outputs.
- [ ] Add learning loop safeguards: do not tune from fewer than a minimum number of reviewed
  outputs; separate regulated/high-risk feedback from general workspace feedback; retain the
  original signal and reason for audit.
- [ ] Acceptance test: over a defined period, acceptance rate rises or rework falls measurably,
  and the trend is visible to the sponsor.
- [ ] AI responsibility note: improvement is reported at workflow level and used to improve
  NexusAI outputs, not to profile or rank individual staff.

### Core company-memory graph
- [x] Define Nexus company-memory model: Evidence, Entity, Decision, Recommendation, Risk, KPI, Project, Person, Department, System, Process, and Meeting
- [x] Add initial evidence-to-entity backlinks through `evidence_entity_links`
- [ ] Add backlinks between entities, decisions, recommendations, owners, risks, and KPIs
- [ ] Add entity pages that show timeline, linked evidence, decisions, open risks, and recommendations
- [ ] Add "What changed since last week?" memory diff view
- [ ] Add recurring-memory detection for risks, blockers, customers, projects, and strategic themes
- [ ] Add provenance-preserving summarization for entity pages
- [ ] Add AI responsibility notes: AI proposes links/entities/memory updates, humans approve canonical memory for high-impact records
- [ ] Add memory confidence scoring: inferred, supported, confirmed, stale, contradicted
- [ ] Add Markdown/Obsidian-compatible export for company memory notes
- [ ] Add optional Markdown/Obsidian import path for existing company vaults
- [ ] Add frontmatter schema for exported notes so company memory remains portable

---

## Phase 13 — Hybrid Cloud + Local Edge Client

- [ ] Define hybrid deployment modes: Cloud SaaS, Private Cloud/VPC, Local Edge Client, and Full On-Prem Appliance
- [ ] Add local edge client architecture for sensitive documents that should not leave the customer environment
- [ ] Define what stays local: original files, raw extracted text, embeddings if required, local audit logs, and restricted evidence
- [ ] Define what can sync to cloud: redacted summaries, metadata, evidence hashes, approved insights, aggregate dashboards, and non-sensitive recommendations
- [ ] Add customer policy controls for cloud-allowed, local-only, restricted, and do-not-process data classes
- [ ] Add local ingestion worker that watches approved folders and processes PDFs/DOCX/PPTX/XLSX/Slack/Teams exports locally
- [ ] Add local LLM processing option for extraction cleanup, classification, entity detection, and first-pass summarization
- [ ] Add model/provider options for local processing: Apple Silicon llama.cpp, Ollama, LM Studio, vLLM on GPU server, or customer-approved internal model endpoint
- [ ] Evaluate Mac Studio appliance package for regulated clients: managed device, encrypted storage, local LLM, local vector index, VPN/tunnel, remote monitoring, and update channel
- [ ] Add secure sync protocol from local client to Nexus cloud with signed payloads, tenant-scoped keys, retry queue, and audit receipts
- [ ] Add admin UI showing local client health: online/offline, last sync, queue depth, model version, ingestion throughput, and failed jobs
- [ ] Add installer/update path for local client: macOS app, Docker Compose, or lightweight CLI service
- [ ] Add "never upload originals" customer mode where cloud dashboards only receive approved summaries and provenance hashes
- [ ] Add disaster-recovery and key-rotation process for local/on-prem customers
- [ ] Add pricing/package decision for local appliance: software-only, managed Mac Studio, or customer-owned hardware
- [ ] Add AI responsibility notes: local AI processes restricted files inside customer boundary, cloud AI only sees permitted summaries/metadata
- [ ] Add local-vs-cloud model policy per sensitivity class and per connector

---

## Phase 14 — Contextual Company Agents (Autonomous Task Execution)

> Reconciliation with Phase 7A: Phase 7A defines the role-based agent system — which agents
> exist, their mandates, evidence scopes, and brief-generation behaviour. Those are read-only
> synthesis agents. Phase 14 upgrades selected agents to autonomous task execution: they can
> draft, prepare work packets, and take approval-gated actions across connectors and channels.
> Phase 14 depends on Phase 12 (company memory) and Phase 10 (connectors) being in place.
>
> n8n architecture decision: n8n (self-hosted workflow orchestration, 400+ native connectors)
> is the leading candidate for the workflow runner substrate in this phase. The pattern it handles
> natively — trigger → condition → tool call → approval checkpoint → branch → output — is exactly
> what agent-to-agent orchestration requires. Evaluate n8n vs. custom Node.js workflow runner
> at the start of Phase 14. If n8n is selected, it also becomes the connector substrate for
> Phase 10 integrations, potentially replacing much of the custom OAuth connector code.
> Decision gate: when Phase 14 scoping begins, run a 1-day spike on n8n to validate it can
> enforce the Agent Control Profile constraints from Phase 7D before committing.
>
> The Hermes/OpenClaw architecture study tasks are retained here because Phase 14 is where
> we implement the workflow runner — not Phase 7A which is brief generation only.

- [ ] Design Nexus agent workflow primitives: trigger, context pack, plan, tool call,
  approval checkpoint, memory write, audit event, and handoff. Distinct from Phase 7A
  brief generation — these are multi-step task workflows, not single LLM calls.
- [ ] Build a prototype workflow runner: trigger → evidence retrieval → plan → tool calls
  (with approval checkpoints) → output → audit log. Start with one agent (Chief of Staff)
  as the prototype. No vendored code until Hermes/OpenClaw license review is complete.
- [ ] Add agent "souls" to the full role set from Phase 7A: stable voice, working style,
  memory, priorities, and escalation threshold per agent. Souls are company-context grounded —
  the CFO agent at a fintech has a different voice from the CFO agent at a consulting firm.
- [ ] Add skill registry: read documents, summarise, search memory, draft memo, create task,
  send Slack update, send WhatsApp update (Phase 9B), prepare approval packet.
  Each skill has a permission manifest: allowed tools, allowed data classes, approval required.
- [ ] Add agent task runner for: evidence review, brief drafting, risk watch, recommendation
  follow-up, decision tracking, and owner nudges. All nudges require human approval before
  external delivery.
- [ ] Study Hermes codebase architecture: agent loop, memory model, tool routing, workflow
  execution, sandbox settings, skill loading, failure recovery. Document findings.
- [ ] Study OpenClaw codebase architecture: gateway/session model, channels, skills,
  permissions, sandbox mode, audit/logging, WhatsApp/Slack/Discord routing. Document findings.
- [ ] Write Nexus agent-workflow architecture memo comparing Hermes, OpenClaw, and Nexus
  requirements. Decide on: build vs. adapt vs. vendor, sandbox boundaries, approval model.
- [ ] Add Hermes/OpenClaw runtime adapter once licensing and sandbox boundaries are resolved.
- [ ] Add agent memory journal: what each agent learned, why its confidence changed, which
  evidence caused the change. Visible to admins. Not visible to the agent's role users by
  default — only surfaced when the agent explains its reasoning.
- [ ] Add agent activity feed for executives: current agent tasks, blocked items, recent
  findings, recommended next actions. Replaces the static dashboard card in long-running
  multi-step workflows.
- [ ] Add agent permission tiers: observer (read evidence only), analyst (can search and
  summarise), drafter (can create drafts for approval), operator-with-approval (can take
  connector actions after explicit human sign-off), blocked (no access).
- [ ] Add human approval boundary enforcement: any agent action that leaves the NexusAI
  platform (sends a message, creates a record in an external system, triggers a payment)
  requires explicit approval from a human with the appropriate permission tier.
- [ ] Add agent handoff protocol: when a task is handed from the NexusAI workflow runner to
  an external system (Codex, Hermes, OpenClaw), the handoff includes a context pack with
  task description, evidence refs, approval status, and the Nexus audit trail ID.
- [ ] Design Nexus agent workflow primitives: trigger, context pack, plan, tool call, approval checkpoint, memory write, audit event, and handoff
- [ ] Build a prototype workflow runner inspired by Hermes/OpenClaw patterns without vendoring code until license review is complete
- [ ] Add Hermes/OpenClaw runtime adapter once licensing and sandbox boundaries are reviewed
- [ ] Add skill permission manifest per agent: allowed tools, allowed data classes, allowed connectors, and approval-required actions
- [ ] Add human approval boundary for all external actions and high-impact recommendations
- [ ] Add agent memory journal: what the agent learned, why it changed confidence, and which evidence caused the change
- [ ] Add agent handoff protocol so Codex/Hermes/OpenClaw-style agents can work inside one Nexus workspace without losing context
- [ ] Add agent activity feed for CXOs: current tasks, blocked items, recent findings, and recommended next actions
- [ ] Add company-specific agent creation flow during onboarding after role selection
- [ ] Add AI responsibility notes: agents can monitor, draft, classify, summarize, and prepare work packets; high-impact actions require human approval
- [ ] Add agent permission tiers: observer, analyst, drafter, operator-with-approval, blocked

---

## Phase 15 — Obsidian-Inspired Experience

- [ ] Add graph view of company memory: entities, evidence, decisions, risks, recommendations, owners, and departments
- [ ] Add canvas view for strategy maps, operating models, risk maps, project maps, and decision trees
- [ ] Add bidirectional links in UI so every insight can jump to source evidence and related entities
- [ ] Add note-style entity pages with backlinks, tags, frontmatter metadata, and source panels
- [ ] Add saved views: CEO map, COO execution map, Risk radar map, Strategy growth map, Technology/data map
- [ ] Add visual clustering by sector, department, sensitivity, freshness, and confidence
- [ ] Add "open in vault/export to vault" action for Obsidian-compatible markdown bundles
- [ ] Add keyboard-first navigation and command palette for power users
- [ ] Add graph/canvas permissions so restricted evidence is hidden or masked for unauthorized users
- [ ] Add AI responsibility notes: AI suggests graph links, clusters, canvases, and narrative paths; users choose what becomes visible or canonical
