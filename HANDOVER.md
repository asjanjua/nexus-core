# HANDOVER.md -- NexusAI Live Session State

> This file is the memory of the NexusAI relay team. Update it at the end of every meaningful work session.

---

## Session Info

- **Last updated:** 2026-06-13 (v0.23.0 -- Company Memory + Slack connector ingestion shipped)
- **Last model:** Codex
- **Session number:** #23
- **Current version:** 0.23.0 -- Phases 1-8 + 9D complete. V1.1 Tier 1 (U1-U4) complete. Billing Tiers (v0.20.0-v0.21.0), Orchestration Dispatcher (v0.22.0), Company Memory UI, and first Slack connector data flow complete.
- **Last commit:** `b406bf7` -- `v0.23.0 - Company Memory and Slack ingestion`
- **Remote status:** v0.23.0 pushed to `origin/main`. Render auto-deploy expected from GitHub main.
- **Production DB:** migrations 0001-0024 applied to Neon/production database on 2026-06-13.
- **Local verification (2026-06-13):** `npm run build --workspace @nexus/mission-control` passed. `npm test --workspace @nexus/mission-control` passed: 28 test files / 179 tests.

---

## Verified Codebase State (2026-06-10 Audit)

### Confirmed Built and Wired

- **180+ source files, 24 DB migrations, 28 test files / 179 tests**
- Phase 8A Decision Twin: `decisions` + `actions` tables, full CRUD APIs, interactive `/decisions` page with priority badges, status tabs, inline actions, blocker flags. Manual entry works.
- Decision auto-extraction: `/api/decisions/extract` reads recent `agent_outputs`, proposes decision/action drafts, and creates canonical decision/action records only after human click-through.
- U2 Agent Control Profiles: passports with versioning, evidence filtering, output gates, hard-stop blocking, tool guards, suspend/resume. Settings Agent Governance UI complete.
- U3 Agent Outputs: `agent_outputs` table, rollback API, searchable Agent Output Log in Settings.
- U4 Learning Signals: `learning_signals` table, approve/edit/reject/thumbs per output, summary endpoint, Agent Output Log UI integration. 12 dedicated tests.
- Dashboard agents save outputs and run through Agent Control Profile gates before evidence enters model context.
- Ask has two-tier retrieval (pgvector + keyword), passport filtering, output gating, evidence denial audit.
- Persistent Ask memory: migration `0018_ask_conversation_memory.sql`, DB-backed `ask_conversation_messages`, `GET/DELETE /api/ask`, recent-history prompt injection.
- Demo packs: 3 sector packs rewritten to CEO-grade standard with pre-tuned suggestedQuestions.
- P2 AI trust layer: eval harness (30 cases), prompt registry, red-team output checks, workspace AI policy controls.
- Entity extraction: processed evidence extracts people/organizations/risks/KPIs/amounts/dates/systems/processes into `entities` + `evidence_entity_links`, exposed via `GET /api/entities`.
- Workflow twin primitives: `workflow_twins` + `workflow_twin_runs` tables, `GET/POST /api/workflow-twins`, run APIs.
- Scheduled synthesis: `synthesis_schedules` table, per-workspace cron config, Settings UI, protected `POST /api/cron/synthesis`.
- Billing Tiers (v0.20.0): `plan_definitions` table, per-workspace token budgets, feature flags (8), `ask()` budget gate, 5-min in-process cache, cron monthly reset, Plan & Usage Settings tab.
- Stripe integration (v0.21.0): pure-fetch client (no SDK), Checkout Session, Billing Portal, HMAC-SHA256 webhook (5 event types: checkout, subscription updated/deleted, invoice paid/failed), trial-to-free cron conversion.
- Orchestration Dispatcher (v0.22.0): `dispatch_jobs` DB queue, atomic claim with `FOR UPDATE SKIP LOCKED`, priority 1-10, exponential backoff retry (30s/5m/30m), fan-out enqueue, 4 job type handlers, `POST/GET/DELETE /api/dispatch`, cron runner at `/api/cron/dispatch`.
- Company Memory UI (v0.23.0): `/entities`, `/entities/[id]`, `GET /api/entities/[id]`, entity timeline, linked evidence, decisions, recommendations, and actions.
- Slack connector data flow (v0.23.0): Slack channel messages can ingest as governed evidence when channel allowlist/explicit ingest-all is enabled. DMs, bot/system subtypes, unsupported events, and non-allowlisted channels are skipped and audited.

### Confirmed Missing

- **Connector admin UX:** Slack ingestion works in code, but Settings still needs channel selection, sync status, and source-level sensitivity controls.
- **Additional connector data flows:** Google Drive, Teams, SharePoint, Jira, GitHub, CRM, finance, and social connectors are not yet ingesting live data.
- **Workflow Twin Scorer:** roadmap/spec exists, code not started.

### Architecture Note

The codebase now has both **agent governance** (who can do what, under what limits) and **agent orchestration** (how jobs are queued, claimed, and executed without blocking HTTP requests). The dispatcher is the foundation for all future multi-agent coordination, fan-out synthesis, and compound queries.

---

## What Was Completed This Session

### Session #22 -- Orchestration Dispatcher (v0.22.0, 2026-06-10)

Built the full orchestration dispatcher in one session: DB migration, schema, contracts, repository methods, service layer, API routes, cron runner, and tests.

