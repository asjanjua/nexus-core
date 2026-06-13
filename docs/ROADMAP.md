# NexusAI Mission Control — Product Roadmap

> This document captures the design thinking and product direction behind NexusAI, not just the feature list.
> The TASKS.md file contains the detailed checklist. This document captures the *why*.

---

## Design Principles

**1. AI as analyst, not assistant.**
NexusAI should feel like a senior analyst embedded in the executive team. Every AI touch-point should demonstrate the system understands the business — sector, stage, risks, goals — before a question is asked.

**2. Evidence first, always.**
Every answer, recommendation, and brief must link back to a source document. No speculation, no hallucination. The confidence score and evidence refs are not optional UI elements — they are the product.

**3. Human approval at high-impact boundaries.**
AI can detect, classify, summarize, draft, and recommend. Humans approve anything that leaves the system, commits resources, or changes a record outside Nexus. This is not a limitation — it is the trust model that makes Nexus safe to deploy in regulated and executive environments.

**4. Sector-aware from first contact.**
The product should know what a fintech CFO cares about and what a manufacturing COO worries about, without being told. Sensitivity defaults, KPI suggestions, document starter packs, and risk signals should all be pre-loaded from sector context.

**5. Company memory compounds.**
Every document uploaded, every question asked, every decision logged makes Nexus smarter for that company. The goal is a product where users feel the system is learning their business, not just answering ad-hoc queries.

---

## Where We Are -- Current State (v0.23.0, verified 2026-06-13)

The product is demo-ready and pilot-ready. 24 DB migrations, 28 test files / 179 tests passing.

**What is built and verified:**

- **Onboarding:** 7-step AI-assisted wizard with company detection, archetype selection, 20-role registry with deterministic relevance engine, governance defaults, focus mapping.
- **Ingestion:** Multi-file upload with sector-aware classification, digital/social/WhatsApp evidence types, confidence routing (processed/pending/quarantined), pgvector embeddings, R2 file storage.
- **Retrieval:** Two-tier search (pgvector + keyword fallback). Company context injected on every LLM call. Agent Control Profile passport filtering before evidence enters model context.
- **Dashboards:** 7 Agent Rooms with named specialist agents. 20 role dashboards with archetype-aware brief language. Agent briefs saved as versioned outputs with rollback.
- **Ask:** Natural language Q&A with evidence refs, confidence scores, passport filtering, output gates, escalation triggers, and persistent recent-turn conversation memory for follow-up questions.
- **Governance:** Agent Control Profiles (passports) with evidence scoping, sensitivity ceilings, tool guards, hard-stop blocking, output gates, suspend/resume. Per-agent output log with rollback. Learning signal capture (approve/edit/reject/thumbs) with quality summary.
- **AI Trust Layer:** Eval harness, prompt registry, red-team output checks, provider allow-list, local-only mode, sensitivity ceiling, and confidence threshold controls.
- **Executive Synthesis:** On-demand role-aware leadership brief on each dashboard, with specialist agent cards as collapsible drill-down, source pills/entity chips for traceability, and manual refresh saved to output history.
- **Scheduled Synthesis:** Workspace schedule config, protected cron endpoint, test-run button, and in-app output history persistence.
- **Decision Twin:** Full CRUD for decisions and actions with priority, deadline, blocker flags, status tracking, audit trail, plus AI proposal extraction from recent agent outputs. Interactive `/decisions` page.
- **Workflow Twin substrate:** Workflow twin and run history tables/APIs for Decision & Action, Workflow Scorer, and Ops Review primitives.
- **Company Memory:** Processed evidence extracts people, organizations, risks, KPIs, amounts, dates, systems, and processes into `entities`, linked back to source evidence through `evidence_entity_links`. `/entities` and `/entities/:id` expose backlinks, timelines, evidence, decisions, recommendations, and actions.
- **Billing Tiers:** Four-tier plan model (Free/Pro/Business/Enterprise) with per-workspace LLM token budgets, feature gating (8 flags), monthly cron reset, plan definitions table, and Plan & Usage settings tab.
- **Stripe Integration:** Pure-fetch Stripe client (no SDK). Checkout Session for self-serve upgrades, Billing Portal for subscription management, HMAC-SHA256 webhook handler (5 event types: checkout, subscription updated/deleted, invoice paid/failed), trial-to-free cron conversion.
- **Orchestration Dispatcher:** `dispatch_jobs` DB queue with atomic claim (`FOR UPDATE SKIP LOCKED`), priority 1-10, exponential backoff retry (30s/5m/30m), fan-out enqueue, 4 job type handlers (agent_brief, synthesis, workflow_run, decision_extract), dispatch API (POST/GET/DELETE /api/dispatch), cron runner at `/api/cron/dispatch`.
- **Slack Connector Ingestion:** first inbound connector data flow. Allowlisted channel messages become governed evidence with provenance, confidence, sensitivity, source path, connector instance, and audit events. DMs, bot/system subtypes, unsupported events, and non-allowlisted channels are skipped and audited.
- **Exports:** Weekly brief, risk radar CSV, reco register CSV, one-pager. Export hub.
- **Demo/Sales:** 3 CEO-grade demo sector packs, demo mode with reset, pilot kit, product brief page, readiness assessment (public), SOW templates, demo scripts, ROI calculator.
- **Auth:** Clerk SSO, scope-based API keys, workspace status (trial/pilot/active/suspended), LLM cost tracking.

