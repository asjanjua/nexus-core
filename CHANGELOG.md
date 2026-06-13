# Changelog

---

## 0.23.0 — Company Memory and Slack Ingestion (2026-06-13)

This release turns the entity extraction substrate into visible Company Memory and adds the first real connector data flow.

**Company Memory UI**
- Added `/entities` Company Memory index with type/search filters and entity confidence/evidence counts.
- Added `/entities/[id]` detail pages with linked evidence, decisions, recommendations, actions, and a timeline.
- Added `GET /api/entities/[id]` for workspace-scoped entity memory retrieval.
- Added Company Memory to the side navigation.

**Slack connector ingestion**
- Slack app mentions stay on the Ask path.
- Allowlisted Slack channel messages can now ingest as governed evidence through the same `ingestEvidence()` pipeline used by uploads.
- Slack evidence receives source path/URI, timestamp, hash, connector instance, sensitivity, confidence, department hint, and audit events.
- DMs, multi-person DMs, bot/system subtypes, unsupported events, and non-allowlisted channels are skipped and audited.
- Added `SLACK_INGEST_CHANNELS` and `NEXUS_SLACK_INGEST_ALL` environment controls.

**Dispatcher hardening**
- Fixed strict TypeScript issues in dispatch API validation and DB-only queue methods.
- Decision extraction dispatch jobs now generate proposals and audit them without automatically creating canonical decisions.
- Synthesis dispatch handler now calls `synthesiseForRole()` with the correct argument shape.

**Production**
- Applied migrations `0021_synthesis_schedules.sql` through `0024_dispatch_jobs.sql` to the production database.
- Verified live Render health after push: database, vector search, R2 originals, and DeepSeek LLM all healthy.

**Tests**
- Added `tests/entity-memory.test.ts`.
- Added `tests/slack-connector.test.ts`.
- `npm run build --workspace @nexus/mission-control` passed.
- `npm test --workspace @nexus/mission-control` passed: 28 test files / 179 tests.

---

## 0.22.0 — Orchestration Dispatcher (2026-06-10)

Background job queue that decouples job submission from execution. Enables multi-agent fan-out, retry with backoff, priority queuing, job chaining, and a full audit trail of every agent invocation.

**DB migration**
- `db/migrations/0024_dispatch_jobs.sql`: `dispatch_jobs` table with partial index for efficient claim queries (`status='pending'`), workspace index, parent chain index.

**Drizzle schema**
- `db/schema.ts`: `dispatchJobs` pgTable with all columns.

**Contracts**
- `lib/contracts.ts`: `dispatchJobTypeSchema` (4 types), `dispatchJobStatusSchema` (5 statuses), `dispatchJobSchema`, `dispatchJobInputSchema`, `dispatchFanOutInputSchema`, and payload schemas for each job type.

**Repository methods (`lib/data/repository.ts`)**
- `enqueueDispatchJob()`: insert pending job (Postgres + in-memory fallback).
- `claimPendingJob()`: atomic `UPDATE...RETURNING` with `FOR UPDATE SKIP LOCKED` — prevents double-execution in concurrent cron.
- `markJobDone()`, `markJobFailed()` (with exponential backoff retry: 30s / 5m / 30m).
- `listDispatchJobs()`: paginated, filterable by status and jobType.
- `getDispatchJob()`: single job by ID.
- `cancelJob()`: sets status to cancelled.
- `countPendingJobs()`: counts pending jobs, optionally scoped to a workspace.

**Dispatcher service (`lib/services/dispatcher.ts`)**
- `enqueueJob()`: single-job enqueue wrapper.
- `enqueueFanOut()`: one job per role/value with merged payload.
- `claimNextJob()`: delegates to repository atomic claim.
- `executeJob()`: routes to handler by `job_type`, calls `markJobDone` / `markJobFailed`.
- `runDispatchCycle(batchSize)`: claims and executes up to N jobs sequentially — safe for token budget.
- Handlers: `handleAgentBriefJob` → `cardsForRole()`, `handleSynthesisJob` → `synthesiseForRole()`, `handleWorkflowRunJob` → `buildWorkflowTwinRunInput()` + `createWorkflowTwinRun()`, `handleDecisionExtractJob` → `proposeDecisionsFromAgentOutputs()` + `createDecision()`.

**API routes**
- `POST /api/dispatch`: enqueue single job or fan-out; returns `{ jobId }` or `{ jobs: [...] }` with 202.
- `GET /api/dispatch`: list workspace jobs (filterable by status, jobType; paginated).
- `GET /api/dispatch/[jobId]`: get single job with full payload and error.
- `DELETE /api/dispatch/[jobId]`: cancel a pending job.

**Cron runner**
- `POST /api/cron/dispatch`: claims and executes up to `NEXUS_DISPATCH_BATCH_SIZE` (default 5) jobs per tick. Returns `{ processed, succeeded, failed }`. Recommended Render schedule: every 2 minutes.

**Tests**
- `tests/dispatcher.test.ts`: ~25 tests covering enqueue, fan-out, claim priority ordering, executeJob success/failure, retry lifecycle, runDispatchCycle batch processing, cancel, countPendingJobs, workflow_run and decision_extract handlers.

**TypeScript check:** clean.

---

## 0.21.0 — Billing Tiers Session 2: Stripe Integration (2026-06-10)

Stripe Checkout, subscription lifecycle webhooks, Billing Portal, and trial-to-free conversion.

**Stripe module (no SDK — pure fetch)**
- `lib/billing/stripe.ts`: singleton Stripe HTTP client, `createCheckoutSession()`, `createBillingPortalSession()`, `verifyWebhookSignature()` (Web Crypto HMAC-SHA256), `getSubscription()`, `findOrCreateCustomer()`, `priceIdForPlan()`, `planFromPriceId()`, `PLAN_TOKEN_LIMITS`.

**API routes**
- `POST /api/billing/checkout`: creates Stripe Checkout Session for `pro`/`business` upgrade, returns `{ url }`. Rejects `free`/`enterprise`. Writes audit event.
- `POST /api/billing/portal`: creates Stripe Billing Portal session for subscription management, returns `{ url }`.
- `POST /api/billing/webhook`: handles `checkout.session.completed` (activate plan), `customer.subscription.updated` (plan change), `customer.subscription.deleted` (revert to free), `invoice.payment_failed` (suspend), `invoice.paid` (unsuspend). Signature verified with HMAC-SHA256 + replay protection (5-min window). Returns 200 for all valid events including unhandled types.

**Repository additions**
- `getStripeCustomerId()`, `setStripeIds()`, `activatePlan()`, `handleSubscriptionChange()`, `suspendWorkspace()`, `unsuspendWorkspace()`, `convertExpiredTrials()`, `getWorkspaceByStripeCustomer()`.

**Cron update**
- `POST /api/cron/billing`: now also runs `convertExpiredTrials()` (trial → free on expiry) alongside monthly token reset. Returns `{ workspacesReset, trialsConverted }`.

**Settings UI (Plan & Usage tab)**
- Upgrade to Pro / Upgrade to Business buttons that POST to `/api/billing/checkout` and redirect to Stripe.
- Manage Plan button (paid plans only) that POSTs to `/api/billing/portal`.
- Enterprise contact CTA for Business plan users.
- Success/cancelled banners after Stripe redirect (reads `?billing=success|cancelled`, then cleans URL).

**Env vars added to `.env.example`**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `NEXT_PUBLIC_APP_URL`.

**Tests**
- `tests/billing-stripe.test.ts`: 20 tests covering Stripe config, price ID resolution, token limits, webhook signature (valid/invalid/stale), trial conversion, customer lookup, checkout validation, portal validation, all 4 webhook event types.

**TypeScript check:** clean.

---

## 0.20.0 — Billing Tiers Session 1 (2026-06-10)

Plan-gated token budgets, feature flags, resource limits, and a Plan & Usage settings tab.

**Data layer**
- Migration `0023_billing_tiers.sql`: five new columns on `workspaces` (plan, monthly_token_limit, monthly_token_used, token_reset_at, plan_changed_at) and a `plan_definitions` table seeded with Free/Pro/Business/Enterprise rows.
- `db/schema.ts`: `planEnum`, `planDefinitions` table, and billing columns on workspaces.