**Shipped:**
- `db/migrations/0024_dispatch_jobs.sql`: `dispatch_jobs` table with 3 indexes (partial claim index for `status='pending'`, workspace index, parent chain index).
- `db/schema.ts`: `dispatchJobs` Drizzle table.
- `lib/contracts.ts`: `dispatchJobTypeSchema` (4 types), `dispatchJobStatusSchema` (5 statuses), `dispatchJobSchema`, `dispatchJobInputSchema`, `dispatchFanOutInputSchema`, and per-type payload schemas.
- `lib/data/repository.ts`: 7 new methods — `enqueueDispatchJob`, `claimPendingJob` (atomic `FOR UPDATE SKIP LOCKED`), `markJobDone`, `markJobFailed` (with exponential backoff retry: 30s/5m/30m), `listDispatchJobs`, `getDispatchJob`, `cancelJob`, `countPendingJobs`. Plus `backoffMs()`, `mapDispatchJob()`, `mapDispatchJobRaw()` helpers.
- `lib/services/dispatcher.ts`: `enqueueJob()`, `enqueueFanOut()`, `claimNextJob()`, `executeJob()`, `runDispatchCycle()`. Handlers: `handleAgentBriefJob` → `cardsForRole()`, `handleSynthesisJob` → `synthesiseForRole()`, `handleWorkflowRunJob` → workflow twin runner, `handleDecisionExtractJob` → `proposeDecisionsFromAgentOutputs()`.
- `app/api/dispatch/route.ts`: `POST` (enqueue single + fan-out) + `GET` (list jobs with status/type filters).
- `app/api/dispatch/[jobId]/route.ts`: `GET` single job + `DELETE` (cancel pending).
- `app/api/cron/dispatch/route.ts`: cron runner, processes up to `NEXUS_DISPATCH_BATCH_SIZE` jobs per tick sequentially.
- `tests/dispatcher.test.ts`: ~25 tests covering full lifecycle, retry, fan-out, priority ordering, all 4 job type handlers.
- `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/RENDER_DEPLOY.md`: all updated to v0.22.0.
- `CHANGELOG.md`, `TASKS.md`, memory files: updated to v0.22.0.

**TypeScript:** 0 errors. **Tests:** clean.

---

### Session #21 -- Billing Tiers Session 2: Stripe Integration (v0.21.0, 2026-06-10)

**Shipped:**
- `lib/billing/stripe.ts`: pure-fetch Stripe client (no SDK) — `createCheckoutSession()`, `createBillingPortalSession()`, `verifyWebhookSignature()` (HMAC-SHA256, 5-min replay protection), `getSubscription()`, `findOrCreateCustomer()`.
- `POST /api/billing/checkout`, `POST /api/billing/portal`, `POST /api/billing/webhook` (5 event types).
- Repository additions: `getStripeCustomerId()`, `activatePlan()`, `handleSubscriptionChange()`, `suspendWorkspace()`, `unsuspendWorkspace()`, `convertExpiredTrials()`, `getWorkspaceByStripeCustomer()`.
- `POST /api/cron/billing`: now also converts expired trials.
- Settings Plan tab: Upgrade / Manage Plan / Enterprise CTA buttons wired to Stripe.
- `tests/billing-stripe.test.ts`: 20 tests.

---

### Session #20 -- Billing Tiers Session 1 (v0.20.0, 2026-06-10)

**Shipped:**
- `db/migrations/0023_billing_tiers.sql`: `plan_definitions` table + billing columns on `workspaces`.
- `lib/billing/budget.ts`: `checkTokenBudget()`, `canUseFeature()`, 5-min in-process cache, `invalidateBudgetCache()`.
- `ask()` budget gate: rejects calls when monthly token limit is exhausted.
- `POST /api/cron/billing`: monthly token reset for all workspaces.
- Settings → Plan & Usage tab.
- `tests/billing.test.ts`: 11 tests.

---

### Sessions #19 -- Scheduled Synthesis + Workflow Twins (v0.19.0–v0.19.1, 2026-06-10)

**Shipped:**
- `synthesis_schedules` table, Settings schedule config, `POST /api/cron/synthesis`, test-run button.
- `workflow_twins` + `workflow_twin_runs` tables, `GET/POST /api/workflow-twins`, run APIs, action-items alias.

---

### v0.14.1 — U3 Per-Agent Output Log and Rollback

This session built the U3 governance history layer.

**Shipped:**
- Added migration `0015_agent_outputs.sql` and Drizzle schema for `agent_outputs`.
- Added AgentOutput contracts and repository/in-memory methods to save, list, and roll back outputs.
- Dashboard agent brief generation now writes full output history: agent id, agent version, role key,
  full content, first 200 chars of prompt, evidence refs, confidence, output version, active state,
  replaced-by linkage, and processing time in the audit payload.
- Added `GET /api/agent-outputs` with agent/date filtering.
- Added `POST /api/agent-outputs/[id]/rollback` to restore a prior output version without deleting history.
- Extended Settings → Agent Governance with a searchable Agent Output Log and rollback controls.

**Verification so far:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 14 test files, 59 tests.
- `npm run build` passed.

**Next engineering work:**
1. U4 — learning-signal capture from approve/edit/reject decisions.
2. Then Phase 8A — Decision & Action Twin primitives, gated by U2 profiles and backed by U3 output history.

### v0.14.0 — U2 Agent Control Profiles Complete

This session finished the U2 engineering blocker enough to move to U3/U4.

**Shipped:**
- Added Settings → Agent Governance tab with profile list, seed defaults, edit-as-new-version,
  suspend, and resume flows.
- Added the three demo passports from the U2 spec: Regulatory Response Agent, Legal Redline Agent,
  and Proposal Partner Agent.
- Extended Ask to accept `agentKey`, apply Agent Control Profile filters before vector and keyword
  retrieval, and audit denied evidence.
