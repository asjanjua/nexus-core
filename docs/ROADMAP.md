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

## Where We Are -- Current State (v0.17.0, verified 2026-06-10)

The product is demo-ready and pilot-ready. 20 DB migrations, 20 test files / 88 tests passing.

**What is built and verified:**

- **Onboarding:** 7-step AI-assisted wizard with company detection, archetype selection, 20-role registry with deterministic relevance engine, governance defaults, focus mapping.
- **Ingestion:** Multi-file upload with sector-aware classification, digital/social/WhatsApp evidence types, confidence routing (processed/pending/quarantined), pgvector embeddings, R2 file storage.
- **Retrieval:** Two-tier search (pgvector + keyword fallback). Company context injected on every LLM call. Agent Control Profile passport filtering before evidence enters model context.
- **Dashboards:** 7 Agent Rooms with named specialist agents. 20 role dashboards with archetype-aware brief language. Agent briefs saved as versioned outputs with rollback.
- **Ask:** Natural language Q&A with evidence refs, confidence scores, passport filtering, output gates, escalation triggers, and persistent recent-turn conversation memory for follow-up questions.
- **Governance:** Agent Control Profiles (passports) with evidence scoping, sensitivity ceilings, tool guards, hard-stop blocking, output gates, suspend/resume. Per-agent output log with rollback. Learning signal capture (approve/edit/reject/thumbs) with quality summary.
- **AI Trust Layer:** Eval harness, prompt registry, red-team output checks, provider allow-list, local-only mode, sensitivity ceiling, and confidence threshold controls.
- **Decision Twin:** Full CRUD for decisions and actions with priority, deadline, blocker flags, status tracking, audit trail, plus AI proposal extraction from recent agent outputs. Interactive `/decisions` page.
- **Company Memory substrate:** Processed evidence now extracts people, organizations, risks, KPIs, amounts, dates, systems, and processes into `entities`, linked back to source evidence through `evidence_entity_links`.
- **Exports:** Weekly brief, risk radar CSV, reco register CSV, one-pager. Export hub.
- **Demo/Sales:** 3 CEO-grade demo sector packs, demo mode with reset, pilot kit, product brief page, readiness assessment (public), SOW templates, demo scripts, ROI calculator.
- **Auth:** Clerk SSO, scope-based API keys, workspace status (trial/pilot/active/suspended), LLM cost tracking.

**What is confirmed missing (2026-06-10 audit):**

- Orchestration/dispatcher (single-shot LLM calls only)
- Connectors (Slack skeleton only, no live data flow)
- Workflow twin primitives (no tables/APIs)
- Knowledge graph UI / entity pages (initial evidence-to-entity links exist; no graph traversal yet)

---

## Next Priorities

### Immediate -- Highest Pilot Impact

**Executive Synthesis Layer** (2 sessions) -- APPROVED FOR BUILD
The single highest-differentiation feature. A thin dispatcher collects specialist agent outputs per role, then a synthesis service produces one evidence-backed leadership brief answering the questions that matter: what changed, what is at risk, what needs a decision, where are we blocked, what to do next. Every role gets a synthesis tuned to their mandate and archetype language. The CEO dashboard becomes the Executive Command Brief with specialist cards as drill-down. No new tables, no external framework. See EXECUTIVE_SYNTHESIS_SPEC.md for full design.

### Recently Shipped -- Regulated Buyer Confidence

**P2 AI Trust Layer** (v0.17.0)
Nexus now has a 30-case eval harness, red-team output checks, a prompt registry, and workspace-level AI policy controls for provider allow-lists, local-only blocking, sensitivity ceiling, and confidence threshold routing.

### Foundational -- Compound Memory and Orchestration

**Entity Pages and Backlinks**
Entity extraction now exists. The next Company Memory step is UI: entity pages with linked evidence, decisions, recommendations, owner/action references, and timeline views.

**Scheduled Synthesis**
Once the synthesis layer exists, a scheduled task can trigger synthesis refresh on a cadence (daily, weekly). The CEO receives a fresh "company picture" every Monday morning without logging in.

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

**Pilot pricing direction:**
- Pilot: $3,000–$8,000/month per workspace, 90-day commitment
- Scale: seat-based + connector add-ons after pilot
- Enterprise: custom for local edge client and private cloud

---

## What This Product Is Not

- Not a BI tool. No pre-built charts for financials. The value is AI synthesis, not visualization.
- Not a chatbot. The Ask panel is powered by evidence retrieval. If there is no evidence, Nexus refuses to answer.
- Not an automation platform. Nexus reads, synthesizes, and recommends. Humans act.
- Not a replacement for analysts. It is leverage for the analysts and executives who already exist.