**Budget enforcement**
- `lib/billing/budget.ts`: `checkTokenBudget()` with 5-minute in-process TTL cache; `canUseFeature()` for 8 feature flags; `checkEvidenceLimit()`; `getWorkspacePlanSummary()`; `invalidateBudgetCache()`.
- `lib/services/llm.ts`: `ask()` now gates on plan token budget before calling the LLM. Returns a structured budget-exceeded message on exhaustion; no change to callers.
- `lib/data/repository.ts`: `recordLLMUsage()` fires async `monthly_token_used` increment after each LLM call. New methods: `getWorkspaceBillingState`, `getPlanDefinition`, `updateWorkspacePlan`, `resetMonthlyTokens`, `resetAllDueMonthlyTokens`.

**API**
- `GET /api/billing/plan` (scope: `read:workspace`): workspace plan summary for Settings UI.
- `POST /api/cron/billing` (cron-secret): resets monthly token counters for all workspaces past reset date.

**Settings UI**
- New "Plan & Usage" tab added as the first tab in Settings, covering budget bar, limit rows (roles, evidence, team, API keys), and feature flag table.

**Tests**
- `tests/billing.test.ts`: 11 tests covering budget allow/block/unlimited/DB-error, feature gating, `ask()` budget gate, and cache TTL/invalidation.

**TypeScript check:** clean.

---

## 0.18.2 — Manual Synthesis Refresh and History (2026-06-10)

This release completes the practical synthesis polish loop: users can manually regenerate an executive brief and preserve the refreshed output in the existing U3 output history.

**Refresh**
- Added `POST /api/synthesis/[role]` to regenerate a role synthesis.
- The POST path persists refreshed synthesis into `agent_outputs` as `synthesis_<role>`.
- The dashboard synthesis panel now includes a `Refresh brief` button that calls the POST route and refreshes the page.

**History**
- Synthesis history reuses existing `agent_outputs` versioning, active-output switching, rollback plumbing, and audit events.
- No new DB table or migration required.

**Verification**
- `npm run test` passed: 21 files / 104 tests.
- `npm run build` passed.

---

## 0.18.1 — Executive Synthesis Traceability (2026-06-10)

This release makes the new Executive Synthesis brief more inspectable for demos and pilot users.

**Traceability**
- Added `sources` and `entities` to each `ExecutiveSynthesisQuestion`.
- Synthesis now maps evidence refs to readable source labels and evidence links.
- Synthesis now attaches extracted company-memory entities whose evidence refs overlap with the brief.
- The dashboard synthesis UI renders clickable source pills and entity chips under each answer.

**Implementation**
- `synthesiseForRole()` can still reuse dashboard-generated cards to avoid duplicate card generation.
- No database migration required.
- Older synthesis payloads remain valid because traceability arrays default to empty.

**Verification**
- `npm run test` passed: 21 files / 103 tests.
- `npm run build` passed.

---

## 0.18.0 — Executive Synthesis Layer (2026-06-10)

This release reframes the dashboard from a set of agent cards into a leadership brief that
answers the questions executives actually ask at the start of their day.

**Architecture**
- No new database tables. Synthesis is computed on demand from existing `agent_outputs` and evidence.
- Dispatcher calls `cardsForRole()` to collect all specialist agent outputs for a role, then the
  synthesis engine answers role-specific questions grounded in those briefs.
- Red-team checks applied per question answer before returning to the user.
- `synthesis.executive` added to the prompt registry.

**New service: `lib/services/synthesis.ts`**
- `synthesiseForRole(role, workspaceId, options)` — dispatcher + synthesis engine.
- `questionsForRole(role)` — returns role-specific question set:
  CEO gets 7 cross-functional questions; COO, CFO, CTO, CBO, CHRO get 5 role-tuned questions;
  all other roles get 5 generic leadership questions.
- Archetype language (bank CEO vs coffee shop owner) carried through via existing
  `buildCompanyContext()` and `briefLanguageInstruction()`.
- Each question answered independently in parallel for speed.

**New API: `GET /api/synthesis/:role`**
- Scope: `read:dashboard`. Returns `ExecutiveSynthesis` with answered questions, confidence,
  evidence refs, and agent card count.
- Department filter via `?department=` query param.

**New component: `components/synthesis-brief.tsx`**
- `ExecutiveSynthesisBrief` — primary hero panel. Numbered questions with evidence-backed answers,
  confidence badge, evidence source count, and answered/total indicator.
- `AgentDetailSection` — collapsible wrapper for specialist agent cards below the brief.
- `SynthesisBriefSkeleton` — loading skeleton matching question count.

**Dashboard reframe: `components/dashboard-panel.tsx`**
- Dashboard generation calls `cardsForRole()` once, then synthesis reuses those governed cards.
- Synthesis brief renders as primary panel above agent cards.
- Agent cards move into a collapsible `AgentDetailSection` (still fully accessible, one click).
- Single-agent filter view (`?agent=`) bypasses synthesis and shows cards directly.
- `AgentCards` extracted as internal component to avoid duplication.

**New contracts: `lib/contracts.ts`**
- `executiveSynthesisQuestionSchema` / `ExecutiveSynthesisQuestion`
- `executiveSynthesisSchema` / `ExecutiveSynthesis`

**Spec: `docs/EXECUTIVE_SYNTHESIS_SPEC.md`**
- Full design spec committed with role question sets, architecture, UI layout before/after,
  success criteria, and what this is not.

**Verification**
- 13 tests in `tests/synthesis.test.ts` covering question set correctness per role,
  contract validation, boundary cases.
- `npm run test` passed: 21 files / 102 tests.
- `npm run build` passed.

---

## 0.17.0 — Phase 2 AI Trust Layer (2026-06-10)

This release completes the P2 trust and operating-model blockers needed for regulated-buyer
conversations: eval harness, red-team checks, prompt registry, and workspace AI policy controls.

**Schema — migration 0020**
- Added workspace AI policy fields: `allowed_providers`, `local_only_mode`,
  `sensitivity_ceiling`, and `approval_required_threshold`.
- Added `prompt_registry` for durable prompt manifest/version metadata.
- Added `eval_runs` for persisted evaluation summaries and per-case results.

**Evaluation harness**
- Added `lib/eval/golden-set.ts` with 30 golden cases across six categories:
  risk detection, decision framing, recommendation quality, sector classification,
  source grounding, and restricted-data refusal.
- Added `lib/eval/harness.ts` for deterministic scoring, confidence checks, latency tracking,
  and aggregate run summaries.
- Added `POST /api/eval/run` and `GET /api/eval/results`.
- Added Settings → Eval tab.

**Prompt registry**
- Added `lib/prompts/registry.ts` with versioned prompt entries, owner, description,
  changelog, interpolation, missing-variable errors, and optional audit.
- Moved Ask and dashboard system prompts onto registry-backed `getPrompt()` calls.
- Added `GET /api/prompts` and Settings → Prompts tab.

**Red-team checks**
- Added `lib/security/red-team.ts` with PII, overconfidence, unsafe action, sensitivity ceiling,
  and hard-stop leakage checks.
- Wired red-team blocking into Ask and dashboard synthesis before user-visible output.
- Writes `red_team_violation` audit events when checks fail.

**Workspace AI policy**
- Added `lib/security/ai-policy.ts`.
- LLM calls now enforce workspace provider allow-list and local-only mode server-side.
- Ask and dashboard outputs below the workspace confidence threshold are routed to review.
- Added Settings → AI Policy tab for provider controls, local-only mode, sensitivity ceiling,
  and human-review threshold.

**Verification**
- Added tests for eval harness, prompt registry, red-team checks, and AI policy.
- `npm run test` passed: 20 files / 88 tests.
- `npm run build` passed.

---

## 0.16.3 — Entity Extraction Pipeline (2026-06-10)

This release turns the previously dormant `entities` table into the first working substrate for
Company Memory.

**Schema — migration 0019**
- Added `evidence_entity_links` to connect extracted entities to source evidence.
- Added uniqueness on evidence/entity pairs and indexes for workspace, evidence, entity, type,
  and name lookup.

**Contracts**
- Added `entityTypeSchema`, `entitySchema`, and `entityInputSchema`.
- Entity types now cover people, organizations, projects, risks, KPIs, amounts, dates, systems,
  processes, locations, products, and unknowns.