- Tightened pgvector retrieval so vector ranking receives a passport-allowed candidate ID set.
- Added deterministic output gates for Ask and dashboard agent briefs. Legal/regulatory/pricing/
  data/privacy triggers escalate to human review; hard-stop outputs are blocked and audited.
- Added a first watcher/suspend path: hard-stop output blocks suspend a persisted offending
  Agent Control Profile and hold the output by refusal. Rich watcher agents and notifications
  are deferred into U3.
- Added runtime `guardToolInvocation()` helper so denied tool calls write `agent_tool_denied`
  audit events with agent key, tool, requested action, actor, and reason.

**Tests added/expanded:**
- Ask passport filtering before synthesis.
- Suspended agent refusal.
- Regulatory output escalation.
- Hard-stop output blocking.
- Tool-denial audit event.
- Passport version retention.

**Verification:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 57 tests.
- `npm run build` passed.

**Next engineering work:**
1. U3 — searchable per-agent output log, output versioning, and rollback-ready history.
2. U4 — learning-signal capture from approve/edit/reject decisions.
3. Phase 8A — Decision & Action Twin, gated by U2 profiles before evidence enters prompt context.

### v0.13.4 — Dependency Security Cleanup

This session cleared the open moderate Dependabot alert reported by GitHub on push.

**Issue fixed:**
- Dependabot alert #5: PostCSS XSS via unescaped `</style>` in CSS stringify output.
- Vulnerable package path was `next/node_modules/postcss@8.4.31`.

**Fix applied:**
- Kept the patched monorepo-level PostCSS override.
- Removed duplicate workspace-level overrides from `apps/mission-control/package.json`.
- Regenerated `package-lock.json` from a clean reinstall so Next resolves through the patched root `postcss@8.5.15` and no vulnerable nested PostCSS copy remains.

**Verification:**
- `npm audit --json` passed with 0 vulnerabilities.
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

### v0.13.3 — Nexus Reassessment and Workflow Twin Realignment

This session converted the strategic reassessment into repo-tracked roadmap decisions. No runtime code was changed.

**Decision locked:**
- NexusAI is a governed intelligence operating layer for high-stakes professional workflows, not a generic autonomous-company platform.
- Keep Phase 7D governance blockers first: U2 Agent Control Profiles, U3 per-agent logs/rollback, U4 learning-signal capture.
- Start workflow twins broadly with a Decision & Action Twin before specialized templates.
- Build Workflow Twin Scorer second so clients can pick their first Parallel Workflow Pilot.
- Build Ops Review Twin third as the repeatable weekly execution cadence.
- Keep Proposal/SOW, Regulatory Response, and Agreement Review as later workflow templates.

**Files updated:**
- `TASKS.md` — Phase 8A/8B/8C restructured and acceptance checks added.
- `CHANGELOG.md` — v0.13.3 planning release entry added.
- `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md` — product framing, build sequence, governance boundary, and positioning language.

**Important language rule:**
Use Strategic Mandate, Operating Doctrine, Policy Guardrails, Human Approval Layer, Parallel Workflow Pilot, and Decision Workflow Engine. Avoid broad "100x", workforce-replacement, and fully autonomous-company claims in client-facing copy.

**Next engineering work:**
1. Build U3 `agent_outputs` and rollback-ready output history.
2. Build U4 learning-signal capture.
3. Start Phase 8A Decision & Action Twin primitives after the governance path is safe enough.

### v0.13.2 — U2 Agent Passport Foundation

This session started the engineering-blocker pass for Phase 7D U2. The goal was not to finish every U2 item; it was to move the passport model from planning docs into enforceable code with tests.

**Key additions:**

1. **Agent Control Profile contracts**
   - Added passport status, action-right, risk, approval, cadence, log-level, and policy-controlled API schemas to `apps/mission-control/lib/contracts.ts`.
   - Added `AgentControlProfile` and `AgentControlProfileInput` exports.
   - Encoded the V1 action ladder: `retrieve → summarize → draft → recommend → prepare_for_approval`.

2. **Database and repository layer**
   - Added migration `0014_agent_control_profiles.sql`.
   - Added `agent_control_profiles` schema in Drizzle.
   - Added DB + in-memory repository methods for listing profiles, reading profile history, reading the active profile, creating a new version, seeding defaults, and suspending an agent.

3. **Default passport seeding**
   - Added default passport builders from the current `AGENT_LIBRARY`.
   - Regulated/high-risk agents get stricter defaults (`riskRating=regulated/high`, `reviewCadence=per_output`, higher approval level).
   - Default hard stops include external posting, source-system writeback, legal/financial commitments, HR actions, payments, filings, and regulator contact.

4. **Server-side enforcement**
   - Added `canReadEvidence()`, `filterEvidenceByPassport()`, and `canUseTool()`.
   - Dashboard generation now filters evidence through the active/default agent passport before evidence reaches LLM prompt context.
   - Dashboard deny decisions write audit events with agent key, evidence id, sensitivity, and reason.

5. **Admin API**
   - `GET /api/agent-control-profiles`
   - `GET /api/agent-control-profiles?agentKey=...`
   - `POST /api/agent-control-profiles?seed=1`
   - `POST /api/agent-control-profiles`
   - `POST /api/agent-control-profiles/[agentKey]/suspend`

**Verification:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

**Status update from v0.14.1:**
- U2 is now complete for current V1.1 surfaces.
- U3 per-agent logs/rollback is now complete.
- U4 learning signals remain open.

### v0.13.1 — Readiness On-Ramp, Governance Docs, and Deploy Push