**What is confirmed missing (2026-06-13 audit):**

- Connector Settings UX for Slack channel selection, sync status, and source-level sensitivity controls.
- Additional live connector data flows beyond Slack: Google Drive, Teams, SharePoint, Jira, GitHub, CRM, finance, and social platforms.
- Workflow Twin Scorer code path.

---

## Next Priorities

### Recently Shipped

**Orchestration Dispatcher** (v0.22.0)
Background job queue decoupling submission from execution. Any service can call `enqueueJob()` instead of making a synchronous LLM call. The cron runner claims and executes jobs atomically, enabling fan-out (synthesis for all roles), retry on transient LLM failure, and a full audit trail of every agent invocation. This is the foundation for all multi-agent coordination work going forward.

**Company Memory + Slack Ingestion** (v0.23.0)
Company Memory now has product pages, not just extracted records. Slack now has the first safe inbound connector path: selected channel messages become governed evidence, while private or unapproved sources are skipped and audited.

**Billing Tiers + Stripe** (v0.20.0–v0.21.0)
Plan-gated token budgets, feature flags, self-serve Stripe checkout, subscription lifecycle webhooks, Billing Portal, and trial-to-free conversion. The commercial layer is fully wired.

**Executive Synthesis Layer** (v0.18.0–v0.18.2)
The dashboard starts with one evidence-backed leadership brief per role, with source traceability, manual refresh, and output history persistence.

### Next Build

1. **Demo navigation fixes:** verify and patch homepage CTAs such as Start a Pilot and View Workspace on Render.
2. **Connector Settings UX:** Slack channel allowlist, last ingest status, source sensitivity, and connector audit trail.
3. **Workflow Twin Scorer:** recommend the client's first workflow twin based on company profile, data readiness, risk, pain, and expected speed benefit.

### Later

Phase 7A/7B are COMPLETE (20-role registry, 5 archetypes, agent rooms, stage-aware roles all built). Phase 8 paid pilot packaging is largely COMPLETE (exports, demo reset, pilot kit, readiness assessment all built).

**Phase 9 -- Team Members** (Q4 2026): workspace invitations, role-based access, CxO lens assignment. Build when a pilot client requests it.

**Phase 10 -- Core Connectors** (Q4 2026 / Q1 2027): Google Drive, SharePoint, Slack, Teams, Gmail, Outlook, Jira, Salesforce, QuickBooks. Each with read-only ingestion, provenance, sensitivity policy, sync schedule. Slack has the first inbound channel-message ingestion path; admin UX and broader sync remain to build.

**Phase 12 -- Company Memory** (2027): richer graph traversal, diff views, and the Obsidian-for-companies concept. Entity extraction and first entity pages are already in place.

**Phase 13 -- Local Edge Client** (2027): on-premises document processing for regulated clients. Mac Studio appliance, local LLM option. Enterprise moat for financial services, healthcare, and government.

---

## Revenue and Market Thinking

**Target early customers:**
- Fintech companies (GCC, Pakistan, South Asia)
- Professional services firms (consulting, advisory)
- Growth-stage tech companies (Series A/B)

**Why these buyers:**
- High document volume with high decision stakes
- C-suite makes expensive calls on incomplete information
- They understand AI value but distrust generic chatbots
- They can afford a pilot fee and have a defined use case

**Positioning that works:**
"NexusAI gives your executive team an AI analyst who reads everything, remembers it all, and surfaces what matters — grounded in your actual documents, not guesswork."

**What kills the sale:**
- Looks like another BI tool — lead with AI onboarding and Ask, not charts
- No audit trail — addressed by confidence scores, evidence refs, approval workflow
- Fear of data exposure — addressed by sensitivity controls, confidential defaults, local path

**Pricing tiers (scoped):**
- Free: $0/month. 1 role, 50 evidence records, 500K tokens/mo. Self-serve lead gen.
- Pro: $499/month. 5 roles, 1,000 records, 5M tokens, weekly scheduled synthesis, exports.
- Business: $2,500/month. 10 roles, 5,000 records, 25M tokens, daily synthesis + email, 5 team members, 3 connectors.
- Enterprise: custom ($5K-$15K+). Unlimited everything, data residency, SLA, dedicated CSM.
- See `docs/BILLING_TIERS_SPEC.md` for full spec including token economics and Stripe integration plan.

---

## What This Product Is Not

- Not a BI tool. No pre-built charts for financials. The value is AI synthesis, not visualization.
- Not a chatbot. The Ask panel is powered by evidence retrieval. If there is no evidence, Nexus refuses to answer.
- Not an automation platform. Nexus reads, synthesizes, and recommends. Humans act.
- Not a replacement for analysts. It is leverage for the analysts and executives who already exist.