**Ingestion**
- Processed evidence now triggers deterministic entity extraction after the evidence record is saved.
- Extracted entities carry source path/type, department context, confidence, and evidence linkage.
- Pending/quarantined records remain excluded from entity extraction until reviewed.

**Repository and API**
- Added Postgres-first entity upsert/list methods with in-memory fallback.
- Added `GET /api/entities` with workspace scoping, type filter, search filter, limit, and by-type summary.
- Added `/api/entities` to the scoped agent/API route matcher.

**Verification**
- Added entity extraction tests for risks, systems, processes, amounts, dates, organizations, and evidence links.
- `npm run test` passed: 16 files / 74 tests.
- `npm run build` passed.

---

## 0.16.0 — Phase 8A Decision & Action Twin (2026-06-01)

This release pulls Phase 8A forward into the active build track, making NexusAI a daily-use tool
by linking decisions and action items directly to agent briefs.

**Schema — migration 0017**
- Extended `decisions` table: added `source_output_id` (FK to agent_outputs), `deadline`, `priority`
  (low/medium/high/critical), `created_at`, `updated_at`.
- New `actions` table: `decision_id` (FK cascade), `action_text`, `owner`, `due_date`,
  `is_blocker`, `status` (open/done/deferred/cancelled), `completed_at`.
- Indexes on workspace_id, status, and decision_id for fast filtered queries.

**Contracts**
- Extended `decisionSchema` with `sourceOutputId`, `deadline`, `priority`, `createdAt`, `updatedAt`.
- Added `decisionInputSchema`, `decisionPrioritySchema`.
- Added `actionSchema`, `actionInputSchema`, `actionStatusSchema`.

**Repository**
- `listDecisions(workspaceId, status?)` — Postgres-first with in-memory fallback.
- `createDecision(workspaceId, input, actor)` — creates decision, writes `decision_created` audit event.
- `updateDecision(id, workspaceId, patch, actor)` — patches any field, auto-sets `decidedAt` on status change to decided.
- `listActions(workspaceId, decisionId?, status?)` — sorted blockers-first, then by due date.
- `createAction(workspaceId, input, actor)` — creates action, writes `action_created` audit event.
- `updateAction(id, workspaceId, patch, actor)` — patches status/owner/dueDate/isBlocker, auto-sets `completedAt`.

**Store (in-memory fallback)**
- Added `saveDecision`, `listActions`, `saveAction` with blocker-first sort.

**API routes**
- `GET  /api/decisions` — list with optional status filter.
- `POST /api/decisions` — create decision.
- `PATCH /api/decisions/[id]` — update any field.
- `GET  /api/actions` — list with optional decisionId and status filters.
- `POST /api/actions` — create action under a decision.
- `PATCH /api/actions/[id]` — mark done, change owner, set due date, toggle blocker.

**Decisions page — full interactive rewrite**
- Priority badge (critical/high/medium/low) with colour coding.
- Status tabs (all / open / decided / superseded).
- Summary strip: open decisions, decided, open actions, blockers (red if >0).
- Mark Decided button per open decision.
- Inline action list per decision: checkbox to complete, blocker badge, overdue date in red.
- Add Action inline form: text, owner, due date, blocker toggle.
- New Decision form: title, owner, priority, status, deadline, rationale.
- All mutations via API — no page reload required.

**Verification**
- `npx tsc --noEmit` passed (excluding stale .next/ build artefacts).

---

## 0.15.1 — Demo Sector Pack Audit and Rewrite (2026-06-01)

This release sharpens all 3 demo sector packs for sales readiness and adds pre-tuned Ask questions.

**Sector pack rewrites**
- All 3 packs rewritten to the CEO sales test: every evidence item now contains named metrics,
  named risks, named deadlines, and named people where appropriate.
- Financial Services (Gulf Capital Partners): CBUAE findings now include specific deadlines,
  compliance consequences, and exact AML threshold gaps. Duration mismatch quantified at USD 18M
  mark-to-market risk. USD 120M redemption event given specific expiry date and impact on fee run-rate.
  Digital payments acquisition given board decision framing with AED 85M price.
- Professional Services (Meridian Advisory Group): Bench cost quantified as AED 420K/month with
  Q2 EBITDA impact of 5 points. At-risk pipeline broken into 3 named clients with reasons.
  Saudi expansion given explicit Saudisation constraint and board decision deadline of 30 June.
  Project at-risk revenue recognition amounts specified per engagement.
- Technology SaaS (Vanta Systems): 5 Red accounts now have names, ARR amounts, renewal dates,
  and specific recommended actions per account. SAP connector risk quantified at $620K renewal ACV.
  Series C readiness milestones listed explicitly. Pakistan macro risk named and sized at $220K ACV.

**Pre-tuned Ask questions**
- Added `suggestedQuestions: string[]` field to `DemoPack` type — 3 CEO-level questions per pack,
  pre-written to surface the sharpest risks and decisions in each sector's evidence set.
- These replace reliance on LLM-generated questions at demo runtime (removing variability risk).
- `POST /api/workspace/demo-reset` now returns `suggestedQuestions` and `demoSummary` in the response.
- Settings → Demo tab now shows a post-reset panel: workspace name, one-line demo summary,
  and numbered suggested questions ready to paste into the Ask panel.

**Added `demoSummary` field** — one sentence per pack that frames what the demo shows,
displayed in the Settings UI and usable in sales prep materials.

**Verification**
- `npx tsc --noEmit` passed.

---

## 0.15.0 — U4 Learning Signal Capture (2026-06-01)

This release adds user feedback capture on agent outputs, completing the V1.1 Tier 1 governance loop.

**Learning signals**
- Added migration `0016_learning_signals.sql` — `learning_signals` table with workspace, agent, output FK, signal type, optional edited content, actor, and timestamp.
- Added `learningSignals` Drizzle table to `db/schema.ts` with FK cascade on `agent_outputs.id`.
- Added `learningSignalTypeSchema`, `learningSignalSchema`, `learningSignalInputSchema`, and `learningSignalSummarySchema` to `lib/contracts.ts`.
- Added `saveLearnningSignal`, `listLearningSignals`, and `getLearningSignalSummary` to `lib/data/repository.ts`.
- Added `saveLearningSignal` and `listLearningSignals` in-memory fallback to `lib/data/store.ts`.
- Every signal write creates an `agent_learning_signal` audit event with agent ID, output ID, signal type, and edit flag.

**API routes**
- `POST /api/learning-signals` — submit approve / edit / reject / thumbs_up / thumbs_down against an agent output.
- `GET  /api/learning-signals` — list signals for a workspace with agentId / outputId / signalType / date filters.
- `GET  /api/learning-signals/summary` — per-agent quality metrics: approval rate, rejection rate, edit rate, total signals.

**UI**
- Agent Output Log now shows Approve / Edit / Reject / 👍 / 👎 buttons on each output card.
- Edit signal prompts reviewer for a corrected brief before submitting.
- Signal confirmation replaces buttons with a "Signal recorded: {type}" confirmation inline.

**Tests**
- Added `tests/learning-signals.test.ts` — 12 test cases covering: save/retrieve, agentId filter, signalType filter, editedContent, workspace isolation, since filter, sort order, limit, and all 5 signal types.

**Verification**
- `npx tsc --noEmit` passed.

**Still open**
- Classifier-assisted output gate enrichment using signal data.
- U9 learning loop and improvement reporting (Tier 3).

---

## 0.14.1 — U3 Per-Agent Output Log and Rollback (2026-06-01)

This release adds rollback-ready agent output history for dashboard-generated briefs.

**Agent output history**
- Added migration `0015_agent_outputs.sql`.
- Added `agent_outputs` schema and contracts for full content, input summary, evidence refs, confidence, agent version, output version, active state, and replaced-by linkage.
- Dashboard agent brief generation now writes an output row every time a brief is generated.
- Agent output audit events include agent id, agent version, input summary, evidence IDs used, output id, output version, confidence, and processing time.

**Rollback**
- Added repository and in-memory rollback methods that restore a prior output version, deactivate the current one, preserve all history, and write an `agent_output_rolled_back` audit event.
- Added `GET /api/agent-outputs` and `POST /api/agent-outputs/[id]/rollback`.