This session converted the ExO/Salim-inspired upgrade notes into repo-tracked NexusAI deliverables, fixed one production build issue, and pushed the current build bundle to GitHub.

**Pushed commit:** `ba078f1 feat: ship v1 pilot hardening and readiness on-ramp`

**Key additions:**

1. **AI-Native Readiness on-ramp**
   - Public `/readiness` page exists and remains no-login.
   - Added `POST /api/readiness/submit` so assessment results can write a lead/audit event.
   - Middleware now treats `/readiness` and `/api/readiness/submit` as public, with rate limiting.

2. **Governance and proof documents**
   - `docs/AI_NATIVE_READINESS_ASSESSMENT.md`
   - `docs/WORKFLOW_TWIN_SCORER.md`
   - `docs/SHADOW_MODE_ROI_PLAYBOOK.md`
   - `docs/GOVERN_ASSURE_MESSAGING.md`
   - `docs/U2_AGENT_PASSPORT_SPEC.md`

3. **Product positioning**
   - `docs/ONE_PAGER.md` now includes the Govern and Assure layer and V1.1 governance path.
   - `TASKS.md` now marks U1 complete and keeps U2/U3/U4 open as the next engineering blockers.

4. **Build fix before push**
   - Split client-safe filename classification into `lib/services/company-classification.ts`.
   - Kept server-only LLM/company detection in `company-detection.ts`.
   - This fixed the production build failure where the browser onboarding bundle was pulling in `pg`/Node modules.

**Verification before push:**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 12 test files, 44 tests.
- `npm run build` passed.
- Secret scan found placeholders/test strings only, not the real API keys shared out-of-band.

**Known next work:**
- U2 Agent Control Profile/passports: contracts, DB migration, enforcement, Settings UI, tests.
- U3 searchable per-agent logs and rollback-ready output history.
- U4 learning-signal capture from approve/edit/reject decisions.
- Check Render dashboard to confirm build from `ba078f1` completed successfully.

---

### Phase 9D — Go-to-Market Execution (v0.13.0) + Production DB Migration

Two major workstreams completed in this session.

**Production database:** Migrations 0012 (workspace status, trial mode, llm_usage) and 0013 (demo_mode flag) applied successfully to the Neon production database. All prior migrations (0001–0011) were already applied and skipped.

**Phase 9D — GTM materials (6 deliverables):**

1. `/product-brief` — Public web page (no auth required). Full one-page product brief: problem, solution, how it works, sector fit, agent rooms, pricing tiers ($3k–$8k/month pilot), competitor comparison table, 3-step pilot start. Print → PDF via browser. Added to public routes in middleware.

2. `NexusAI_SOW_Fintech.docx` — Pilot SOW for regulated financial services. Full 12-section SOW with cover page, scope, deliverables table, client responsibilities, timeline, commercial terms, AI responsibility section, governance, and signature blocks.

3. `NexusAI_SOW_ProfessionalServices.docx` — Same structure, professional services variant (Meridian Advisory Group context, consulting-specific documents and roles).

4. `NexusAI_SOW_DigitalNative.docx` — Same structure, digital-native/SaaS variant (Vanta Systems context).

5. `NexusAI_DemoScripts_CompetitorComparison.docx` — Three 15-minute demo scripts: (a) Fintech CEO — risk room, regulatory findings, weekly brief export; (b) Consulting Managing Partner — BD pipeline, delivery intelligence, people signals; (c) D2C/SaaS Founder — MRR, customer health, engineering signals. Plus competitor comparison (NexusAI vs ChatGPT Enterprise vs Glean vs BI tools) with objection handling for 5 common objections.

6. `NexusAI_PilotROI_ReviewTemplates.xlsx` — Three-sheet workbook: (a) ROI Calculator — editable inputs (hours saved per role, exec cost/hr), auto-calculates value recovered, pilot cost, net value, ROI multiple, payback period. Zero formula errors. (b) Pilot Review Template — Day 30/60/90 review with usage metrics, scorecard status, qualitative feedback, renewal discussion. (c) Kickoff Agenda — 60-minute structured kickoff agenda with time, topic, and actions/owner columns.

**Verification:** TypeScript clean. All documents and spreadsheets validated.

---

### Previous Session — Phase 8 — Paid Pilot Packaging (v0.12.0)

The goal was to deliver everything needed to convert a demo into a signed pilot and serve
a sponsor within 24 hours of kickoff. No infrastructure dependencies — all code.

**Six concrete changes shipped:**

1. **Export API routes** — `GET /api/export/weekly-brief`, `/risk-radar`, `/reco-register`,
   `/one-pager`. Risk radar and reco register support `?format=csv` with named file download.

2. **Print-ready export pages** — `/export` hub, `/export/weekly-brief` (AI brief + risk table
   + recommendations summary, print → PDF), `/export/one-pager` (single-page board summary).
   Exports section added to side nav.

3. **Demo mode flag** — `demo_mode` column in `workspace_settings` + migration 0013. DEMO badge
   in layout top bar. Ingestion blocked (403) in demo mode. `PATCH /api/settings/workspace`
   accepts `demoMode`. Settings → Demo Tools tab with toggle.

4. **Demo workspace reset** — `lib/demo/sector-packs.ts` with 3 sector packs (financial
   services, professional services, technology SaaS), each 5 realistic documents. `POST
   /api/workspace/demo-reset?sector=<sector>` clears data, updates profile, seeds evidence
   at auto-process confidence, fires recommendation generation.

5. **Pilot sponsor kit** — `/pilot-kit` print page: Sponsor Onboarding Checklist (5-step
   business readiness guide) + Pilot Success Scorecard (7 outcomes, Day 30/60/90 columns,
   sign-off blocks). Linked from side nav.

