# Changelog

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

## 0.4.0 — Clerk Auth, Tenant Isolation, and Vercel Deploy (2026-05-22)

**Clerk integration**
- Replaced custom session auth with Clerk identity in all API routes
- Clerk orgId used as `workspaceId` throughout for multi-tenant isolation
- `/sign-in` and `/sign-up` Clerk-hosted pages
- Middleware protecting all `/dashboard`, `/ask`, `/ingestion`, and `/api` routes

**Vercel deploy**
- Neon Postgres + pgvector provisioned
- 8 Vercel env vars confirmed
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