**UI**
- Extended Settings → Agent Governance with a searchable Agent Output Log.
- Added filters for agent and date range, plus rollback controls for historical outputs.

**Tests**
- Added coverage for output version history, active output switching, rollback, and rollback audit visibility.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 14 test files, 59 tests.
- `npm run build` passed.

**Still open**
- U4 learning-signal capture from approve/edit/reject decisions.

---

## 0.14.0 — U2 Agent Control Profiles Complete (2026-06-01)

This release completes the Phase 7D U2 governance blocker for the current V1.1 product surfaces.

**Agent Governance UI**
- Added Settings → Agent Governance with profile list, reviewer-friendly passport details, default seeding, edit-as-new-version, suspend, and resume controls.
- Added regulated-buyer demo passports for Regulatory Response Agent, Legal Redline Agent, and Proposal Partner Agent.

**Retrieval enforcement**
- Ask now accepts an `agentKey` governance lens and applies Agent Control Profile filters before vector and keyword ranking.
- pgvector retrieval now receives a passport-allowed candidate ID set so forbidden evidence cannot enter vector ranking results.
- Dashboard and Ask deny events are audited with agent key, evidence id, sensitivity, and reason.

**Output and tool controls**
- Added deterministic output gate for Ask and dashboard agent briefs.
- Legal/regulatory/pricing/data-residency/data-protection/external-communication triggers route to human review.
- Hard-stop outputs such as send email, submit filing, make payment, modify contract, contact regulator, external post, source-system writeback, HR action, legal commitment, or financial commitment are blocked and audited.
- Hard-stop output blocks suspend a persisted offending Agent Control Profile as the first watcher/suspend pathway. Rich watcher agents and notification routing remain U3 work.
- Added `guardToolInvocation()` so denied tool calls write `agent_tool_denied` audit events.

**Tests**
- Added coverage for Ask passport filtering, suspended agent refusal, regulatory escalation, hard-stop output blocking, denied tool-call audit events, and passport version retention.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 57 tests.
- `npm run build` passed.

**Still open**
- U3 searchable per-agent log and rollback.
- U4 learning-signal capture.
- Classifier-assisted output gate enrichment after persistent agent output records exist.

---

## 0.13.4 — Dependency Security Cleanup (2026-05-31)

This release clears the open GitHub Dependabot alert for PostCSS.

**Security**
- Fixed Dependabot alert #5: PostCSS XSS via unescaped `</style>` in CSS stringify output.
- Corrected the npm override so Next.js resolves to the patched root `postcss@8.5.15`.
- Removed the duplicate workspace-level override and regenerated `package-lock.json` from a clean install.
- Confirmed the vulnerable nested `next/node_modules/postcss@8.4.31` copy is gone.

**Verification**
- `npm audit --json` reports 0 vulnerabilities.
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

---

## 0.13.3 — Nexus Reassessment and Workflow Twin Realignment (2026-05-31)

This is a planning and roadmap realignment release. It does not ship new runtime product code.

**Product frame**
- Reframed NexusAI as a governed intelligence operating layer for high-stakes professional workflows.
- Locked the language shift away from generic autonomous-company / ExO rhetoric.
- Added a client-facing vocabulary preference: Strategic Mandate, Operating Doctrine, Policy Guardrails, Human Approval Layer, Parallel Workflow Pilot, and Decision Workflow Engine.
- Explicitly rejected broad "100x", workforce-replacement, and fully autonomous-company claims in client-facing copy.

**Roadmap sequence**
- Kept Phase 7D as the near-term engineering blocker track: finish U2 Agent Control Profiles, then U3 per-agent logs/rollback, then U4 learning-signal capture.
- Reworked Phase 8A so the first workflow twin is the broad, cross-industry Decision & Action Twin.
- Moved workflow scoring/client selection into Phase 8B.
- Added Phase 8C for the Ops Review Twin as the repeatable weekly operating cadence layer.
- Kept Proposal/SOW, Regulatory Response, and Agreement Review as later workflow templates, not the first universal product surface.

**Docs and tasks**
- Added `docs/NEXUS_WORKFLOW_TWIN_REALIGNMENT.md`.
- Updated `TASKS.md` with Phase 8A/8B/8C task structure and acceptance checks.

---

## 0.13.2 — U2 Agent Passport Foundation (2026-05-31)

This release starts the engineering implementation of U2 Agent Control Profiles. It does not complete the full U2 surface yet: Settings UI, output gates, Ask/vector passport filtering, and full tool-runtime audit wiring remain open.

**Agent passport contracts**
- Added Agent Control Profile enums and Zod contracts for status, action rights, risk rating, approval level, review cadence, log level, policy-controlled APIs, and full passport input/output shapes.
- Defined the V1 action-right ladder: `retrieve → summarize → draft → recommend → prepare_for_approval`.
- Added default hard stops and escalation triggers in code so high-risk actions remain outside prompt-only control.

**Persistence and APIs**
- Added migration `0014_agent_control_profiles.sql`.
- Added `agent_control_profiles` schema with versioned rows, unique `(workspace_id, agent_key, version)`, and `(workspace_id, agent_key, status)` index.
- Added repository and in-memory fallback methods to list, fetch history, fetch active profile, create a new version, seed defaults, and suspend an agent.
- Added admin API endpoints:
  - `GET /api/agent-control-profiles`
  - `GET /api/agent-control-profiles?agentKey=...`
  - `POST /api/agent-control-profiles?seed=1`
  - `POST /api/agent-control-profiles`
  - `POST /api/agent-control-profiles/[agentKey]/suspend`

**Server-side enforcement**
- Added default passport builder for all current specialist agents in `agent-library.ts`.
- Added `canReadEvidence()`, `filterEvidenceByPassport()`, and `canUseTool()` as server-side policy helpers.
- Dashboard generation now loads the active/default passport for each agent and filters evidence before any source text reaches LLM prompt context.
- Dashboard evidence-deny events now write to audit with agent key, evidence id, sensitivity, and deny reason.

**Tests**
- Added contract coverage for Agent Control Profiles.
- Added passport policy tests for sensitivity ceiling, forbidden scopes, missing sensitivity defaulting to restricted, hard-stop tool actions, action-right ceilings, and filtering denied evidence before model context.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 13 test files, 51 tests.
- `npm run build` passed.

**Still open**
- Agent Governance Settings UI.
- Explicit demo passports for Regulatory Response Agent, Legal Redline Agent, and Proposal Partner Agent.
- Ask/vector/keyword retrieval passport filtering.
- Tool runtime audit events for denied calls.
- Output gate and deterministic escalation routing.
- U3 searchable per-agent log and rollback.
- U4 learning-signal capture.

---

## 0.13.1 — Readiness On-Ramp and Governance Documentation (2026-05-31)

This release starts Phase 7D / V1.1 governance hardening while preserving an honest boundary: U1 is shipped, while U2/U3/U4 remain the next implementation work.

**Commit**
- Pushed `ba078f1` to `main`: `feat: ship v1 pilot hardening and readiness on-ramp`

**Readiness on-ramp**
- Added public `POST /api/readiness/submit` to capture AI-Native Readiness Assessment submissions as lead/audit events.
- Marked `/readiness` and `/api/readiness/submit` as public routes in middleware.
- Added rate limiting for readiness submissions.

**Governance and pilot-proof documents**
- Added `docs/AI_NATIVE_READINESS_ASSESSMENT.md`
- Added `docs/WORKFLOW_TWIN_SCORER.md`
- Added `docs/SHADOW_MODE_ROI_PLAYBOOK.md`
- Added `docs/GOVERN_ASSURE_MESSAGING.md`
- Added `docs/U2_AGENT_PASSPORT_SPEC.md`

**Product positioning**
- Updated `docs/ONE_PAGER.md` with Govern and Assure positioning: evidence provenance, sensitivity controls, human approval, agent passports, audit logs, and rollback-ready output history.
- Updated `TASKS.md` so U1 is marked complete and U2/U3/U4 remain the next Phase 7D blockers.

**Build hardening**
- Split client-safe filename classification into `lib/services/company-classification.ts`.
- Kept server-only LLM/company detection in `lib/services/company-detection.ts`.
- Fixed the production build issue where the onboarding wizard was pulling `pg` and Node-only modules into the browser bundle.