6. **Pilot billing triggers doc** — `docs/PILOT_BILLING_TRIGGERS.md`: trial/pilot/active/
   suspended/cancelled definitions, trigger conditions, manual override SQL, pricing tiers
   ($3k–$8k/month pilot), Stripe automation specification for Phase 7C.

**Verification:**
- `npx tsc --noEmit` clean (no application code errors)

---

### Previous Session — Phase 7C — Production Operations (v0.11.0)

The goal was to complete all pre-pilot production hardening tasks. No user-facing features —
only the foundation that makes the product safe to charge money for.

**Seven concrete changes shipped:**

1. `middleware.ts` — Full `Content-Security-Policy` header added (strict-dynamic in production,
   unsafe-inline in dev). CORS policy implemented: production domain only, never wildcard.
   In-process sliding-window rate limiting added for auth (10/min), ingestion (20/min),
   ask (30/min), and dashboard (60/min) routes per IP. 429 response with `Retry-After`.

2. `db/schema.ts` + `db/migrations/0012_workspace_status.sql` — `workspace_status` enum
   (trial | pilot | active | suspended | cancelled) added to workspaces table.
   `trial_ends_at`, `suspended_at`, `stripe_customer_id`, `stripe_subscription_id` columns added.
   New `llm_usage` table for per-workspace token cost tracking.

3. `lib/data/repository.ts` — `getWorkspaceStatus()` returns current status + trial expiry.
   `recordLLMUsage()` writes token cost records to `llm_usage` (fire-and-forget, non-blocking).
   `WorkspaceStatus`, `WorkspaceStatusRecord`, and `LLMUsageInput` types exported.

4. `lib/services/llm.ts` — `route` field added to `LLMOptions`. `persistUsage()` helper fires
   after every successful LLM call to write cost records to DB. `estimateCostMicro()` computes
   approximate cost per model family (Opus, Sonnet, Haiku, DeepSeek). Non-blocking — never
   delays the LLM response.

5. `components/trial-banner.tsx` — Client component. Shows days remaining in trial.
   Dismissable per session. Upgrades to a plain "trial ended" message when expiry passes.
   `components/feedback-button.tsx` — Floating button on all dashboard pages. Opens a modal
   (subject + message). POSTs to `/api/feedback`, writes to audit log.

6. `app/api/feedback/route.ts` — POST endpoint (scope: read:dashboard). Validates input,
   writes to audit log via `repository.pushAudit()`. Logs support email intent when
   `NEXUS_SUPPORT_EMAIL` is set (email sending requires transactional service wiring).

7. `docs/DR_RUNBOOK.md` — Full disaster recovery runbook covering DB loss, R2 unavailable,
   Clerk failure, LLM provider down, full outage, and migration rollback SQL.
   `docs/SECURITY_REVIEW.md` — Pre-pilot security checklist with REQUIRED vs RECOMMENDED items,
   sign-off table, and deferred Phase 2 items.

**Verification:**
- `npx tsc --noEmit` passed (clean)

---

### Previous Session — Phase 7 Completion — Brief Language, Agent Rooms, and Archetype Controls (v0.10.3)

The goal was to close Phase 7A/7B for the V1 pilot scope and make the role/archetype system
feel complete in the product.

**Six concrete changes shipped:**

1. `lib/domain/sector-library.ts` — Added archetype evidence expectations and formal/plain
   brief-language instructions. `buildCompanyContext()` now includes expected evidence and
   language rules for downstream LLM prompts.

2. `lib/services/dashboard.ts` — Agent prompts now receive brief-language rules directly.
   SME/owner-operated briefs are constrained to short, plain-language owner updates.

3. `components/dashboard-panel.tsx` and `app/dashboard/[role]/page.tsx` — Dashboard pages now
   support agent-level filtering with `?agent=...`, use room labels for new roles, and adapt
   SME physical page titles to Owner/Ops/Accounts-style briefs.

4. `components/side-nav.tsx` — Agent Room navigation now includes Finance, Risk, and People rooms.

5. `app/settings/page.tsx` — Company Profile settings now expose company archetype, brief
   language, location count, archetype version, evidence expectations, and role-state badges.

6. `docs/SECTOR_GAPS.md` — Added the unsupported-sector gap list and the V1 handling rule:
   archetype-first role suggestion when sector fit is weak.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 12 files, 44 tests

### Previous Session (v0.10.2) — Phase 7A Agent Briefs and Digital Evidence Classification

The goal was to make the expanded role system feel meaningfully specialist, especially for
digital-native, social-led, regulated, operational, and local-business companies.

**Four concrete changes shipped:**

1. `lib/agents/agent-library.ts` — Added specialist agents for finance, cash/runway, margin,
   regulatory obligations, audit findings, performance marketing, brand/community, creator
   performance, product, customer success, people, clinical risk, supply chain, project control,
   legal exposure, and local business.

2. `ROLE_AGENT_BRIEFS` now maps the expanded roles to sharper agent sets. CFO, CRO, CCO, CMO,
   Growth, Performance Marketing, Brand/Community, CPO, CHRO, Customer Success, Chief of Staff,
   Managing Partner, Chief Medical, Supply Chain, Project Director, Practice Lead, General
   Counsel, and Franchise Manager no longer reuse generic CEO/COO/CBO sets.

3. `classifyFilename()` now recognizes paid ads, organic social, WhatsApp Business, Google
   Business Profile/local-business, creator/influencer, and email/CRM exports. It returns
   `sourceType`, extraction hints, and evidence warnings in addition to department/sensitivity.

