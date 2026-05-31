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

## Where We Are — Current State (v0.9.1)

The core product loop is complete and demo-ready:

- **Onboarding:** 7-step AI-assisted wizard. Company detection, role selection, document starter pack, governance defaults, focus mapping.
- **Ingestion:** Multi-file upload with sector-aware classification, confidence routing (processed/pending/quarantined), pgvector embeddings, original file storage on R2.
- **Retrieval:** Two-tier search (vector + keyword fallback). Company context injected into every LLM call.
- **Dashboards:** CEO, COO, CBO, CTO role cards. LLM-generated cards grounded in evidence with company context prefix.
- **Ask:** Natural language Q&A with evidence refs, confidence scores, and freshness signals.
- **Recommendations:** Evidence-to-recommendation pipeline. Approval workflow with audit trail.
- **Auth:** Clerk SSO. API key management for agent access. Scope-based auth on every route.
- **Phase 7A readiness:** Role keys are now open-ended, custom/future dashboard routes compile and
  render with fallback agent briefs, and evidence records can store `connectorInstanceId` for
  future connector provenance.

**What is working but not polished:**
- Phase 7A role registry and archetype engine are not built yet; the runtime is prepared for them.
- Phase 8 paid-pilot exports and demo reset tools are still pending.
- Team-member invitations and role-based access are pending Phase 9.

---

## Next Priorities

### Phase 7A — Role System and Business Archetypes (Q3 2026, immediate next)

The four-role system (CEO, COO, CBO, CTO) was the right starting point. It is not the right destination. The roles a company needs depend on its archetype, stage, size, regulatory context, and what the people in those seats actually worry about.

**Five business archetypes** shape everything: corporate (formal C-suite, regulated or scaling toward enterprise), startup/scale-up (founder-led, functional over titular, stage is the dominant signal), sme_physical (owner-operated, physical presence, daily cash rhythm, staff and suppliers are the operating system), digital_native (internet-first, performance marketing, social-driven acquisition, PLG or D2C motion), professional_practice (partnership model, billing by time or retainer, client relationships are the asset).

The archetype changes the role labels, the agent brief language, the evidence types expected, and the KPIs surfaced. A street company owner and a fintech CFO both use the Finance dashboard — but the agent brief speaks completely differently to each.

**Full role set** of 20 roles across tiers: universal (CEO locked, CFO, COO), regulatory specialist (CRO, CCO), commercial and growth (CBO, Growth Officer, VP Performance Marketing, Brand/Community, CMO), technology and product (CTO, CPO), people (CHRO), sector-specific (Managing Partner, Chief Medical, VP Supply Chain, Project Director, VP Customer Success, Practice Lead), and future-stage (Chief of Staff, General Counsel — shown as Staged).

**Digital marketing and social as first-class evidence**: Meta Ads exports, Google Ads reports, TikTok Business Center, LinkedIn Campaign Manager, email CRM exports. The performance marketing agent detects ROAS decay, creative fatigue, and audience burn. This is not an optional connector for internet companies — it is their primary operating evidence.

**Stage-aware roles**: Active (live dashboard), Staged (anticipated for next stage, visible but not yet populated), Available (relevant but not activated). The system anticipates what roles a company will need next and has the dashboard ready.

### Phase 7B — Agent Rooms Visual Reframe (Q3 2026)

The positioning shift: from role dashboards to agent rooms. Instead of "CEO dashboard" — the Executive Command Room. Instead of "COO dashboard" — the Operating Room. Each room is staffed by named specialist agents with defined mandates, evidence scopes, and output types.

This is not a rebrand. It is the logical next step from where the product already is. The current dashboard cards are already agent outputs — they just aren't named that way. Naming them changes how clients understand the product and unlocks a richer configuration model.

Why this matters: clients who see "CEO dashboard" expect a BI tool. Clients who see "Executive Command Room staffed by AI analysts" immediately understand the value proposition.

### Phase 8 — Paid Pilot Packaging (Q3 2026)

Before charging premium pilot fees:
- Weekly executive brief export (PDF)
- Risk radar export
- Demo workspace reset for sales calls
- Pilot success scorecard with measurable outcomes
- Sponsor-facing onboarding checklist

The product is ready to demo now. One more polish pass to be ready to charge for at scale.

### Phase 9 — Team Members (Q4 2026)

- Workspace member invitations
- Role-based access: Owner, Admin, Executive, Reviewer, Contributor, Viewer
- CxO lens assignment per member
- Department and sensitivity access policies per member

Build this when a pilot client requests it — do not build speculatively.

### Phase 10 — Core Connectors (Q4 2026 / Q1 2027)

Priority order based on where enterprise evidence actually lives:
1. Google Drive / SharePoint / OneDrive
2. Slack / Microsoft Teams
3. Gmail / Outlook
4. Jira / Asana / Linear
5. Salesforce / HubSpot
6. QuickBooks / Xero / NetSuite
7. Workday / BambooHR

Each connector: read-only ingestion, provenance-preserving extraction, sensitivity policy, sync schedule, audit trail.

### Phase 12 — Company Memory (2027)

Every entity (risk, project, person, decision, KPI) gets a page with backlinks to evidence, decisions, recommendations, and owners. "What changed since last week?" becomes a diff view. This is the Obsidian-for-companies concept. It requires Phases 6–10 to be done well first.

### Phase 13 — Local Edge Client (2027)

For regulated clients who cannot send documents to the cloud: a local processor that extracts and embeds on-premises, syncing only approved summaries to Nexus cloud. Mac Studio appliance. Local LLM processing option. This is the enterprise moat for financial services, healthcare, and government clients.

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