**Verification**
- `npx tsc --noEmit` passed.
- `npm run test` passed: 12 test files, 44 tests.
- `npm run build` passed.
- Secret scan found placeholders/test strings only, not real API keys.

**Still open**
- U2 Agent Control Profile/passport implementation.
- U3 searchable per-agent logs and rollback.
- U4 learning-signal capture.
- Render build should be confirmed in the Render dashboard after GitHub receives `ba078f1`.

---

## 0.13.0 — Phase 9D: Go-to-Market Execution + Production DB Migration (2026-05-31)

This release delivers the full commercial toolkit and applies all pending migrations to production.

**Production database**
- Migrations 0012 (workspace_status enum, trial_ends_at, llm_usage table) and 0013 (demo_mode column) applied to Neon production DB via `run-migrations.command`.
- Migrations 0009–0011 were also pending and applied in the same run (evidence_department, connector_instance, role_archetype).

**Product brief — `/product-brief` (public web page)**
- Full one-page product brief: problem, solution, how it works, 4-step flow, agent rooms, evidence source types, pilot outputs, sector fit, pricing tiers, competitor comparison table, 3-step pilot start.
- No authentication required — shareable link to send after a first call.
- Print → PDF via browser. Added to public routes in middleware.

**Pilot SOW templates (3 Word documents)**
- `NexusAI_SOW_Fintech.docx` — Regulated financial services variant. Gulf Capital Partners context.
- `NexusAI_SOW_ProfessionalServices.docx` — Management consulting / professional services variant.
- `NexusAI_SOW_DigitalNative.docx` — SaaS / D2C / digital-native variant.
- All three share the same 12-section structure: cover page, context, objectives, scope, deliverables table, client responsibilities, timeline table, commercial terms, assumptions, AI responsibility, governance, signatures.
- Built with docx-js. Professional typography, dual-width tables, page footers, signature blocks.

**Demo scripts + competitor comparison (1 Word document)**
- `NexusAI_DemoScripts_CompetitorComparison.docx`
- Script 1: Fintech CEO — Executive Command Room, Risk Room, Ask panel, weekly brief export. 15 minutes.
- Script 2: Consulting Managing Partner — BD pipeline, delivery intelligence, people signals, one-pager export. 15 minutes.
- Script 3: D2C/SaaS Founder — MRR, customer health, engineering health, board export. 15 minutes.
- Each script has timed sections, SAY/ASK callout boxes, and a closing question to determine pilot scope.
- Competitor comparison: NexusAI vs ChatGPT Enterprise vs Glean vs BI tools. 13-row feature matrix. Objection handling for 5 common objections (ChatGPT, Glean, BI, data privacy, integration).

**ROI calculator + pilot review templates (1 Excel file)**
- `NexusAI_PilotROI_ReviewTemplates.xlsx` — 3 sheets, zero formula errors.
- Sheet 1 — ROI Calculator: editable inputs (hours saved/week per role, exec cost/hr, pilot fee). Auto-calculates value recovered, net value, ROI multiple, payback period. Industry-standard color coding (blue = input, black = formula).
- Sheet 2 — Pilot Review Template: Day 30/60/90 columns for usage metrics, scorecard status, qualitative feedback, and renewal discussion.
- Sheet 3 — Kickoff Agenda: 60-minute structured agenda with timed slots, topic, and actions/owner. Complete with meeting details header.

**Verification**
- `npx tsc --noEmit` passed (clean)
- Excel validated with recalc.py — 0 formula errors

---

## 0.12.0 — Phase 8: Paid Pilot Packaging (2026-05-30)

This release delivers the complete commercial layer — everything needed to convert a demo into
a signed pilot and deliver value to a sponsor within 24 hours.

**Export artifact layer**
- `lib/services/exports.ts` (pre-existing data layer) now has four API routes:
  `GET /api/export/weekly-brief`, `/api/export/risk-radar`, `/api/export/reco-register`,
  `/api/export/one-pager`
- Risk radar and recommendation register support `?format=csv` — returns a download-ready CSV
  with filename including workspace name and date
- `/export` hub page — links to all four artifacts with format badges (PDF vs CSV)
- `/export/weekly-brief` — client-rendered print page. AI brief per active role, risk table,
  recommendation summary. "Save as PDF" triggers browser print.
- `/export/one-pager` — single-page executive summary: metrics, active roles, findings, risks,
  open recommendations. Board/exec share in 2 minutes.
- Exports section added to side nav

**Demo mode**
- `demo_mode` boolean column added to `workspace_settings` schema + migration 0013
- `WorkspaceSettings` contract and store updated to include `demoMode`
- PURPLE "DEMO" badge in layout top bar when demo mode is on
- Ingestion (`POST /api/ingestion/status`) returns 403 when demo mode is active
- Settings → Demo Tools tab: toggle demo mode, reset workspace to sector pack
- `PATCH /api/settings/workspace` now accepts `demoMode`

**Demo workspace reset**
- `lib/demo/sector-packs.ts` — three realistic sector demo packs (each 5 documents):
  - `financial_services`: Gulf Capital Partners — board pack, CBUAE findings, payments report, portfolio risk review, digital roadmap
  - `professional_services`: Meridian Advisory Group — BD pipeline, utilisation, Saudi expansion, project status, people review
  - `technology_saas`: Vanta Systems — MRR dashboard, product roadmap, customer health, sprint report, Series B investor update
- `POST /api/workspace/demo-reset?sector=<sector>` — requires demo mode ON. Clears existing
  evidence and recommendations, updates workspace profile to match sector, seeds 5 documents
  at 88% confidence (auto-processed), fires recommendation generation. Writes audit event.

**Pilot sponsor kit**
- `/pilot-kit` — print-ready page with two sections:
  - Sponsor Onboarding Checklist: 5-step guide (before login, Day 1, first week, first month, success criteria). Print → PDF and share at kickoff.
  - Pilot Success Scorecard: 7-outcome table with Day 30/60/90 columns and sponsor sign-off blocks.
- Pilot Kit link added to side nav Exports section
- `docs/PILOT_BILLING_TRIGGERS.md` — documents conditions for trial → pilot → active status changes,
  suspension logic, manual override SQL, pricing tiers, and automation specification for Phase 7C Stripe wiring

**Verification**
- `npx tsc --noEmit` passed (clean, no application code errors)

---

## 0.11.0 — Phase 7C: Production Operations (2026-05-30)

This release completes the code layer of Phase 7C. No user-facing features — this is the
foundation that makes the product safe to charge for.

**Security hardening**
- Added full `Content-Security-Policy` header to all responses. Strict-dynamic in production,
  unsafe-inline in dev. Previous header set was missing CSP entirely.
- Added CORS policy: production domain only (`NEXT_PUBLIC_APP_URL`), never wildcard.
  Preflight (OPTIONS) handled correctly. All API routes enforce origin check in production.
- Added in-process sliding-window rate limiting in middleware:
  Auth routes 10/min, ingestion 20/min, ask 30/min, dashboard 60/min — all per IP.
  Exceeding the limit returns 429 with `Retry-After` and `X-RateLimit-*` headers.

**Workspace status and trial mode**
- Added `workspace_status` enum: `trial | pilot | active | suspended | cancelled`
- Added `trial_ends_at`, `suspended_at`, `stripe_customer_id`, `stripe_subscription_id` to workspaces
- Migration `0012_workspace_status.sql` — existing workspaces defaulted to `active`
- `repository.getWorkspaceStatus()` returns current status + trial expiry. Falls back to `active`
  when DB is unavailable so dev mode is never incorrectly blocked.
- Trial banner shown in layout for `trial` status workspaces — shows days remaining, dismissable
- Suspension banner shown for `suspended` workspaces with support contact link

**LLM cost tracking**
- New `llm_usage` table in schema and migration 0012: workspace, day, model, route,
  input/output tokens, cost in micro-USD
- `repository.recordLLMUsage()` writes a record after every LLM call — fire-and-forget,
  never blocks the response
- `persistUsage()` in `llm.ts` calls the repository after both Anthropic and DeepSeek paths.
  `estimateCostMicro()` computes cost by model family (Opus, Sonnet, Haiku, DeepSeek).