4. `POST /api/ingestion/status` now preserves classifier-selected `sourceType` when the caller
   does not provide one, and includes extraction hints/warnings in audit payloads and upload
   responses.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 11 files, 38 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.10.1) — Phase 7A Wizard Role Selection

The goal was to turn the Phase 7A role engine into an actual onboarding experience.
Step 4 now acts like a guided org-design decision point instead of a static dashboard picker.

**Four concrete changes shipped:**

1. `app/onboarding/wizard.tsx` — Step 4 now receives the full `DetectedProfile`, runs
   `suggestRolesForProfile()`, and renders role cards with adaptive labels, reasons,
   relevance scores, badges, and evidence-scope descriptions.

2. CEO/Owner/Managing Partner is always first, locked, and selected. Staged roles render in a
   separate section with activation conditions and can be activated early.

3. Dual-hat handling is now available for early-stage and small-company roles. If a user marks
   a role as covered by another person, the workspace profile persists that role as
   `state: "dual_hat"` with `dualHatOf: "ceo"`.

4. Ambiguous-company fallback questions now appear when `requiresRoleConfirmation` is true. The
   answers apply deterministic signals for finance, risk/compliance, customers, people, technology,
   and performance marketing before proceeding.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.10.0) — Phase 7A Foundation: Roles and Archetypes

The goal was to start the full role-system expansion by adding the domain layer first, before
changing the wizard UI. This makes the next UI pass much safer because role relevance is now
deterministic, testable, and no longer delegated to the LLM.

**Six concrete changes shipped:**

1. `lib/contracts.ts`, `db/schema.ts`, `db/migrations/0011_role_archetype.sql`,
   `lib/data/repository.ts`, and `app/api/workspace/profile/route.ts` — Workspace profiles now
   support `companyArchetype`, `archetypeVersion`, `briefLanguageMode`, `locationCount`, and
   `roleStates`.

2. `lib/domain/role-registry.ts` — New role registry covering universal, regulatory, growth,
   technology/product, people, sector-specific, and future-stage roles. Roles include
   archetype-aware labels, relevance signals, thresholds, evidence scopes, staged conditions,
   and mapped specialist-agent IDs.

3. `lib/services/role-suggestion.ts` — New deterministic role suggestion engine. It scores roles
   by archetype, sector, stage, size, regulatory trigger, business model signal, and free-text
   keywords. CEO is always first and locked.

4. `lib/services/company-detection.ts` — LLM profile detection now asks for `companyArchetype`;
   role suggestions are generated by the deterministic engine. Output now includes
   `suggestedRoleReasons`, `stagedRoles`, `roleStates`, and `requiresRoleConfirmation`.

5. `lib/domain/sector-library.ts` and `lib/agents/agent-library.ts` — Company context now includes
   archetype and brief-language mode; expanded role keys now map to existing specialist agents.
   Finance, risk, and people rooms have first-class paths: `/dashboard/cfo`, `/dashboard/cro`,
   `/dashboard/chro`.

6. `tests/role-suggestion.test.ts` — New coverage for owner labeling, regulated financial services
   risk/compliance suggestions, and digital-native performance marketing suggestions.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.9.1) — Phase 7A Technical Prep

The immediate goal was to clear the hard blockers before building the full role registry,
business archetypes, and role relevance engine.

**Three concrete changes shipped:**

1. `lib/contracts.ts` — `roleSchema` widened from a closed `z.enum(["ceo","coo","cbo","cto"])`
   to a safe open string role key. `KNOWN_ROLES` preserves the current built-in role set while
   allowing future roles such as `cfo`, `cro`, `cmo`, `owner`, `managing_partner`, and
   `vp_performance_mktg`.

2. Role/dashboard runtime — `lib/agents/agent-library.ts`, `lib/services/dashboard.ts`,
   `app/api/dashboard/[role]/route.ts`, `app/dashboard/[role]/page.tsx`, `lib/data/store.ts`,
   and `lib/data/repository.ts` now accept custom/future role keys. Unknown roles receive fallback
   specialist-agent briefs and generic room metadata instead of failing compile-time or 404ing.

3. Connector provenance — `connectorInstanceId` was added to evidence contracts, ingestion input,
   repository mapping, API response/audit payloads, DB schema, and migration
   `0010_connector_instance.sql`. Manual uploads remain null by default; Phase 10+ connectors can
   populate the field to trace which connector instance created each evidence record.

**Verification:**
- `npx tsc --noEmit` passed
- `npm run test` passed: 9 files, 30 tests
- `npm run build` passed: 44 routes

### Previous Session (v0.9.0) — AI Onboarding Strategist

The core design principle driving this session: NexusAI should act like a senior business analyst during onboarding, not a form wizard. Every AI touch-point should reduce friction and demonstrate the system understands the business before a single document is uploaded.

**Five concrete changes shipped:**

1. `lib/services/company-detection.ts` — New `mapFocusToDashboard(intent, companyContext)` function. LLM maps user's stated priority ("blocking growth, top risks") to recommended dashboards + 3 suggested first questions + a one-sentence focus summary. Exports `FocusMapping` type.

2. `app/api/workspace/first-focus/route.ts` — New API route (POST, admin scope). Takes user intent, fetches workspace profile, builds company context, calls `mapFocusToDashboard`. Returns `FocusMapping` or 422 when LLM unavailable.

3. `app/api/ingestion/status/route.ts` — Sector-aware file classification now applies everywhere, not just in the onboarding wizard. On every file upload, the route fetches the workspace profile and passes the sector to `classifyFilename`. Caller-supplied values still win. Regulated sectors (financial_services, healthcare) get confidential defaults automatically.

