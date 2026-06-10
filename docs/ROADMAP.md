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

## Where We Are -- Current State (v0.19.1, verified 2026-06-10)

The product is demo-ready and pilot-ready. 22 DB migrations, 23 test files / 110 tests passing.

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
- **Company Memory substrate:** Processed evidence now extracts people, organizations, risks, KPIs, amounts, dates, systems, and processes into `entities`, linked back to source evidence through `evidence_entity_links`.
- **Exports:** Weekly brief, risk radar CSV, reco register CSV, one-pager. Export hub.
- **Demo/Sales:** 3 CEO-grade demo sector packs, demo mode with reset, pilot kit, product brief page, readiness assessment (public), SOW templates, demo scripts, ROI calculator.
- **Auth:** Clerk SSO, scope-based API keys, workspace status (trial/pilot/active/suspended), LLM cost tracking.

**What is confirmed missing (2026-06-10 audit):**

- Orchestration/dispatcher (single-shot LLM calls only)
- Connectors (Slack skeleton only, no live data flow)
- Knowledge graph UI / entity pages (initial evidence-to-entity links exist; no graph traversal yet)

---

## Next Priorities

### Recently Shipped -- Highest Pilot Impact

**Executive Synthesis Layer** (v0.18.0)
The single highest-differentiation feature. The dashboard now starts with one evidence-backed leadership brief answering the questions that matter: what needs attention, what is at risk, what needs a decision, where execution is blocked, and what to do next. Every role gets a synthesis tuned to its mandate and archetype language. Specialist agent cards remain available as drill-down detail.

### Recently Shipped -- Regulated Buyer Confidence

**P2 AI Trust Layer** (v0.17.0)
Nexus now has a 30-case eval harness, red-team output checks, a prompt registry, and workspace-level AI policy controls for provider allow-lists, local-only blocking, sensitivity ceiling, and confidence threshold routing.

### Foundational -- Compound Memory and Orchestration

**Entity Pages and Backlinks**
Entity extraction now exists. The next Company Memory step is UI: entity pages with linked evidence, decisions, recommendations, owner/action references, and timeline views.

**Scheduled Synthesis Refresh** (scoped, next build)
Add daily/weekly synthesis refresh jobs with email delivery, workspace-configurable schedule and role selection, and a settings UI. This turns the v0.18.2 read layer into a recurring executive operating cadence. Full spec: `docs/SCHEDULED_SYNTHESIS_SPEC.md`. Target: v0.19.0 in 2 sessions.

**Billing Tiers and Usage Metering** (scoped, after scheduled synthesis)
Four-tier billing: Free ($0, 1 role, 500K tokens/mo), Pro ($499, 5 roles, 5M tokens), Business ($2,500, 10 roles, 25M tokens, team members), Enterprise (custom, unlimited). LLM token budget enforcement per workspace, feature gating (scheduled synthesis, exports, connectors gated by tier), Stripe checkout, and usage UI in Settings. Trial converts to Free at day 15 instead of suspension. Full spec: `docs/BILLING_TIERS_SPEC.md`. Target: v0.20.0 in 2-3 sessions.

### Later

Phase 7A/7B are COMPLETE (20-role registry, 5 archetypes, agent rooms, stage-aware roles all built). Phase 8 paid pilot packaging is largely COMPLETE (exports, demo reset, pilot kit, readiness assessment all built).

**Phase 9 -- Team Members** (Q4 2026): workspace invitations, role-based access, CxO lens assignment. Build when a pilot client requests it.

**Phase 10 -- Core Connectors** (Q4 2026 / Q1 2027): Google Drive, SharePoint, Slack, Teams, Gmail, Outlook, Jira, Salesforce, QuickBooks. Each with read-only ingestion, provenance, sensitivity policy, sync schedule. Slack OAuth/events skeleton already exists.

**Phase 12 -- Company Memory** (2027): entity pages with backlinks, diff views, the Obsidian-for-companies concept. Requires entity extraction pipeline first.

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