- `route` field added to `LLMOptions` for per-call-site cost attribution

**In-app feedback button**
- `components/feedback-button.tsx` — floating persistent button on all dashboard pages
- Opens a modal (subject + message, both validated). POSTs to `POST /api/feedback`.
- `app/api/feedback/route.ts` — writes to audit log via `repository.pushAudit()`.
  Logs support email intent when `NEXUS_SUPPORT_EMAIL` is set.

**Documentation**
- `docs/DR_RUNBOOK.md` — disaster recovery runbook: DB loss, R2 unavailable, Clerk failure,
  LLM provider down, full outage, migration rollback SQL reference, contact directory,
  post-incident checklist
- `docs/SECURITY_REVIEW.md` — pre-pilot security checklist with REQUIRED vs RECOMMENDED items,
  sign-off table, and deferred Phase 2 items flagged for regulated-sector scale

**Verification**
- `npx tsc --noEmit` passed (clean)

---

## Planning — V1.1 ExO Upgrade Plan + Naming Fix (2026-05-30)

Strategic planning session based on ExO 3.0 / Organizational Singularity framework
(Moonshots EP #258, Salim Ismail, May 2026).

**Added to docs:**
- `docs/V1_1_UPGRADE_PLAN.md` — full upgrade backlog with Tier 1/2/3 sequencing,
  build cards for U1–U9, acceptance tests, phase mappings, and explicit rejection list
  for claims that are credibility poison in regulated/GCC institutional settings

**Added to TASKS.md:**
- Phase 7D (Governance Hardening) with four Tier 1 items:
  U1 (AI-Native Readiness Assessment), U2 (Agent Control Profile/passport),
  U3 (searchable per-agent log + granular rollback), U4 (learning-signal capture)

**Naming fix — OpenClaw removed from all client-facing documents:**
- `README.md` System Shape section rewritten — no third-party tool references
- `docs/INSTALL.md` rewritten as a clean NexusAI installation guide
- `docs/PRODUCTION_READINESS.md` reference updated
- Internal TASKS.md references to OpenClaw as a study subject retained (correct context)
- AGENT_ROOMS.md references retained (research context, not product claims)

**n8n decision:** Not needed for V1.1. Flag as a Phase 14 architecture option for
the Orchestration Layer workflow runner. Document below.

---

## Planning — Full Roadmap Tighten (2026-05-30)

No code shipped. TASKS.md, HANDOVER.md, and ROADMAP.md updated to reflect the full product
vision and correct the gap between planning documents and actual codebase state.

**Added to TASKS.md:**
- Phase 7C — Production Operations: billing/Stripe, operational monitoring (Sentry, LLM cost
  tracking, uptime), security hardening (headers, rate limits, vulnerability scanning), backup
  and disaster recovery, customer support infrastructure
- Phase 9C — Data Residency and Compliance: PDPL (Pakistan), Saudi NCA Cloud Policy,
  CBUAE/UAE TDRA, DIFC/ADGM, GDPR, data processing register, breach response plan
- Phase 9D — Go-to-Market Execution: pilot proposal template, demo scripts (3 archetypes),
  competitor comparison, ROI calculator, pilot review decks, case study template,
  partnership model
- Phase 10 expanded from 22 generic bundle bullets to 72 individual connector tasks, each
  specifying system, data objects, auth method, ingestion frequency, and consuming agent.
  Renamed to "Core Enterprise SaaS Connectors" to clarify distinction from Phase 10B.
- Phase 11 expanded from 5 thin tasks to 15 individual social connector tasks plus competitor
  intelligence, Google Alerts, news monitoring, and social listening specifications
- Phase 11B — Language Support: Arabic and Urdu across three phases (RTL detection/formatting,
  UI translation, native-language brief generation)
- Phase 14 reconciled with Phase 7A — explicit note that Phase 7A is read-only brief
  generation and Phase 14 is autonomous task execution with approval checkpoints
- Pre-Phase 7A, Phase 7A, Phase 7B headers updated to mark as complete with version references
- Strategic build priority and current status sections updated to reflect v0.10.3 reality

**Roadmap coherence issues resolved:**
- Phase 9 (Team Members) tasks were missing — restored with full 10-task spec
- Phase 8 (Pilot Packaging) expanded from 7 thin tasks to 12 detailed tasks with
  demo mode flag, sector demo packs, billing triggers, and pilot management templates
- Phase 2 open items flagged with context: 4 tasks deferred, needed before regulated-sector scale
- Phase 7B outstanding UI items corrected — now marked complete per v0.10.3 CHANGELOG

---

## 0.10.3 — Phase 7 Completion: Brief Language, Agent Rooms, and Archetype Controls (2026-05-30)

This release closes Phase 7A/7B for the V1 pilot scope. NexusAI now adapts not only which roles and agents it shows, but also how those agents speak and which evidence they expect for different company archetypes.

**Brief-language modes**
- Added archetype evidence expectations for corporate, startup/scale-up, SME physical, digital-native, and professional-practice companies
- Added formal vs plain brief-language instructions to company context
- SME / owner-operated businesses now get explicit plain-language rules: 2-3 short sentences, one clear action, and no board-pack/IRR/WACC/covenant-style wording
- Dashboard agent prompts now receive the brief-language rule directly, so agent briefs adapt at generation time

**Agent Room completion**
- Dashboard page titles and side nav now use Agent Room labels, including Finance, Risk, and People rooms
- Dashboard pages support agent-level filtering with `?agent=...`, so users can isolate a single specialist brief inside a room
- SME physical workspaces adapt dashboard page titles to Owner/Ops/Accounts-style briefs
- SME owner briefs now use local business, cash/runway, and execution agents rather than generic executive-only briefs

**Settings and taxonomy**
- Company Profile settings now include company archetype, brief language, location count, profile timestamp, evidence expectations, and stored role states
- Added `docs/SECTOR_GAPS.md` to document sector gaps and archetype-first handling for companies outside the initial taxonomy
- File classification now detects local ad performance and location labels in filenames for owner-operated and multi-location businesses

**Verification**
- Added brief-language tests
- Expanded role-suggestion and file-classification tests
- `npx tsc --noEmit` passed
- `npm run test` passed: 12 files, 44 tests

---

## 0.10.2 — Phase 7A Agent Briefs and Digital Evidence Classification (2026-05-30)

This release deepens the specialist-agent model and teaches ingestion to recognize digital-native, social, WhatsApp, creator, local-business, and email/CRM evidence instead of treating those files as generic uploads.

**Expanded specialist agents**
- Added finance agents for finance signals, cash/runway, and margin variance
- Added risk/compliance agents for regulatory obligations and audit findings
- Added marketing agents for performance marketing, brand/community, and creator performance
- Added product, customer success, people, clinical risk, supply chain, project control, legal exposure, and local business agents
- Updated expanded role mappings so CFO, CRO, CCO, CMO, Growth, Performance Marketing, Brand/Community, CPO, CHRO, Customer Success, Chief of Staff, Managing Partner, Chief Medical, Supply Chain, Project Director, Practice Lead, General Counsel, and Franchise Manager receive sharper agent brief sets

**Digital/social evidence classifier**
- `classifyFilename()` now recognizes `ad_performance`, `social_export`, `whatsapp_business`, `local_business`, `creator_performance`, and `email_crm`
- Paid ads exports now carry extraction hints for ROAS, impressions, CPM, CPC, CTR, conversions, spend, creative, audience, frequency, reach, and campaign status
- WhatsApp Business and creator/influencer evidence are elevated to confidential by default
- Ad delivery health signals such as learning phase, budget constrained, creative fatigue, audience overlap, and frequency now produce evidence warnings
- Ingestion now preserves classifier-selected `sourceType` when the uploader does not explicitly provide one, and returns classification hints/warnings in the upload response

**Verification**
- Added `file-classification.test.ts` coverage for paid ads, WhatsApp Business, Google Business Profile, email CRM, and regulated-sector sensitivity elevation
- `npx tsc --noEmit` passed
- `npm run test` passed: 11 files, 38 tests
- `npm run build` passed: 44 routes

---

## 0.10.1 — Phase 7A Wizard Role Selection (2026-05-30)

This release makes the Phase 7A role engine visible in onboarding. Step 4 is no longer a static four-role selector — it is now driven by the archetype-aware role suggestion engine.

**Role-selection UI**
- Step 4 now takes the full detected company profile instead of a string list of suggested roles
- Roles are generated from `suggestRolesForProfile()` and rendered with adaptive labels, badges, reasons, relevance scores, and evidence-scope descriptions
- CEO/Owner/Managing Partner is locked and always selected
- Staged roles render in a separate "Roles to stage for later" section with activation conditions
- Users can activate staged roles early; activated staged roles become selected and are persisted

**Dual-hat handling**
- Small-company and early-stage roles expose a "covered by another person / dual-hat" toggle
- Dual-hat roles persist into `roleStates` with `state: "dual_hat"` and `dualHatOf: "ceo"`
- Selected roles persist back to `/api/workspace/profile` before the wizard moves to upload

**Ambiguous-company fallback**
- When `requiresRoleConfirmation` is true, Step 4 asks how the company makes money and what leaders worry about
- Answers apply deterministic role signals for finance, risk/compliance, customer, people, technology, and performance marketing
- This avoids forcing unusual businesses into generic corporate defaults

**Verification**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

---

## 0.10.0 — Phase 7A Foundation: Roles and Archetypes (2026-05-30)

This release starts Phase 7A by adding the domain model that lets NexusAI adapt to different company types instead of forcing every customer into four corporate dashboards.

**Business archetypes**
- Added `companyArchetype` to detected and persisted workspace profiles
- Supported archetypes: `corporate`, `startup_scaleup`, `sme_physical`, `digital_native`, and `professional_practice`
- Added `briefLanguageMode`, `archetypeVersion`, `locationCount`, and `roleStates` to workspace profiles
- Added migration `0011_role_archetype.sql` for the new workspace profile fields
- `buildCompanyContext()` now includes archetype and brief-language mode for downstream LLM prompts

**Role registry**
- Added `lib/domain/role-registry.ts` as the first source of truth for role definitions
- Defined universal, regulatory, growth, technology/product, people, sector-specific, and future-stage roles
- Added archetype-aware labels, including Owner for `sme_physical` and Managing Partner for `professional_practice`
- Added finance, risk, and people room paths as first-class dashboard paths: `/dashboard/cfo`, `/dashboard/cro`, `/dashboard/chro`
- Added `ROLE_AGENT_BRIEFS` mappings for the expanded role set using the existing specialist agents

**Deterministic role suggestion engine**
- Added `lib/services/role-suggestion.ts`
- `suggestRolesForProfile()` scores roles by archetype, sector, stage, size, regulatory trigger, business model signal, and free-text keywords
- CEO is always first, locked, and label-adaptive
- Staged roles include activation conditions
- Early-stage/small-company roles can be marked as dual-hat candidates
- Added unit tests for owner labeling, regulated financial services risk/compliance, and digital-native performance marketing

**Company detection integration**
- `detectCompanyProfile()` now asks the LLM for `companyArchetype`
- Role suggestions now come from the deterministic role engine, not directly from the LLM
- Detection output includes `suggestedRoleReasons`, `stagedRoles`, `roleStates`, and `requiresRoleConfirmation`
- Manual sector fallback profiles now include archetype defaults and role-state defaults

**Verification**
- `npx tsc --noEmit` passed
- `npm run test` passed: 10 files, 33 tests
- `npm run build` passed: 44 routes

---

## 0.9.1 — Phase 7A Technical Prep (2026-05-30)

This release clears the two technical blockers needed before the full role system and business archetype expansion can begin.

**Open-ended role routing**
- `roleSchema` now accepts safe string role keys instead of only `ceo`, `coo`, `cbo`, and `cto`
- Added `KNOWN_ROLES` for current built-in roles while allowing future/custom roles like `cfo`, `cro`, `cmo`, `owner`, `managing_partner`, and `vp_performance_mktg`
- Dashboard API now returns `knownRole` so UI/API clients can distinguish built-in roles from newly introduced roles
- Dynamic dashboard pages no longer 404 for valid new role keys; unknown roles receive generic room metadata and fallback specialist-agent briefs
- Agent library now uses `Partial<Record<string, string[]>>` plus `agentBriefIdsForRole()` fallback instead of a closed `Record<Role, string[]>`
- Repository and in-memory role summaries now accept any role key and fall back to "Specialist evidence brief and next-best action"

**Connector provenance on evidence**
- Added optional `connectorInstanceId` to evidence contracts and ingestion input
- Added nullable `connector_instance_id` to `evidence_records` via migration `0010_connector_instance.sql`
- Added `(workspace_id, connector_instance_id)` index for future connector sync/filtering
- Repository maps connector instance IDs to and from Postgres; manual uploads remain null by default
- `POST /api/ingestion/status` accepts `connectorInstanceId`, includes it in audit payloads, and returns it in upload responses

**Verification**
- `npx tsc --noEmit` passed
- `npm run test` passed: 9 files, 30 tests
- `npm run build` passed: 44 routes

---

## 0.9.0 — AI Onboarding Strategist (2026-05-30)

The onboarding wizard now acts as a senior business analyst, not a form wizard. Every step is sector-aware and AI-assisted.

**Focus mapping — `mapFocusToDashboard`**
- New LLM function in `lib/services/company-detection.ts`
- User types a plain-English priority ("What's blocking growth and what risks need my attention?")
- AI returns: recommended dashboards to start on, 3 specific first questions, and a one-sentence focus summary
- Exported as `FocusMapping` type
- Falls back to null gracefully when LLM is unavailable

**New API: `POST /api/workspace/first-focus`**
- Accepts intent text, fetches workspace profile, builds company context, calls `mapFocusToDashboard`
- Returns `FocusMapping` or 422 when LLM unavailable
- Scope: admin

**Ingestion — sector-aware file classification everywhere**
- `POST /api/ingestion/status` now calls `classifyFilename` on every uploaded file
- Fetches workspace profile to get sector before classifying — fintech files get confidential by default, tech files get internal
- Caller-supplied department/sensitivity still takes precedence; auto-classify is a smart fallback
- Previously, sector-aware classification only happened inside the onboarding wizard

**Wizard — Step 3 (Profile Confirmation)**
- New "Governance and Policy Defaults" panel showing auto-approved threshold (75%+), pending review band (35–75%), quarantine floor (<35%), and sensitivity default
- Regulated-sector callout for financial_services and healthcare explains elevated confidentiality defaults
- Users now understand what will be applied before they upload anything

**Wizard — Step 5 (Upload)**
- `classifyFilename` now receives `profile.sector` instead of an empty string
- Department and sensitivity suggestions are sector-aware from the first file selection

**Wizard — Step 7 (Go Live)**
- Transformed from static role cards into an AI focus experience
- User types their priority; "Map my focus with AI" calls the first-focus API
- Role cards update: AI-recommended dashboards get a "Start here" badge and preview the first suggested question
- Clicking a recommended card passes the first question as `?q=` URL param so the Ask panel pre-populates
- Falls back to the standard role-card grid when LLM unavailable

---

## 0.8.0 — AI-Assisted Onboarding: Company Detection (2026-05-29)

**Company detection service — `lib/services/company-detection.ts`**
- `detectCompanyProfile(description)` — LLM infers sector, subsector, business model, stage, region, goals, risk profile, priority roles, 5 suggested documents, KPIs, and risks from a free-text description
- `classifyFilename(filename, sector)` — deterministic keyword classifier for department and sensitivity, sector-aware sensitivity elevation for financial_services and healthcare
- Default document packs per sector when LLM is unavailable
- `DetectedProfile` and `SuggestedDocument` types exported

**New API: `POST /api/workspace/detect-profile`**
- Accepts company description (10–2000 chars), calls `detectCompanyProfile`, returns `DetectedProfile`
- Falls back with 422 when LLM unavailable so wizard can show manual fallback

**7-step onboarding wizard**
- Step 1: Workspace provision
- Step 2: AI Discovery — free-text description (Describe tab) or Browse-by-sector grid
- Step 3: Profile Confirmation — sector, subsector, business model, stage, region, goals, documents, KPIs, risks; editable before saving
- Step 4: Role Selection — AI pre-selects roles from detected profile; Add Role feature for custom roles (CFO, CRO, Risk/Compliance, etc.)
- Step 5: Upload — sector-aware suggested document pack shown; drag-drop multi-file; AI-suggested department and sensitivity per file
- Step 6: Evidence Preview — ingestion status, confidence bar, pending/quarantine callouts
- Step 7: Go Live — role card grid

---

## 0.7.0 — Company Context and Sector-Aware Intelligence (2026-05-28)

**Sector library — `lib/domain/sector-library.ts`**
- 8-sector taxonomy: Financial Services, Professional Services, Technology/SaaS, Manufacturing, Retail/Commerce, Healthcare, Real Estate/Construction, Education/Training
- Each sector defines: defaultRoles, commonKPIs, commonRisks, documentTypes, recommendedDashboards, commonRecommendations, sensitivityDefault
- `getAllSectors()`, `getSector()`, `buildCompanyContext()` helpers
- `buildCompanyContext()` produces a compact <300-token block injected into every LLM prompt

**Workspace profile — `db/schema.ts` + migration `0008_workspace_profile.sql`**
- New `workspaceProfiles` table: sector, subsector, businessModel, companyStage, employeeBand, region, primaryGoals, riskProfile, priorityRoles
- `getWorkspaceProfile()` and `saveWorkspaceProfile()` in repository with in-memory fallback in store

**Profile API — `GET|POST /api/workspace/profile`**
- GET returns current profile (read:dashboard scope)
- POST upserts profile (admin scope), Zod-validated

**Company context injected into all LLM calls**
- `lib/services/dashboard.ts` — `buildCompanyContext(profile)` prefixed on every dashboard card prompt
- `lib/services/recommendations.ts` — profile context prefixed on recommendation generation prompt
- `lib/services/retrieval.ts` — profile context prefixed on Ask synthesis prompt

---

## 0.6.0 — UI/UX Hardening: Waves 1 and 2 (2026-05-26)

**Wave 1 fixes**
- Active side-nav highlighting for all routes
- Suspense loading skeletons on all four dashboards
- Ingestion UX: action links, confidence label, quarantine refresh path
- Recommendations: actor handling, empty state, history truncation
- Multi-file upload in wizard (batch up to 10)

**Wave 2 fixes**
- Consolidated 4 duplicate dashboard pages into one dynamic `/dashboard/[role]` route
- Added disabled states in globals.css for locked controls
- Evidence refs shown in recommendations instead of raw IDs
- Full UI/UX audit document created at `UIUX_AUDIT.md`

---

## 0.5.0 — Recommendations, Charts, and Dashboard Intelligence (2026-05-24)

**Recommendation generation — `lib/services/recommendations.ts`**
- `generateRecommendations(workspaceId)` — LLM synthesizes actionable recommendations from top processed evidence
- Fire-and-forget call after every successful ingestion
- Approval workflow: recommend → pending → approved/rejected with audit trail

**Dashboard charts — `components/dashboard-charts.tsx`**
- Pure SVG chart primitives (bar, line, sparkline, gauge) in `components/charts.tsx`
- Role-specific data cards for CEO, COO, CBO, CTO
- Skeleton loader while data loads

**CTO/CDO dashboard**
- Technology health, data quality, security posture, infrastructure signals

**OAuth2 and API key management**
- `POST /api/oauth/token` — client_credentials flow for LLM agent access
- `GET|POST|DELETE /api/agent-keys` — manage API keys per workspace
- Bearer scope validation across dashboard, ask, and recommendation routes

---

## 0.4.0 — Clerk Auth, Tenant Isolation, and Cloud Deploy (2026-05-22)

**Clerk integration**
- Replaced custom session auth with Clerk identity in all API routes
- Clerk orgId used as `workspaceId` throughout for multi-tenant isolation
- `/sign-in` and `/sign-up` Clerk-hosted pages
- Middleware protecting all `/dashboard`, `/ask`, `/ingestion`, and `/api` routes

**Cloud deploy**
- Neon Postgres + pgvector provisioned
- 8 deployment env vars confirmed
- Migrations 0006 (embeddings), 0007 (vector index), 0008 (workspace profiles) run against production

**Slack OAuth**
- Full OAuth install flow: `/api/connectors/slack/install` and `/api/connectors/slack/callback`
- Connector registry in Settings with status, health, last sync

---

## 0.3.0 — Vector Search, Evidence Approval, and Settings (2026-05-20)

**pgvector retrieval — `lib/services/retrieval.ts`**
- Two-tier: Tier 1 vector (HNSW cosine similarity via `text-embedding-3-small`), Tier 2 keyword ranking fallback
- `NEXUS_VECTOR_SEARCH=enabled` flag; silent fallback when disabled
- Migration `0007` adds `embedding vector(1536)` to evidence_records and HNSW index

**Evidence approval screen**
- `/approvals` page with pending-approval queue
- `POST /api/approvals/:recommendationId` — approve or reject
- `POST /api/evidence/:id/review` — sign off individual evidence before dashboard use

**Settings page**
- Workspace settings: org name, sensitivity defaults, quarantine threshold
- Policy settings: LLM provider, approval modes, data retention
- Connector registry

**Ingestion hardening**
- File size guard: 50 MB hard cap
- Slack signature verification on webhook events
- Freshness computed dynamically on read (not just at ingest)

---

## 0.2.1 - DB Required Mode + Migration/Seed Hardening
- Added DB-required policy (`NEXUS_DB_REQUIRED`) with production-safe defaults.
- Added startup DB health check path in Mission Control layout.
- Added DB-backed auth path with salted password hashing and workspace membership verification.
- Added users auth migration (`0002_auth_users.sql`) and seed bootstrap for admin credentials in DB.
- Added migration tooling and scripts:
  - `db/migrations/0001_init.sql`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:check`
  - `npm run db:generate` (Drizzle)
- Added seeded demo records for tenant/workspace/evidence/recommendations/decisions.
- Updated schema IDs to text keys to stay compatible with existing demo and pipeline IDs.
- Added DB policy tests.

## 0.2.0 - Mission Control V1 Stack (Pilot Build)
- Added monorepo workspace foundation and `apps/mission-control` Next.js app.
- Added Mission Control route scaffolding:
  - `/dashboard/ceo`, `/dashboard/coo`, `/dashboard/cbo`
  - `/ask`, `/sources`, `/ingestion`, `/review`, `/recommendations`, `/decisions`, `/evidence/[id]`
  - `/settings/workspace`, `/settings/policies`
- Added API routes:
  - `GET /api/dashboard/:role`
  - `GET /api/recommendations`
  - `GET /api/evidence/:id`
  - `POST /api/approvals/:recommendationId`
  - `GET|POST /api/ingestion/status`
  - `POST /api/ask`
  - `POST /api/slack/events`
- Added core contracts and in-memory pilot store with append-only audit events.
- Added deterministic ingestion extraction path (PDF/DOCX/PPTX/XLSX/text) with confidence scoring and quarantine gating.
- Added retrieval service with evidence refs, confidence/freshness, refusal path, and restricted-evidence filtering.
- Added recommendation approval workflow and review/audit visibility.
- Added Drizzle Postgres schema scaffold for tenant/workspace/evidence/recommendation/decision/approval/audit models.
- Added pilot documentation pack:
  - onboarding checklist
  - security and data-handling one-pager
  - pilot success scorecard
  - executive pack template
- Added test coverage for contracts, ingestion policy, retrieval behavior, and approvals.
- Added login layer:
  - session cookie auth middleware
  - `POST /api/auth/login` and `POST /api/auth/logout`
  - `/login` UI and sign-out control in Mission Control shell
- Updated default login credentials to `admin / admin` (configurable via env).

## 0.1.1 - Launch Kit
- Added launch landing-page copy
- Added launch post template
- Added reusable visual assets for release and social posts
- Added contributor guide and launch kit folder

## 0.1.0 - Public Launch
- Open-sourced Nexus Core under MIT
- Added one-command install
- Added `nexus` shell wrapper with `doctor`, `status`, `setup`, `help`, and `init`
- Added JSON health checks
- Added workspace scaffolding
- Added buyer one-pager, pilot SOW template, contribution guide, and demo examples