4. `app/onboarding/wizard.tsx` — Three changes:
   - Step 3 (Profile): Added "Governance and Policy Defaults" panel. Shows auto-approved (75%+), pending (35–75%), quarantine (<35%) thresholds and sensitivity default. Regulated-sector callout explains elevated defaults for financial_services and healthcare.
   - Step 5 (Upload): `classifyFilename` now receives `profile.sector` instead of `""` so department/sensitivity suggestions are sector-aware from the first file pick.
   - Step 7 (Go Live): Transformed from static role cards into an AI focus intent step. User types priority, AI highlights dashboards with "Start here" badges and shows first suggested question. Clicking a recommended card passes the question as `?q=` URL param to pre-populate the Ask panel.

5. `deploy-company-context.sh` — Updated with new files and commit message.

### Previous Session (v0.8.0) — AI Company Detection

- `detectCompanyProfile(description)` — Full LLM company type inference
- `POST /api/workspace/detect-profile` — API route
- 7-step onboarding wizard rewrite (Workspace, Discover, Profile, Roles, Upload, Preview, Go Live)
- Step 2: free-text AI tab + Browse-by-sector tab with "Can't find your industry?" fallback
- Step 3: Profile confirmation with editable fields, suggested documents, KPIs, risks
- Step 4: Role selection pre-seeded from AI profile; Add Role feature for custom roles
- Step 5: Suggested document pack shown; drag-drop multi-file; AI file classification

### Previous Session (v0.7.0) — Company Context Infrastructure

- 8-sector taxonomy in `lib/domain/sector-library.ts`
- `workspaceProfiles` DB table + migration 0008
- `GET|POST /api/workspace/profile`
- `buildCompanyContext()` injected into dashboard, ask, and recommendation prompts

---

## Current Architecture State

### Core Data Flow

```
User uploads document
  → POST /api/ingestion/status
  → fetch workspace profile (sector)
  → classifyFilename(filename, sector)  [auto-department + sensitivity]
  → extractTextFromBuffer()            [PDF/DOCX/XLSX/PPTX/text]
  → ingestEvidence()                   [confidence routing: processed/pending/quarantined]
  → if processed: generateRecommendations() [fire-and-forget]
  → generateEmbedding()                [pgvector, if enabled]
```

```
User asks a question (Ask panel)
  → POST /api/ask
  → rankEvidence(): vector search → keyword fallback
  → fetch workspace profile
  → buildCompanyContext(profile)       [<300-token sector/stage/goals prefix]
  → ask(userPrompt, systemPrompt)      [Claude LLM synthesis]
  → return answer + evidenceRefs + confidence
```

```
Dashboard card render
  → GET /api/dashboard/:role
  → cardsForRole(role, workspaceId)
  → fetch profile + evidence in parallel
  → buildCompanyContext(profile)
  → generateCard() per card with company context prefix
```

### File Map (key files only)

| File | Purpose |
|---|---|
| `lib/domain/sector-library.ts` | 8-sector taxonomy, `buildCompanyContext()` |
| `lib/services/company-detection.ts` | `detectCompanyProfile()`, `classifyFilename()`, `mapFocusToDashboard()` |
| `lib/services/retrieval.ts` | Two-tier vector/keyword retrieval + LLM synthesis |
| `lib/services/dashboard.ts` | Role-card generation with company context |
| `lib/services/recommendations.ts` | Evidence-to-recommendation LLM pipeline |
| `lib/services/ingestion.ts` | Confidence routing, freshness, quarantine logic |
| `lib/data/repository.ts` | Postgres + in-memory fallback for all entities |
| `lib/api-auth.ts` | `requireScope()` — Clerk session + Bearer API key auth |
| `app/onboarding/wizard.tsx` | 7-step AI-assisted onboarding wizard |
| `app/api/workspace/detect-profile/route.ts` | AI company detection API |
| `app/api/workspace/first-focus/route.ts` | AI focus mapping API |
| `app/api/ingestion/status/route.ts` | File upload + sector-aware classification |
| `db/schema.ts` | Drizzle schema: tenants, workspaces, evidence, recommendations, decisions, approvals, audit, workspaceProfiles |

### Environment Variables Required

```
ANTHROPIC_API_KEY          Claude LLM provider
OPENAI_API_KEY             Embeddings (text-embedding-3-small)
NEXUS_VECTOR_SEARCH        "enabled" to activate pgvector path
DATABASE_URL               Neon Postgres connection string
NEXT_PUBLIC_CLERK_*        Clerk auth keys
CLERK_SECRET_KEY           Clerk server key
CLOUDFLARE_R2_*            R2 object storage (optional)
```

---

## Plan Status -- Verified 2026-06-10

| Phase | Status | Version |
|---|---|---|
| Phases 1-6 | Complete | v0.1-v0.9.0 |
| Pre-7A Technical Prep | Complete | v0.9.1 |
| Phase 7A -- Role System + Archetypes | Complete | v0.10.0-v0.10.2 |
| Phase 7B -- Agent Rooms UI | Complete | v0.10.3 |
| Phase 7C -- Production Operations | Code complete, external services pending | v0.11.0 |
| Phase 8 -- Paid Pilot Packaging | Complete | v0.12.0 |
| Phase 9D -- GTM Execution | Complete | v0.13.0 |
| Phase 7D U1 -- Readiness Assessment | Complete | v0.13.1 |
| Phase 7D U2 -- Agent Control Profiles | Complete | v0.14.0 |
| Phase 7D U3 -- Agent Output Log + Rollback | Complete | v0.14.1 |
| Phase 7D U4 -- Learning Signals | Complete | v0.15.0 |
| Demo Pack Audit | Complete | v0.15.1 |
| Phase 8A -- Decision Twin Core | Complete | v0.16.0 |
| Phase 8A -- Decision Auto-Extraction | Complete | v0.16.1 |
| Persistent Ask Conversation Memory | Complete | v0.16.2 |
| Entity Extraction Pipeline | Complete | v0.16.3 |
| Phase 2 P2-A/B/C/D AI Trust Layer | Complete | v0.17.0 |
| Executive Synthesis Layer | Complete | v0.18.0 |
| Executive Synthesis Traceability | Complete | v0.18.1 |
| Executive Synthesis Refresh/History | Complete | v0.18.2 |
| Scheduled Synthesis Core | Complete | v0.19.0 |
| Workflow Twin Primitives | Complete | v0.19.1 |
| Billing Tiers Session 1 | Complete | v0.20.0 |
| Billing Tiers Session 2 (Stripe) | Complete | v0.21.0 |
| Orchestration Dispatcher | Complete | v0.22.0 |
| Entity Pages and Backlinks | Complete | v0.23.0 |
| Slack Connector Data Flow | First inbound path complete | v0.23.0 |
| Phase 8B -- Workflow Twin Scorer | Docs done, code not started | -- |
| Phase 8C -- Ops Review Twin | Not started | -- |
| Phase 9 -- Team Members | Build when pilot client needs it | -- |
| Phase 10+ | Future | -- |

## What Needs to Come Next

### Next build (highest impact)

1. **Fix homepage CTAs and demo navigation** -- verify Start a Pilot and View Workspace routes on Render, then patch any broken links before demos.
2. **Connector Settings UX** -- add Slack channel allowlist UI, sync status, last ingested, and source-level sensitivity controls.
3. **Workflow Twin Scorer** -- let clients choose their first workflow twin based on company profile, data readiness, pain, risk, and speed benefit.

### Operational sign-off (see docs/SECURITY_REVIEW.md)

- [ ] Wire Sentry for error tracking
- [ ] Set up support@nexusai.io or Freshdesk
- [ ] Verify security headers via securityheaders.com
- [ ] Run tenant isolation test
- [x] Apply migrations 0014-0020 to Neon production
- [x] Apply migrations 0021-0024 to Neon production
- [ ] Configure Render cron jobs: synthesis (daily), billing (daily), dispatch (every 2 min)
- [ ] Set Stripe env vars in Render: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS
- [ ] Register Stripe webhook endpoint: POST /api/billing/webhook

### What is ready to take to a first client today

- `/product-brief` -- public URL, share after first call
- 3x pilot SOW Word docs (fintech, professional services, digital-native)
- Demo scripts for 3 archetypes + competitor comparison
- ROI calculator + 30/60/90 review template + kickoff agenda
- `/pilot-kit` -- sponsor onboarding checklist + success scorecard
- Export Hub: weekly brief, risk radar CSV, reco register CSV, one-pager
- `/readiness` -- public AI-Native Readiness Assessment (lead gen)

---

## Notes for Next Model

- TypeScript is clean. Run `npx tsc --noEmit 2>&1 | grep -v ".next/"` to verify before shipping.
- Deploy script is `bash deploy-company-context.sh` from the `nexus-core` root.
- All API routes use `requireScope(request, scope)` from `lib/api-auth.ts`. Do not bypass it.
- `buildCompanyContext(profile)` returns an empty string if the profile is null — all LLM callers handle this gracefully.
- The in-memory store in `lib/data/store.ts` is the fallback when the DB is unavailable. Always write to both.
- Do not add new npm packages without checking `package.json` first. The dependency footprint is intentionally lean.
- Read `AGENTS.md` before editing any AI service file — it defines the trust model and approval boundaries.

---

## Continuation Prompt

```text
You are picking up NexusAI Mission Control mid-build.

Before doing anything else, read:
1. CLAUDE.md
2. HANDOVER.md  (you are reading this)
3. TASKS.md
4. AGENTS.md

Current version: 0.23.0
Last audit: 2026-06-13. 180+ source files, 28 test files / 179 tests, 24 DB migrations, build clean.

Phases 1-8 + 9D complete. V1.1 Tier 1 (U1-U4) complete. Billing Tiers + Stripe full integration (v0.20.0-v0.21.0), Orchestration Dispatcher (v0.22.0), Company Memory UI, and first Slack connector data flow (v0.23.0) complete.
Migrations 0001-0024 applied to Neon production.

What is built: onboarding, ingestion, retrieval, 7 agent rooms, 20 role dashboards, Ask, governance (passports, output gates, learning signals), Decision Twin, entity extraction, Company Memory pages/backlinks, eval harness, Executive Synthesis, scheduled synthesis, billing tiers, Stripe, orchestration dispatcher (dispatch_jobs queue, atomic claim, priority, retry, fan-out, 4 job type handlers, cron runner), and first Slack inbound ingestion path.

Immediate next build:
1. Fix homepage CTA/browser-session navigation if Clerk session behavior still feels broken in Chrome.
2. Connector Settings UX -- Slack channel allowlist, sync status, last ingested, source sensitivity, and audit trail.
3. Workflow Twin Scorer -- recommend the client's first workflow twin from company profile and data readiness.

Known missing (from 2026-06-13 audit):
- Connector admin UX for Slack channel selection and source policy.
- Additional connector data flows beyond Slack: Drive, Teams, SharePoint, Jira, GitHub, CRM, finance, and social.
- Workflow Twin Scorer code path.

Start by confirming git status, then read the files above, then proceed.
```
